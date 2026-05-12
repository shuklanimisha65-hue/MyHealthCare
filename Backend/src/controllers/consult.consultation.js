import { Consultation } from "../models/consultation.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from '../utils/asyncHandler.js';
import {
    getGroqResponseWithRetry,
    buildConversationHistory,
    validateMedicalResponse,
    buildSystemContext
} from "../services/aiService.js";

export const createConsultation = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const { symptoms, symptomsDescription } = req.body;

    if (!symptoms || symptoms.trim() === "") {
        throw new ApiError(400, "Details of patient is required");
    }

    let symptomsImagesUrls = [];

    if (req.file) {
        try {
            const imageUrl = await uploadOnCloudinary(req.file.path, 'symptoms');
            symptomsImagesUrls.push(imageUrl);
            console.log("File upload completed", imageUrl);
        } catch (error) {
            console.log("File can't be uploaded", error.message);
        }
    }

    const consultation = await Consultation.create({
        patient: req.user._id,
        symptoms: symptoms.split(",").map(s => s.trim()),
        symptomsDescription: symptomsDescription || "",
        symptomsImages: symptomsImagesUrls,
        status: "pending",
        source: "direct"
    });

    console.log("Consultation created", consultation.patient);
    console.log("Severity", consultation.severity);
    console.log("Urgency", consultation.urgency);

    const systemContext = buildSystemContext();

    const userMessage = `Patient symptoms: ${consultation.symptoms.join(", ")}
    Description: ${consultation.symptomsDescription || "None provided"}
    Severity: ${consultation.severity}

    Please assess these symptoms and ask relevant follow-up questions.`;

    try {
        const aiResponse = await getGroqResponseWithRetry([
            { role: "system", content: systemContext },
            { role: "user", content: userMessage }
        ]);

        const validation = validateMedicalResponse(aiResponse);
        console.log("AI response received, safe:", validation.isSafe);

        await consultation.addMessage('ai', aiResponse, []);
        console.log('AI response added to chat history');

        res.status(201).json(
            new ApiResponse(
                201,
                {
                    consultation: {
                        _id: consultation._id,
                        symptoms: consultation.symptoms,
                        symptomsDescription: consultation.symptomsDescription,
                        chatHistory: consultation.chatHistory,
                        severity: consultation.severity,
                        urgency: consultation.urgency,
                        status: consultation.status,
                        createdAt: consultation.createdAt
                    }
                },
                'Consultation created successfully'
            )
        );
    } catch (error) {
        console.log("AI service failed", error.message);
        consultation.status = 'archived';
        await consultation.save();
        throw new ApiError(503, 'AI service temporarily unavailable. Please try again.');
    }
});

export const completeConsultation = asyncHandler(async (req, res) => {
    const { consultationId } = req.params;

    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
        throw new ApiError(404, "Consultation not found");
    }

    if (consultation.patient.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    if (consultation.status === "completed") {
        throw new ApiError(400, "Consultation already completed");
    }

    if (consultation.status === "pending") {
        throw new ApiError(400, "Consultation has no chat history yet");
    }

    const summaryForAI = consultation.getSummaryForAI();

    const prompt = `Based on this consultation, provide a final summary:

    Symptoms: ${summaryForAI.symptoms.join(", ")}
    Description: ${summaryForAI.description || "None"}

    Chat History:
    ${summaryForAI.chatHistory.map(m => `${m.role}: ${m.message}`).join("\n")}

    Respond in this JSON format:
    {
        "diagnosis": "your assessment here",
        "recommendations": "what the patient should do",
        "confidenceScore": 0-100
    }

    Remember: You are not a doctor. Frame as preliminary assessment, not definitive diagnosis.`;

    const aiResponse = await getGroqResponseWithRetry([
        { role: "user", content: prompt }
    ]);

    let diagnosis, recommendations, confidenceScore;

    try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            diagnosis = parsed.diagnosis;
            recommendations = parsed.recommendations;
            confidenceScore = parsed.confidenceScore;
        }
    } catch (parseError) {
        diagnosis = aiResponse;
        recommendations = "Please consult a healthcare professional.";
        confidenceScore = 50;
    }

    await consultation.complete(diagnosis, recommendations, confidenceScore);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                consultation: {
                    _id: consultation._id,
                    symptoms: consultation.symptoms,
                    aiDiagnosis: consultation.aiDiagnosis,
                    aiRecommendation: consultation.aiRecommendation,
                    aiConfidenceScore: consultation.aiConfidenceScore,
                    status: consultation.status,
                    duration: consultation.duration,
                    chatHistory: consultation.chatHistory
                }
            },
            "Consultation completed successfully"
        )
    );
});

export const addPrescription = asyncHandler(async (req, res) => {
    const { consultationId } = req.params;
    const { medications, notes } = req.body;

    if (!medications || medications.length === 0) {
        throw new ApiError(400, "At least one medication is required");
    }

    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
        throw new ApiError(404, "Consultation not found");
    }

    if (consultation.patient.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    if (consultation.status !== "completed") {
        throw new ApiError(400, "Consultation must be completed before adding prescription");
    }

    await consultation.prescription(medications, notes);

    res.status(200).json(
        new ApiResponse(200, {
            prescription: consultation.prescription
        }, "Prescription added")
    );
});

