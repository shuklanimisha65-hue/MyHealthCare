import mongoose, { Schema, SchemaTypes } from "mongoose";
import { User } from "./user.model.js";

const consultationSchema=new Schema({
    patient:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:[true,"Patient's reference is required"],
    },

    symptoms:[{
        type:String,
        trim:true,

    }],

    symptomsDescription:{
        type:String,
        trim:true,
    },

    symptomsImages:[{
        type:String
    }],

    chatHistory:[{
        role:{
            type:String,
            enum:['user','ai'],
            required:true,
        },
        message:{
            type:String,
            required:true,
        },
        timestamp:{
            type:Date,
            default:Date.now
        },
        images:[{
            type:String
        }]
    }],

    aiDiagnosis:{
        type:String
    },

    aiRecommendation:{
        type:String
    },

    aiConfidenceScore:{
        type:Number,
        min:0,
        max:100
    },

    prescription:{
        medication:[{
            name:String,
            dosage:String,
            frequency:String,
            duration:String,
            instructions:String
        }],
        notes:String,
        prescriptionImage:String
    },

    followUpRequired:{
        type:Boolean,
        default:false
    },

    followUpDate:{
        type:Date
    },

    followUpReason:{
        type:String
    },

    severity:{
        type:String,
        enum:['low','medium','high','emergency'],
        default:'low'
    },

    urgency:{
        type:String,
        enum:['routine','urgent','emergency'],
        default:'routine'
    },

    status:{
        type:String,
        enum:['pending','in-progress','completed','archived'],
        default:'pending',
    },

    source:{
        type:String,
        enum:['direct','check-in','alert','follow-up'],
        default:'direct'
        
    },

    duration:{
        type:Number,
        default:0
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },

    feedback: {
        type: String
    },

    wasHelpful: {
        type: Boolean
    },

    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }]

},{timestamps:true})

consultationSchema.index({ patient: 1, createdAt: -1 });  
consultationSchema.index({ status: 1 });
consultationSchema.index({ severity: 1 });
consultationSchema.index({ tags: 1 });

consultationSchema.virtual('messageCount').get(function(){
    return this.chatHistory.length
});

consultationSchema.virtual('isRecent').get(function() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.createdAt > oneDayAgo;
});

consultationSchema.methods.addMessage = async function(role, message, images = []) {
    this.chatHistory.push({
        role,
        message,
        images,
        timestamp: new Date()
    });
    

    if (this.status === 'pending') {
        this.status = 'in-progress';
    }
    
    return await this.save();
};


consultationSchema.methods.complete = async function(diagnosis, recommendations, confidenceScore) {
    this.aiDiagnosis = diagnosis;
    this.aiRecommendations = recommendations;
    this.aiConfidenceScore = confidenceScore;
    this.status = 'completed';
    
    
    if (this.createdAt) {
        this.duration = Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
    }
    
    return await this.save();
};

consultationSchema.methods.addPrescription = async function(medications, notes = '') {
    this.prescription = {
        medications,
        notes
    };
    return await this.save();
};

consultationSchema.methods.setFollowUp = async function(date, reason) {
    this.followUpRequired = true;
    this.followUpDate = date;
    this.followUpReason = reason;
    return await this.save();
};

consultationSchema.methods.archive = async function() {
    this.status = 'archived';
    return await this.save();
};

consultationSchema.methods.getSummaryForAI = function() {
    return {
        symptoms: this.symptoms,
        description: this.symptomsDescription,
        chatHistory: this.chatHistory.map(msg => ({
            role: msg.role,
            message: msg.message
        })),
        previousDiagnosis: this.aiDiagnosis,
        duration: this.messageCount
    };
};

consultationSchema.statics.findActiveByUser = function(userId) {
    return this.find({
        patient: userId,
        status: { $in: ['pending', 'in-progress'] }
    }).sort({ createdAt: -1 });
};

consultationSchema.statics.findRecent = function(userId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.find({
        patient: userId,
        createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 });
};

consultationSchema.statics.findFollowUpsDue = function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.find({
        followUpRequired: true,
        followUpDate: { $lte: today },
        status: { $ne: 'archived' }
    }).populate('patient', 'username email phone');
};

consultationSchema.statics.getUserStats = async function(userId) {
    const consultations = await this.find({ patient: userId });
    
    return {
        total: consultations.length,
        completed: consultations.filter(c => c.status === 'completed').length,
        pending: consultations.filter(c => c.status === 'pending').length,
        averageRating: consultations
            .filter(c => c.rating)
            .reduce((sum, c) => sum + c.rating, 0) / consultations.filter(c => c.rating).length || 0,
        commonSymptoms: this.getCommonSymptoms(consultations),
        averageDuration: consultations
            .filter(c => c.duration)
            .reduce((sum, c) => sum + c.duration, 0) / consultations.filter(c => c.duration).length || 0
    };
};

consultationSchema.statics.getCommonSymptoms = function(consultations) {
    const symptomCounts = {};
    
    consultations.forEach(consultation => {
        consultation.symptoms.forEach(symptom => {
            symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        });
    });
    
    return Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([symptom, count]) => ({ symptom, count }));
};

consultationSchema.pre('save', async function() {
    if (this.isNew || this.isModified('symptoms')) {

        const emergencyKeywords = ['chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding', 'stroke', 'heart attack'];
        const urgentKeywords = ['high fever', 'severe pain', 'vomiting', 'bleeding', 'infection'];

        const symptomsText = this.symptoms.join(' ').toLowerCase();

        if (emergencyKeywords.some(keyword => symptomsText.includes(keyword))) {
            this.severity = 'emergency';
            this.urgency = 'emergency';
        } else if (urgentKeywords.some(keyword => symptomsText.includes(keyword))) {
            this.severity = 'high';
            this.urgency = 'urgent';
        } else {
            this.severity = 'low';
            this.urgency = 'routine';
        }
    }
});



export const Consultation=mongoose.model("Consultation",consultationSchema);