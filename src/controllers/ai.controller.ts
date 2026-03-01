import type { Request, Response } from 'express';
import { getAIService } from '../services/ai.service';
import { getApplicationService } from '../services/application.service';
import type { GenerateJobDescriptionRequest } from '../schemas/jobDescription';
import type { GenerateInterviewQuestionsParams } from '../schemas/interviewQuestions';
import logger from '../utils/pino';
import AppError from '../utils/appError';

/**
 * Generates a job description using AI
 * POST /api/ai/generate-job-description
 */
export async function generateJobDescription(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { description } = req.body as GenerateJobDescriptionRequest;
        
        const aiService = getAIService();
        const result = await aiService.generateJobDescription(description);
        
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, 'Job description generation endpoint error');
        
        res.status(500).json({
            success: false,
            message: 'Error generating job description',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Generates personalized interview questions for an application
 * POST /api/ai/generate-questions/:applicationId
 */
export async function generateInterviewQuestions(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { applicationId } = req.params as GenerateInterviewQuestionsParams;
        
        logger.info({ applicationId }, 'Interview questions generation request received');
        
        // Get services
        const applicationService = getApplicationService();
        const aiService = getAIService();
        
        // Retrieve application with relations
        const application = await applicationService.getApplicationForQuestions(
            applicationId
        );
        
        // Generate interview questions
        const result = await aiService.generateInterviewQuestions(
            application.resumeText!,
            application.jobPosting.description,
            applicationId
        );
        
        res.status(200).json({
            success: true,
            questions: result.questions
        });
    } catch (error) {
        // Handle AppError (404, 400) with specific status codes
        if (error instanceof AppError) {
            logger.warn({
                error: error.message,
                statusCode: error.statusCode,
                applicationId: req.params.applicationId
            }, 'Interview questions generation failed with known error');
            
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
        
        // Handle unexpected errors
        logger.error({
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            applicationId: req.params.applicationId
        }, 'Interview questions generation endpoint error');
        
        res.status(500).json({
            success: false,
            message: 'Error generating interview questions',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
