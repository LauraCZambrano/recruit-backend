import { Request, Response, NextFunction } from 'express';
import { getAdminService } from '../services/admin.service';
import logger from '../utils/pino';

/**
 * AdminController - Controller responsible for handling admin-related HTTP requests
 */
export class AdminController {
    /**
     * Handles GET /admin/stats request to retrieve aggregated recruitment statistics
     * Invokes service layer and returns statistics in standardized format
     * 
     * @param req - Express request
     * @param res - Express response
     * @param next - Express next function for error handling
     */
    async getStatistics(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const adminService = getAdminService();
            const stats = await adminService.getStatistics();

            logger.info(
                { stats },
                'Admin statistics retrieved successfully via API',
            );

            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            logger.error(
                { error: error instanceof Error ? error.message : 'Unknown error' },
                'Failed to retrieve admin statistics via API',
            );
            next(error);
        }
    }
}

// Factory function to create AdminController instance
let adminControllerInstance: AdminController | null = null;

export function getAdminController(): AdminController {
    if (!adminControllerInstance) {
        adminControllerInstance = new AdminController();
    }
    return adminControllerInstance;
}
