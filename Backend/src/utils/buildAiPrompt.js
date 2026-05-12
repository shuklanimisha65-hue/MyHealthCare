import { Consultation } from "../models/consultation.model.js";
import { User } from "../models/user.model.js";

export const buildInitialPrompt = ({ symptoms, description, vitals, severity, imageAnalysis }) => {
    
    let prompt = `You are a compassionate medical AI assistant helping a patient.\n\n`;
    
    prompt += `PATIENT SYMPTOMS:\n`;
    symptoms.forEach((symptom, index) => {
        prompt += `${index + 1}. ${symptom}\n`;
    });
    prompt += `\n`;
    
    if (description && description.trim() !== '') {
        prompt += `PATIENT DESCRIPTION:\n${description}\n\n`;
    }
    
    if (severity) {
        prompt += `ASSESSED SEVERITY: ${severity.toUpperCase()}\n\n`;
    }
    
    if (vitals && Object.keys(vitals).length > 0) {
        prompt += `CURRENT VITAL SIGNS:\n`;
        
        if (vitals.bloodPressure?.systolic && vitals.bloodPressure?.diastolic) {
            prompt += `• Blood Pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg\n`;
        }
        
        if (vitals.temperature) {
            prompt += `• Body Temperature: ${vitals.temperature}°C\n`;
        }
        
        if (vitals.oxygenLevel) {
            prompt += `• Oxygen Saturation: ${vitals.oxygenLevel}%\n`;
        }
        
        if (vitals.steps) {
            prompt += `• Daily Steps: ${vitals.steps}\n`;
        }
        
        if (vitals.waterIntake) {
            prompt += `• Water Intake: ${vitals.waterIntake}ml\n`;
        }
        
        prompt += `\n`;
    }
    
    if (imageAnalysis) {
        prompt += `IMAGE ANALYSIS:\n${imageAnalysis}\n\n`;
    }
    
    if (severity === 'emergency') {
        prompt += `⚠️ CRITICAL ALERT: This has been flagged as a potential MEDICAL EMERGENCY.\n\n`;
        prompt += `YOUR RESPONSE MUST:\n`;
        prompt += `1. IMMEDIATELY advise the patient to seek emergency medical care\n`;
        prompt += `2. Tell them to call emergency services (911) or go to the nearest ER\n`;
        prompt += `3. Explain clearly why this could be serious\n`;
        prompt += `4. Provide guidance on what to do while waiting for help\n`;
        prompt += `5. Do NOT suggest waiting, monitoring, or home remedies as alternatives\n\n`;
        
    } else if (severity === 'high') {
        prompt += `⚠️ URGENT NOTICE: This has been flagged as potentially serious.\n\n`;
        prompt += `YOUR RESPONSE SHOULD:\n`;
        prompt += `1. Ask critical follow-up questions to assess the situation\n`;
        prompt += `2. Determine if immediate medical attention is needed\n`;
        prompt += `3. Provide clear guidance on next steps\n`;
        prompt += `4. Strongly recommend seeing a healthcare provider soon\n`;
        prompt += `5. Err on the side of caution\n\n`;
        
    } else {
        prompt += `INSTRUCTIONS FOR YOUR RESPONSE:\n`;
        prompt += `1. Ask 3-5 relevant follow-up questions to better understand the condition\n`;
        prompt += `2. Provide preliminary guidance based on the symptoms and vitals\n`;
        prompt += `3. Recommend appropriate next steps (rest, over-the-counter remedies, or medical consultation)\n`;
        prompt += `4. Be empathetic, reassuring, and supportive\n\n`;
    }
    
    prompt += `IMPORTANT SAFETY GUIDELINES:\n`;
    prompt += `- Be professional yet compassionate in your tone\n`;
    prompt += `- Use clear, simple language that anyone can understand\n`;
    prompt += `- Never provide a definitive diagnosis (only doctors can diagnose)\n`;
    prompt += `- Always recommend professional medical evaluation when appropriate\n`;
    prompt += `- If in doubt about severity, err on the side of caution\n`;
    prompt += `- Avoid excessive medical jargon\n\n`;
    
    prompt += `Please respond to the patient now.`;
    
    return prompt;
};

