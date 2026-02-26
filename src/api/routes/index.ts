import { Router } from 'express';
import applicationRoutes from './application.routes';
import jobPostingRoutes from './jobPosting.routes';

const index = () => {
    const app = Router();

    // Application submission routes
    app.use('/applications', applicationRoutes());

    // Job posting routes
    app.use('/job-postings', jobPostingRoutes());

    return app;
};
export default index;
