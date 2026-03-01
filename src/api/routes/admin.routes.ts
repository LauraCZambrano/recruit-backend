import { Router } from 'express';
import { getAdminController } from '../../controllers/admin.controller';

const adminRoutes = () => {
    const app = Router();
    const adminController = getAdminController();

    /**
     * GET /admin/stats
     * Retrieve aggregated recruitment statistics
     * 
     * Response: 200 with statistics data
     * - totalVacancies: Total count of job postings
     * - activeCandidates: Count of applications with status != REJECTED
     * - hiredCount: Count of applications with status == HIRED
     * - avgAiScore: Average AI score across all applications (rounded to 2 decimals)
     */
    app.get(
        '/stats',
        adminController.getStatistics.bind(adminController),
    );

    return app;
};

export default adminRoutes;
