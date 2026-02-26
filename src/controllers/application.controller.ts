import { Request, Response, NextFunction } from 'express';
import { getApplicationService } from '../services/application.service';
import logger from '../utils/pino';

/**
 * ApplicationController - Controller responsible for handling application-related HTTP requests
 */
export class ApplicationController {
    /**
     * Handles POST /applications request to submit a new application
     * Validates input, invokes service layer, and returns created application
     * 
     * @param req - Express request with validated body containing candidateId, jobPostingId, resumeText
     * @param res - Express response
     * @param next - Express next function for error handling
     */
    async submitApplication(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const { candidateId, jobPostingId, resumeText } = req.body;

            const applicationService = getApplicationService();
            const application = await applicationService.submitApplication({
                candidateId,
                jobPostingId,
                resumeText,
            });

            logger.info(
                { applicationId: application.id },
                'Application submitted successfully via API',
            );

            res.status(201).json({
                id: application.id,
                status: application.status,
                aiScore: application.aiScore,
                aiSummary: application.aiSummary,
                candidateId: application.candidate.id,
                jobPostingId: application.jobPosting.id,
                createdAt: application.createdAt,
            });
        } catch (error) {
            next(error);
        }
    }
}

// Factory function to create ApplicationController instance
let applicationControllerInstance: ApplicationController | null = null;

export function getApplicationController(): ApplicationController {
    if (!applicationControllerInstance) {
        applicationControllerInstance = new ApplicationController();
    }
    return applicationControllerInstance;
}
