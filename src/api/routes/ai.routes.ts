import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { generateJobDescriptionRequestSchema } from '../../schemas/jobDescription';
import { generateInterviewQuestionsParamsSchema } from '../../schemas/interviewQuestions';
import { generateJobDescription, generateInterviewQuestions } from '../../controllers/ai.controller';

const aiRoutes = () => {
    const app = Router();

    /**
     * POST /ai/generate-job-description
     * Generates a professional job description from a simple prompt
     * 
     * Request body:
     * - prompt: string (1-2000 characters, non-whitespace)
     * 
     * Response: 200 with JobDescriptionOutput containing:
     * - title: Job title
     * - description: Job description
     * - responsibilities: Array of responsibilities
     * - requirements: Array of requirements
     * - benefits: Array of benefits
     */
    app.post(
        '/generate-job-description',
        validate(generateJobDescriptionRequestSchema),
        generateJobDescription,
    );

    /**
     * POST /ai/generate-questions/:applicationId
     * Generates 5 personalized interview questions for a candidate
     * 
     * Path parameters:
     * - applicationId: UUID of the application
     * 
     * Response: 200 with InterviewQuestionsOutput containing:
     * - questions: Array of exactly 5 interview questions
     * 
     * Errors:
     * - 400: Invalid UUID or resume text not available
     * - 404: Application not found
     * - 500: AI generation or parsing error
     */
    app.post(
        '/generate-questions/:applicationId',
        validate(generateInterviewQuestionsParamsSchema),
        generateInterviewQuestions,
    );

    return app;
};

export default aiRoutes;
