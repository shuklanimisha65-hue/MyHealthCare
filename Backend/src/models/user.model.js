import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';  
const userSchema = new Schema({

    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        trim: true,
        lowercase: true,
    },

    fullName: {
        type: String,
        required: true, 
    },

    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/gi, "Email address must be a valid one!"],
    },

    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be 8 characters long"],
        select: false,
    },

    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
        default: 'unknown'
    },

    avatar: {
        type: String,
        default: null,
    },

    dateOfBirth: {
        type: Date,
        required: [true, "DOB is required"],
    },

    age: {
        type: Number,
    },

    gender: {
        type: String,
        enum: ["male", "female", "other"],  
        required: [true, "Gender is required"]
    },

    numberOfStepsEachDay: {
        type: Number,
        default: 10000,  
        min: [0, "Steps cannot be negative"],
    },

    numberofGlassesOfWaterEachDay: {
        type: Number,
        default: 8,  
        min: [0, "Water intake cannot be negative"],
        max: [50, "Water intake seems unreal"],
    },

    todaySteps: {
        type: Number,
        default: 0,
        min: [0, "Steps cannot be negative"]
    },

    todayWaterIntake: {
        type: Number,
        default: 0,
        min: [0, "Water intake cannot be negative"]
    },

    currentProblems: [{
        problem: {  
            type: String,
            required: true,
        },
        severity: {
            type: String,
            enum: ["mild", "moderate", "severe"],
            default: "mild",
        },
        startDate: {
            type: Date,
            default: Date.now,
        }
    }],

    pastMedRecord: [{
        condition: {
            type: String,
            required: true,
        },
        diagnosedDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['active', "resolved", "chronic"],
            default: "resolved"
        },
        notes: {
            type: String,
        }
    }],

    currentMedications: [{
        medicationName: {
            type: String,
            required: true,
        },
        dosage: {
            type: String,
            required: true,
        },
        frequency: {
            type: String,
            required: true,
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        prescribedBy: {
            type: String,
        },
        reason: {
            type: String,
        }
    }],

    allergies: [{
        allergen: {
            type: String,
            required: true
        },
        reaction: {
            type: String
        },
        severity: {
            type: String,
            enum: ['mild', 'moderate', 'severe', 'life-threatening'],
            default: 'mild'
        }
    }],

    role: {
        type: String,
        enum: ['patient', 'doctor', 'admin'],
        default: 'patient'
    },

    notificationPreferences: {
        dailyCheckIn: {
            enabled: {
                type: Boolean,
                default: true
            },
            time: {
                type: String,
                default: "09:00"
            }
        },
        vitalAlerts: {
            enabled: {
                type: Boolean,
                default: true
            }
        },
        medicationReminders: {
            enabled: {
                type: Boolean,
                default: true
            }
        },
        trendAlerts: {
            enabled: {
                type: Boolean,
                default: true
            }
        },
        waterReminders: {
            enabled: {
                type: Boolean,
                default: true
            }
        }
    },

    lastCheckIn: {
        date: {
            type: Date
        },
        mood: {
            type: String,
            enum: ['great', 'good', 'okay', 'unwell', 'sick']
        },
        notes: {
            type: String
        }
    },

    phone: {
        type: String,
        trim: true,
    },

    refreshToken: {
        type: String,
        select: false,
    },

    isActive: {
        type: Boolean,
        default: true
    },

}, { timestamps: true });


userSchema.index({ email: 1 });
userSchema.index({ username: 1 });


userSchema.pre('save', function() {
    if (this.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        this.age = age;
    }
});

// Hash password
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
}


userSchema.methods.getPublicProfile = function() {
    const user = this.toObject();
    delete user.password;
    return user;
}


userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY 
        }
    )
}


userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY  
        }
    )
}

userSchema.methods.checkDailyGoals = function() {
    return {
        stepsGoalMet: this.todaySteps >= this.numberOfStepsEachDay,
        waterGoalMet: this.todayWaterIntake >= this.numberofGlassesOfWaterEachDay,
        stepsProgress: Math.round((this.todaySteps / this.numberOfStepsEachDay) * 100),
        waterProgress: Math.round((this.todayWaterIntake / this.numberofGlassesOfWaterEachDay) * 100)
    };
}

userSchema.methods.getHealthSummary = function() {
    return {
        age: this.age,
        gender: this.gender,
        bloodGroup: this.bloodGroup,
        currentProblems: this.currentProblems.length,
        activeMedications: this.currentMedications.length,
        knownAllergies: this.allergies.length,
        chronicConditions: this.pastMedRecord.filter(h => h.status === 'chronic').length  
    };
};

export const User = mongoose.model("User", userSchema);