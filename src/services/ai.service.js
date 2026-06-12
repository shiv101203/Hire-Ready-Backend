const { GoogleGenAI } = require("@google/genai");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

const interviewReportSchema = {
    type: "OBJECT",
    properties: {
        matchScore: {
            type: "NUMBER",
            description: "Match score between 0 and 100 indicating how well the candidate matches the JD"
        },
        technicalQuestions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    question: { type: "STRING", description: "Technical question likely to be asked" },
                    intention: { type: "STRING", description: "Interviewer's intent behind the question" },
                    answer: { type: "STRING", description: "Key points and approach to answer this question" }
                },
                required: ["question", "intention", "answer"]
            }
        },
        behavioralQuestions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    question: { type: "STRING", description: "Behavioral question likely to be asked" },
                    intention: { type: "STRING", description: "Interviewer's intent behind the question" },
                    answer: { type: "STRING", description: "Key points and approach to answer this question" }
                },
                required: ["question", "intention", "answer"]
            }
        },
        skillGaps: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    skill: { type: "STRING", description: "Skill the candidate is lacking based on the JD" },
                    severity: {
                        type: "STRING",
                        enum: ["low", "medium", "high"],
                        description: "How critical this gap is before the interview"
                    }
                },
                required: ["skill", "severity"]
            }
        },
        preparationPlan: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    day: { type: "NUMBER", description: "Day number starting from 1" },
                    focus: { type: "STRING", description: "Main topic to focus on that day" },
                    tasks: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        description: "Specific tasks to complete that day"
                    }
                },
                required: ["day", "focus", "tasks"]
            }
        },
        title: {
            type: "STRING",
            description: "The title of the job for which the interview report is generated"
        }
    },
    required: ["matchScore", "technicalQuestions", "behavioralQuestions", "skillGaps", "preparationPlan", "title"]
};

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `You are an expert technical recruiter and interview coach. Analyze the following candidate profile against the job description 
    and generate a detailed, actionable interview report.

    Resume:
    ${resume}

    Self Description:
    ${selfDescription}

    Job Description:
    ${jobDescription}

    Instructions:
    - Generate a minimum of 20 technical questions that are highly relevant to the JD and the candidate's tech stack. Cover every core technology and concept mentioned in the JD. Each question must be something a candidate is very likely to face in an actual interview for this specific role. Do not repeat similar questions — ensure each one tests a different concept or skill.
    - Generate a minimum of 20 behavioral questions based on the role expectations and seniority level. Cover ownership, problem-solving, teamwork, conflict resolution, communication, and learning ability. Each question must reveal something meaningful about the candidate's work style and attitude.
    - Identify real skill gaps by carefully comparing the JD requirements against the candidate's profile. Only list gaps that are genuinely missing and relevant to the role.
    - Create a realistic day-by-day preparation plan of minimum 30 days. Each day must have one focused topic and at least 3 specific actionable tasks. The plan must cover all identified skill gaps, core technologies in the JD, interview preparation, DSA practice, and mock interview sessions in the final days. Do not rush topics — give each concept enough days based on its complexity.
    - Score the match honestly between 0-100 based on how well the candidate's current profile aligns with the JD.`;

    const response = await ai.models.generateContent({
        model: "gemini-1.5-pro",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: interviewReportSchema
        }
    });

    const text =
        response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("Gemini returned empty response");
    }

    return JSON.parse(text);
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        args: [
            ...chromium.args,
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ],
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const blockedTypes = ['image', 'stylesheet', 'font', 'media'];
        if (blockedTypes.includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    await page.setContent(htmlContent, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
    });

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });

    await browser.close();

    return pdfBuffer;
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    try {
        const resumePdfSchema = {
            type: "OBJECT",
            properties: {
                html: {
                    type: "STRING",
                    description: "The HTML content of the resume which can be converted to PDF using any library like puppeteer"
                }
            },
            required: ["html"]
        }

        const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.

                        The resume must strictly follow this exact section order:
                        1. Header: Candidate's full name in large bold text, followed by email, GitHub, LinkedIn, and phone number on the same line separated by |
                        2. Professional Summary: 3-4 lines tailored to the job description, highlighting the candidate's most relevant strengths
                        3. Education: University name, degree, duration, and CGPA
                        4. Technical Skills: Grouped by category (Languages, Backend, Frontend, Databases, Tools/DevOps, Concepts)
                        5. Work Experience: If the provided resume contains any work experience, internships, or professional roles, include them here with company name, role, duration, and 3-4 bullet points describing responsibilities and achievements. If no experience exists in the provided resume, skip this section entirely — do not fabricate any experience.
                        6. Key Projects: Each project must have the project name and tech stack on the same line, followed by 3-4 bullet points describing backend-focused contributions, architecture decisions, and technical achievements. If work experience section exists, limit to 2-3 most relevant projects to ensure the resume fits on one page.
                        7. Problem Solving & Achievements: LeetCode stats, DSA strengths, hackathons, and any other notable achievements. Keep this section concise — maximum 3-4 bullet points.
                        8. Extra Curricular Activities: Any relevant activities, clubs, or interests. Keep this section to 2-3 lines maximum.

                        Important rules:
                        - Include ALL information from the provided resume without skipping any detail. Do not remove any project, skill, or achievement.
                        - Gemini may add relevant additional details, improved phrasing, or stronger action verbs to enhance the content — but must never fabricate fake experience, companies, or credentials.
                        - The content must not sound AI-generated. Use natural, human-written language with strong action verbs.
                        - Design must be clean, professional, and ATS-friendly. Use a single column or subtle two-column layout.
                        - Use inline CSS only. No external stylesheets or fonts that require network requests.
                        - The resume must fit exactly on one A4 page regardless of how many sections are present. If work experience exists, reduce the number of projects and condense other sections accordingly to maintain the single page constraint. Adjust font size (minimum 11px), line height, and spacing to fill the full page without overflow or blank spaces.
                        - A single-page resume is the industry standard and is strongly preferred by companies. Focus on quality over quantity and include all information that maximizes the candidate's chances of getting an interview call for the given job description.
                    `

        const response = await ai.models.generateContent({
            model: "gemini-1.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: resumePdfSchema,
            }
        });

        const text =
            response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("Gemini returned empty response for resume PDF");
        }

        const jsonContent = JSON.parse(text);

        if (!jsonContent?.html || typeof jsonContent.html !== "string") {
            throw new Error("Invalid HTML generated by Gemini");
        }

        const pdfBuffer = await generatePdfFromHtml(jsonContent.html);

        return pdfBuffer;

    } catch (err) {
        console.error("Resume PDF error:", err);
        throw err;
    }
}

module.exports = {
    generateInterviewReport,
    generateResumePdf
};