export const buildFollowUpPrompt = (consultation, newMessage) => {
    
    let prompt = `CONVERSATION HISTORY:\n\n`;
    
    consultation.chatHistory.forEach((msg, index) => {
        const role = msg.role === 'ai' ? 'AI Assistant' : 'Patient';
        prompt += `[${role}]: ${msg.message}\n\n`;
    });
    
    prompt += `[Patient]: ${newMessage}\n\n`;
    
    prompt += `---\n\n`;
    prompt += `CONTEXT REMINDER:\n`;
    prompt += `Original Symptoms: ${consultation.symptoms.join(', ')}\n`;
    
    if (consultation.symptomsDescription) {
        prompt += `Original Description: ${consultation.symptomsDescription}\n`;
    }
    
    if (consultation.severity) {
        prompt += `Severity Level: ${consultation.severity}\n`;
    }
    
    if (consultation.aiDiagnosis) {
        prompt += `Preliminary Assessment: ${consultation.aiDiagnosis}\n`;
    }
    
    prompt += `\n`;
    
    prompt += `INSTRUCTIONS:\n`;
    prompt += `Continue the medical consultation by responding to the patient's latest message. `;
    prompt += `Ask additional follow-up questions if needed to gather more information, `;
    prompt += `or provide helpful guidance based on their responses. `;
    prompt += `Maintain a compassionate and professional tone. `;
    prompt += `Never provide definitive diagnoses.\n\n`;
    
    prompt += `Please respond to the patient now.`;
    
    return prompt;
};

export const buildSummaryPrompt = (consultation) => {
    
    let prompt = `Please analyze this complete medical consultation and provide a structured summary.\n\n`;
    
    prompt += `ORIGINAL COMPLAINT:\n`;
    prompt += `Symptoms: ${consultation.symptoms.join(', ')}\n`;
    
    if (consultation.symptomsDescription) {
        prompt += `Description: ${consultation.symptomsDescription}\n`;
    }
    
    prompt += `\n`;
    
    prompt += `COMPLETE CONVERSATION:\n\n`;
    consultation.chatHistory.forEach((msg, index) => {
        const role = msg.role === 'ai' ? 'AI Assistant' : 'Patient';
        prompt += `[${role}]: ${msg.message}\n\n`;
    });
    
    if (consultation.vitalsSnapshot && Object.keys(consultation.vitalsSnapshot).length > 0) {
        prompt += `VITAL SIGNS:\n`;
        const vitals = consultation.vitalsSnapshot;
        
        if (vitals.bloodPressure?.systolic) {
            prompt += `Blood Pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg\n`;
        }
        if (vitals.temperature) prompt += `Temperature: ${vitals.temperature}°C\n`;
        if (vitals.oxygenLevel) prompt += `Oxygen Level: ${vitals.oxygenLevel}%\n`;
        
        prompt += `\n`;
    }
    
    prompt += `Based on this complete consultation, please provide:\n\n`;
    
    prompt += `1. SUMMARY: A brief 2-3 sentence overview of the patient's condition and what was discussed\n\n`;
    
    prompt += `2. KEY RECOMMENDATIONS: The main recommendations or advice given to the patient (as bullet points)\n\n`;
    
    prompt += `3. CONFIDENCE SCORE: Your confidence in the assessment on a scale of 0-100, where:\n`;
    prompt += `   - 0-30: Very uncertain, limited information\n`;
    prompt += `   - 31-60: Moderate confidence, some information gaps\n`;
    prompt += `   - 61-85: Good confidence, sufficient information\n`;
    prompt += `   - 86-100: High confidence, comprehensive information\n\n`;
    
    prompt += `Please format your response EXACTLY as JSON with this structure:\n`;
    prompt += `{\n`;
    prompt += `  "summary": "Your 2-3 sentence summary here",\n`;
    prompt += `  "recommendations": [\n`;
    prompt += `    "First recommendation",\n`;
    prompt += `    "Second recommendation",\n`;
    prompt += `    "Third recommendation"\n`;
    prompt += `  ],\n`;
    prompt += `  "confidenceScore": 75\n`;
    prompt += `}\n\n`;
    
    prompt += `Respond with ONLY the JSON object, no additional text.`;
    
    return prompt;
};

