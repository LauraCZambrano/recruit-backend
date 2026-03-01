import { Router } from 'express';
import applicationRoutes from './application.routes';
import jobPostingRoutes from './jobPosting.routes';
import aiRoutes from './ai.routes';
import adminRoutes from './admin.routes';

const index = () => {
    const app = Router();

    // Application submission routes
    app.use('/applications', applicationRoutes());

    // Job posting routes
    app.use('/job-postings', jobPostingRoutes());

    // AI routes
    app.use('/ai', aiRoutes());

    // Admin routes
    app.use('/admin', adminRoutes());

    return app;
};
export default index;
