import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { submitApplicationRequestSchema, updateApplicationStatusSchema } from '../../schemas/application';
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

    /**
     * PATCH /applications/:id/status
     * Update the status of an existing application
     * 
     * Request params:
     * - id: UUID of the application
     * 
     * Request body:
     * - status: ApplicationStatus enum value (NEW, SCREENED, INTERVIEWED, OFFERED, HIRED, REJECTED)
     * 
     * Response: 200 with updated application data
     */
    app.patch(
        '/:id/status',
        validate(updateApplicationStatusSchema),
        applicationController.updateApplicationStatus.bind(applicationController),
    );

    return app;
};

export default applicationRoutes;
