import { AppDataSource } from '@/loaders/db.js';
import { Application } from '@/models/application.entity.js';
import AppError from '@/utils/appError.js';
import logger from '@/utils/pino.js';
import { DataSource } from 'typeorm';

/**
 * ApplicationService - Service responsible for managing Application entity operations
 */
export class ApplicationService {
    private readonly applicationRepository;

    constructor(dataSource?: DataSource) {
        const source = dataSource || AppDataSource;
        this.applicationRepository = source.getRepository(Application);
    }

    /**
     * Updates the AI screening result fields in an application
     * @param applicationId - UUID of the application
     * @param aiScore - Screening score (0-100)
     * @param aiSummary - Analysis summary
     * @returns Updated Application
     * @throws AppError if the application does not exist
     */
    async updateScreeningResult(
        applicationId: string,
        aiScore: number,
        aiSummary: string,
    ): Promise<Application> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
        });

        if (!application) {
            throw new AppError('Application not found', 404);
        }

        application.aiScore = aiScore;
        application.aiSummary = aiSummary;

        const updatedApplication =
            await this.applicationRepository.save(application);

        logger.info(
            { applicationId, aiScore },
            'Application screening result updated successfully',
        );

        return updatedApplication;
    }
}

// Factory function to create ApplicationService instance
let applicationServiceInstance: ApplicationService | null = null;

export function getApplicationService(): ApplicationService {
    if (!applicationServiceInstance) {
        applicationServiceInstance = new ApplicationService();
    }
    return applicationServiceInstance;
}
