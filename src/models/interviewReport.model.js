const mongoose = require("mongoose");


/**
 * - job description schema : String
 * - resume text : String
 * - Self description : String
 * 
 * - matchScore = Number
 * 
 * - Technical questions :
 *          [{
 *              question : "",
 *              intention : "",
 *              answer : "",
 *          }]
 * - Beahvioral questions : 
 *          [{
 *              question : "",
 *              intention : "",
 *              answer : "",
 *          }]
 * - Skill gaps : [{
 *          skill : "",
 *          severity : {
 *              type : String,
 *              enum : ["low", "medium", "high"]
 *          }
 *   }]
 * - preparation plan : [{
 *          day : Number,
 *          focus : String,
 *          tasks : [String]
 *   }]
 * 
 */

const technicalQuestionsSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [ true, "Technical question is required" ]
    },
    intention: {
        type: String,
        required: [ true, "Intention is required" ]
    },
    answer: {
        type: String,
        required: [ true, "Answer is required" ]
    }
}, {
    _id: false
});

const behavioralQuestionsSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [ true, "Behavioral question is required" ]
    },
    intention: {
        type: String,
        required: [ true, "Intention is required" ]
    },
    answer: {
        type: String,
        required: [ true, "Answer is required" ]
    }
}, {
    _id: false
});

const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [ true, "Skill is required" ]
    },
    severity: {
        type: String,
        enum: ["low", "medium", "high"]
    }
}, {
    _id: false
});

const preparationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [ true, "Day is required" ]
    },
    focus: {
        type: String,
        required: [ true, "Focus is required" ]
    },
    tasks: {
        type: [String],
        required: [ true, "Tasks are required" ]
    }
}, {
    _id: false
});

const interviewReportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: [true, "User is required"]
    },
    jobDescription: {
        type: String,
        required: [ true, "Job description is required" ]
    },
    resume: {
        type: String,
    },
    selfDescription: {
        type: String,
    },
    matchScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    technicalQuestions: [technicalQuestionsSchema],
    behavioralQuestions: [behavioralQuestionsSchema],
    skillGaps: [skillGapSchema],
    preparationPlan: [preparationPlanSchema],
    title: {
        type: String,
        required: [ true, "Title is required" ]
    },
}, {
    timestamps: true
});

const interviewReportModel = mongoose.model("interviewReport", interviewReportSchema);

module.exports = interviewReportModel;