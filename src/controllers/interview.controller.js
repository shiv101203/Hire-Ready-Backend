const pdfParse = require("pdf-parse");
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");


/**
 * @name generateInterviewReportController
 * @description Controller to generate interview report based on user self description, resume pdf and job description
 * @access private
 */
async function generateInterviewReportController(req, res) {
    try {
        const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText();
        if (!resumeContent) {
            return res.status(400).json({ message: "Resume file is required" });
        }

        const { selfDescription, jobDescription } = req.body;

        const interviewReportByAi = await generateInterviewReport({
            resume: resumeContent.text,
            selfDescription,
            jobDescription
        });

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeContent.text,
            selfDescription,
            jobDescription,
            ...interviewReportByAi
        });

        res.status(201).json({
            message: "Interview report generated successfully",
            interviewReport
        });
    } catch (err) {
        console.error("Report generation error:", err);
        res.status(500).json({ message: "Failed to generate report", error: err.message });
    }
}

/**
 * @name getInterviewReportByIdController
 * @description Controller to get interview report by interview id
 * @access private
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params;

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id });

    if (!interviewReport) {
        return res.status(404).json(
            { message: "Interview report not found" }
        );
    }

    res.status(200).json({
        message: "Interview report fetched successfully",
        interviewReport
    });
}


/**
 * @name getAllInterviewReportsController
 * @description Controller to get all interview reports for the authenticated user
 * @access private
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan");

    res.status(200).json({
        message: "Interview reports fetched successfully",
        interviewReports
    });
}

/**
 * Controller to generate resume PDF based on user self description, resume and job description.
 * @name generateResumePdfController
 * @access private
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params;

    const interviewReport = await interviewReportModel.findById(interviewReportId);

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found"
        });
    }

    try {
        const { resume, jobDescription, selfDescription } = interviewReport;

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription });

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        });

        res.send(pdfBuffer);

    } catch (err) {
        console.error("PDF generation error:", err);
        res.status(500).json({ message: "Failed to generate resume PDF", error: err.message });
    }
}


module.exports = { generateInterviewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController };