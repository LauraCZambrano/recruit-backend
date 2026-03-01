import { Request, Response, NextFunction } from 'express';
import { getApplicationService } from '../services/application.service';
import logger from '../utils/pino';

/**
 * ApplicationController - Controller responsible for handling application-related HTTP requests
 */
export class ApplicationController {
    /**
     * Handles PATCH /applications/:id/status request to update application status
     * Validates input, invokes service layer, and returns updated application
     * 
     * @param req - Express request with validated params (id) and body (status)
     * @param res - Express response
     * @param next - Express next function for error handling
     */
    async updateApplicationStatus(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const applicationService = getApplicationService();
            const application = await applicationService.updateApplicationStatus(id, status);

            logger.info(
                { applicationId: id, newStatus: status },
                'Application status updated successfully via API',
            );

            res.status(200).json({
                success: true,
                data: {
                    id: application.id,
                    status: application.status,
                    aiScore: application.aiScore,
                    aiSummary: application.aiSummary,
                    aiAnalysis: application.aiAnalysis,
                    resumeText: application.resumeText,
                    createdAt: application.createdAt,
                    updatedAt: application.updatedAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }

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
            const { firstName, lastName, email, jobPostingId, resumeText } = req.body;

            const applicationService = getApplicationService();
            const application = await applicationService.submitApplication({
                firstName,
                lastName,
                email,
                jobPostingId,
                resumeText,
            });

            logger.info(
                { applicationId: application.id },
                'Application submitted successfully via API',
            );

            res.status(201).json({
                success: true,
                data: {
                    id: application.id,
                    status: application.status,
                    aiScore: application.aiScore,
                    aiSummary: application.aiSummary,
                    aiAnalysis: application.aiAnalysis,
                    resumeText: application.resumeText,
                    candidate: {
                        id: application.candidate.id,
                        firstName: application.candidate.firstName,
                        lastName: application.candidate.lastName,
                        email: application.candidate.email,
                        phone: application.candidate.phone,
                        linkedinUrl: application.candidate.linkedinUrl,
                        skills: application.candidate.skills,
                        experienceYears: application.candidate.experienceYears,
                        location: application.candidate.location,
                    },
                    jobPosting: {
                        id: application.jobPosting.id,
                        title: application.jobPosting.title,
                        department: application.jobPosting.department,
                        location: application.jobPosting.location,
                    },
                    createdAt: application.createdAt,
                },
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