export const buildSimplePrompt = (question) => {
    return `You are a medical AI assistant. A user asks: "${question}"\n\n` +
           `Provide a helpful, accurate response. Keep it concise (under 200 words). ` +
           `Never diagnose. If the question suggests a serious condition, advise seeking medical care.`;
};

export const buildMedicationCheckPrompt = (currentMedications, symptoms) => {
    
    let prompt = `MEDICATION INTERACTION CHECK\n\n`;
    
    prompt += `Current Medications:\n`;
    currentMedications.forEach((med, index) => {
        prompt += `${index + 1}. ${med}\n`;
    });
    
    prompt += `\nNew Symptoms:\n`;
    symptoms.forEach((symptom, index) => {
        prompt += `${index + 1}. ${symptom}\n`;
    });
    
    prompt += `\n`;
    prompt += `Please analyze if these symptoms could be related to:\n`;
    prompt += `1. Side effects of the current medications\n`;
    prompt += `2. Interactions between the medications\n`;
    prompt += `3. Contraindications\n\n`;
    
    prompt += `Provide a brief assessment and recommend whether to consult a doctor or pharmacist.`;
    
    return prompt;
};

export const buildTriagePrompt = (symptoms, vitals) => {
    
    let prompt = `EMERGENCY TRIAGE ASSESSMENT\n\n`;
    
    prompt += `Symptoms: ${symptoms.join(', ')}\n`;
    
    if (vitals) {
        prompt += `Vitals:\n`;
        if (vitals.temperature) prompt += `- Temperature: ${vitals.temperature}°C\n`;
        if (vitals.bloodPressure) {
            prompt += `- Blood Pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg\n`;
        }
        if (vitals.oxygenLevel) prompt += `- Oxygen: ${vitals.oxygenLevel}%\n`;
    }
    
    prompt += `\n`;
    prompt += `Classify the urgency level as one of:\n`;
    prompt += `- "emergency": Life-threatening, needs immediate ER care\n`;
    prompt += `- "urgent": Serious, needs doctor within 24 hours\n`;
    prompt += `- "routine": Can wait for regular appointment\n`;
    prompt += `- "monitor": Watch symptoms, seek care if worsens\n\n`;
    
    prompt += `Respond with JSON:\n`;
    prompt += `{\n`;
    prompt += `  "urgency": "emergency|urgent|routine|monitor",\n`;
    prompt += `  "reason": "Brief explanation why"\n`;
    prompt += `}\n\n`;
    
    prompt += `Respond with ONLY the JSON object.`;
    
    return prompt;
};

export const buildConversationHistory = (consultation, includeSystemContext = true) => {
    const messages = [];
    
    if (includeSystemContext && consultation.chatHistory.length > 0) {
        const context = `Original symptoms: ${consultation.symptoms.join(', ')}
${consultation.symptomsDescription ? `Description: ${consultation.symptomsDescription}` : ''}
Severity: ${consultation.severity || 'unknown'}`;
        
        messages.push({
            role: 'user',
            content: context
        });
        
        messages.push({
            role: 'assistant',
            content: 'I understand. I will keep this context in mind throughout our conversation.'
        });
    }
    
    consultation.chatHistory.forEach(msg => {
        messages.push({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.message
        });
    });
    
    return messages;
};

export const extractSymptomKeywords = (symptoms) => {
    const keywords = [];
    
    symptoms.forEach(symptom => {
        const words = symptom.toLowerCase().split(' ');
        words.forEach(word => {
            if (word.length > 3 && !keywords.includes(word)) {
                keywords.push(word);
            }
        });
    });
    
    return keywords;
};

export const formatVitals = (vitals) => {
    if (!vitals || Object.keys(vitals).length === 0) {
        return 'No vitals recorded';
    }
    
    const parts = [];
    
    if (vitals.bloodPressure?.systolic) {
        parts.push(`BP: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`);
    }
    
    if (vitals.temperature) {
        parts.push(`Temp: ${vitals.temperature}°C`);
    }
    
    if (vitals.oxygenLevel) {
        parts.push(`O2: ${vitals.oxygenLevel}%`);
    }
    
    return parts.join(', ');

    
};