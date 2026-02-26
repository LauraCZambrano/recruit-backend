import { Request, Response, NextFunction } from 'express';
import { getJobPostingService } from '../services/jobPosting.service';
import { getApplicationService } from '../services/application.service';
import logger from '../utils/pino';

/**
 * JobPostingController - Controller responsible for handling job posting-related HTTP requests
 */
export class JobPostingController {
    /**
     * Handles POST /job-postings request to create a new job posting
     * Validates input, invokes service layer, and returns created job posting
     */
    async createJobPosting(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const { title, department, description, location, salaryRange, status } = req.body;

            const jobPostingService = getJobPostingService();
            const jobPosting = await jobPostingService.createJobPosting({
                title,
                department,
                description,
                location,
                salaryRange,
                status,
            });

            logger.info(
                { jobPostingId: jobPosting.id },
                'Job posting created successfully via API',
            );

            res.status(201).json(jobPosting);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handles GET /job-postings request to retrieve all job postings
     * Returns list of job postings with id, title, and department fields
     */
    async listJobPostings(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const jobPostingService = getJobPostingService();
            const jobPostings = await jobPostingService.getAllJobPostings();

            logger.info(
                { count: jobPostings.length },
                'Job postings retrieved successfully',
            );

            res.status(200).json({
                success: true,
                data: jobPostings,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handles GET /job-postings/:id/applications request to retrieve all applications for a job posting
     * Validates job posting ID, invokes service layer, and returns applications with candidate data
     */
    async getApplicationsByJobPosting(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];

            const applicationService = getApplicationService();
            const applications = await applicationService.getApplicationsByJobPosting(id);

            // Transform Application entities to response DTOs
            const responseData = applications.map((application) => ({
                id: application.id,
                candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
                candidateEmail: application.candidate.email,
                aiScore: application.aiScore,
                status: application.status,
                resumeText: application.resumeText,
            }));

            logger.info(
                { jobPostingId: id, count: applications.length },
                'Applications retrieved successfully via API',
            );

            res.status(200).json({
                success: true,
                data: responseData,
            });
        } catch (error: any) {
            // Log not found errors at info level
            if (error.statusCode === 404) {
                logger.info(
                    {
                        jobPostingId: req.params.id,
                        path: req.path,
                        method: req.method,
                    },
                    `Job posting not found: ${error.message}`,
                );
            }
            // Log server errors at error level with stack traces
            else {
                logger.error(
                    {
                        jobPostingId: req.params.id,
                        path: req.path,
                        method: req.method,
                        error: error.message,
                        stack: error.stack,
                        statusCode: error.statusCode || 500,
                    },
                    `Error retrieving applications: ${error.message}`,
                );
            }
            next(error);
        }
    }
}

// Factory function to create JobPostingController instance
let jobPostingControllerInstance: JobPostingController | null = null;

export function getJobPostingController(): JobPostingController {
    if (!jobPostingControllerInstance) {
        jobPostingControllerInstance = new JobPostingController();
    }
    return jobPostingControllerInstance;
}