export const setFollowUp = asyncHandler(async (req, res) => {
    const { consultationId } = req.params;
    const { followUpDate, reason } = req.body;

    if (!followUpDate || !reason) {
        throw new ApiError(400, "Follow-up date and reason are required");
    }

    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
        throw new ApiError(404, "Consultation not found");
    }

    if (consultation.patient.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    if (new Date(followUpDate) <= new Date()) {
        throw new ApiError(400, "Follow-up date must be in the future");
    }

    await consultation.setFollowUp(new Date(followUpDate), reason);

    res.status(200).json(
        new ApiResponse(200, {
            followUpRequired: consultation.followUpRequired,
            followUpDate: consultation.followUpDate,
            followUpReason: consultation.followUpReason
        }, "Follow-up scheduled successfully")
    );
});

export const archiveConsultation = asyncHandler(async (req, res) => {
    const { consultationId } = req.params;

    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
        throw new ApiError(404, "Consultation not found");
    }

    if (consultation.patient.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    if (consultation.status === "archived") {
        throw new ApiError(400, "Consultation is already archived");
    }

    await consultation.archive();

    res.status(200).json(
        new ApiResponse(200, {
            _id: consultation._id,
            status: consultation.status
        }, "Consultation archived successfully")
    );
});

export const sendMessage = asyncHandler(async (req, res) => {
        const { consultationId } = req.params;
        const { message } = req.body;

        if (!message || message.trim() === "") {
            throw new ApiError(400, "Message is required");
        }

        const consultation = await Consultation.findById(consultationId);

        if (!consultation) {
            throw new ApiError(404, "Consultation not found");
        }

        if (consultation.patient.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Not authorized");
        }

        if (consultation.status === "completed" || consultation.status === "archived") {
            throw new ApiError(400, "Cannot send messages to a closed consultation");
        }

        await consultation.addMessage('user', message, []);

        const systemContext = buildSystemContext();
        const conversationHistory = buildConversationHistory(consultation);

        const aiResponse = await getGroqResponseWithRetry([
            { role: "system", content: systemContext },
            ...conversationHistory
        ]);

        const validation = validateMedicalResponse(aiResponse);
        await consultation.addMessage('ai', aiResponse, []);

        console.log("AI follow-up response, safe:", validation.isSafe);

        res.status(200).json(
            new ApiResponse(200, {
                message: aiResponse,
                isEmergency: validation.isEmergency
            }, "Message sent successfully")
        );
});

export const getActiveConsultations = asyncHandler(async (req, res) => {
    const consultations = await Consultation.findActiveByUser(req.user._id);

    res.status(200).json(
        new ApiResponse(200, {
            consultations,
            count: consultations.length
        }, "Active consultations fetched successfully")
    );
});

export const getRecentConsultations = asyncHandler(async (req, res) => {
    const consultations = await Consultation.findRecent(req.user._id);

    res.status(200).json(
        new ApiResponse(200, {
            consultations,
            count: consultations.length
        }, "Recent consultations fetched successfully")
    );
});

export const getFollowUpsDue = asyncHandler(async (req, res) => {
    const followUps = await Consultation.findFollowUpsDue();

    const userFollowUps = followUps.filter(
        f => f.patient._id.toString() === req.user._id.toString()
    );

    res.status(200).json(
        new ApiResponse(200, {
            followUps: userFollowUps,
            count: userFollowUps.length
        }, "Due follow-ups fetched successfully")
    );
});

export const getUserStats = asyncHandler(async (req, res) => {
    const stats = await Consultation.getUserStats(req.user._id);

    res.status(200).json(
        new ApiResponse(200, {
            stats
        }, "User stats fetched successfully")
    );
});

export const getConsultationById = asyncHandler(async (req, res) => {
    const { consultationId } = req.params;

    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
        throw new ApiError(404, "Consultation not found");
    }

    if (consultation.patient.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    res.status(200).json(
        new ApiResponse(200, { consultation }, "Consultation fetched successfully")
    );
});

export const rateConsultation = asyncHandler(async (req, res) => {
    const { consultationId } = req.params;
    const { rating, feedback, wasHelpful } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        throw new ApiError(400, "Rating must be between 1 and 5");
    }

    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
        throw new ApiError(404, "Consultation not found");
    }

    if (consultation.patient.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    if (consultation.status !== "completed") {
        throw new ApiError(400, "Can only rate completed consultations");
    }

    consultation.rating = rating;
    consultation.feedback = feedback || "";
    consultation.wasHelpful = wasHelpful;
    await consultation.save();

    res.status(200).json(
        new ApiResponse(200, {
            rating: consultation.rating,
            feedback: consultation.feedback,
            wasHelpful: consultation.wasHelpful
        }, "Consultation rated successfully")
    );
});