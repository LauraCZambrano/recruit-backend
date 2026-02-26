import { Router } from 'express';
import { getJobPostingController } from '../../controllers/jobPosting.controller';
import { validate } from '../middlewares/validate';
import { createJobPostingRequestSchema, getApplicationsByJobPostingSchema } from '../../schemas/jobPosting';

const jobPostingRoutes = () => {
    const router = Router();
    const jobPostingController = getJobPostingController();

    // POST /api/job-postings - Create a new job posting
    router.post(
        '/',
        validate(createJobPostingRequestSchema),
        jobPostingController.createJobPosting.bind(jobPostingController),
    );

    // GET /api/job-postings/:id/applications - Get all applications for a job posting
    router.get(
        '/:id/applications',
        validate(getApplicationsByJobPostingSchema),
        jobPostingController.getApplicationsByJobPosting.bind(jobPostingController),
    );

    return router;
};

export default jobPostingRoutes;
