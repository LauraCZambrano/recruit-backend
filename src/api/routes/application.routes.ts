import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { submitApplicationRequestSchema } from '../../schemas/application';
import { getApplicationController } from '../../controllers/application.controller';

const applicationRoutes = () => {
    const app = Router();
    const applicationController = getApplicationController();

    /**
     * POST /applications
     * Submit a new job application with automated screening
     * 
     * Request body:
     * - candidateId: UUID of the candidate
     * - jobPostingId: UUID of the job posting
     * - resumeText: Resume text for AI screening
     * 
     * Response: 201 with created application data
     */
    app.post(
        '/',
        validate(submitApplicationRequestSchema),
        applicationController.submitApplication.bind(applicationController),
    );

    return app;
};

export default applicationRoutes;
