import { AppDataSource } from '../loaders/db';
import { JobPosting } from '../models/jobPosting.entity';
import { Application } from '../models/application.entity';
import { ApplicationStatus } from '../models/enums';
import logger from '../utils/pino';
import { DataSource, Repository } from 'typeorm';

export interface AdminStats {
    totalVacancies: number;
    activeCandidates: number;
    hiredCount: number;
    avgAiScore: number;
}

/**
 * AdminService - Service responsible for aggregating recruitment statistics
 */
export class AdminService {
    private readonly jobPostingRepository: Repository<JobPosting>;
    private readonly applicationRepository: Repository<Application>;

    constructor(dataSource?: DataSource) {
        const source = dataSource || AppDataSource;
        this.jobPostingRepository = source.getRepository(JobPosting);
        this.applicationRepository = source.getRepository(Application);
    }

    /**
     * Retrieves aggregated recruitment statistics
     * @returns AdminStats object containing totalVacancies, activeCandidates, hiredCount, and avgAiScore
     */
    async getStatistics(): Promise<AdminStats> {
        try {
            // Query 1: Count total job postings
            const totalVacancies = await this.jobPostingRepository.count();

            // Query 2: Count active candidates (applications where status != REJECTED)
            const activeCandidates = await this.applicationRepository
                .createQueryBuilder('application')
                .where('application.status != :status', { status: ApplicationStatus.REJECTED })
                .getCount();

            // Query 3: Count hired candidates
            const hiredCount = await this.applicationRepository.count({
                where: { status: ApplicationStatus.HIRED },
            });

            // Query 4: Calculate average AI score (only non-null values)
            const result = await this.applicationRepository
                .createQueryBuilder('application')
                .select('AVG(application.aiScore)', 'avg')
                .where('application.aiScore IS NOT NULL')
                .getRawOne();

            // Round to 2 decimal places, return 0 if no scores exist
            const avgAiScore = result?.avg ? Math.round(result.avg * 100) / 100 : 0;

            logger.info(
                {
                    totalVacancies,
                    activeCandidates,
                    hiredCount,
                    avgAiScore,
                },
                'Admin statistics retrieved successfully',
            );

            return {
                totalVacancies,
                activeCandidates,
                hiredCount,
                avgAiScore,
            };
        } catch (error) {
            logger.error(
                { error: error instanceof Error ? error.message : 'Unknown error' },
                'Failed to retrieve admin statistics',
            );
            throw error;
        }
    }
}

// Factory function to create AdminService instance
let adminServiceInstance: AdminService | null = null;

export function getAdminService(): AdminService {
    if (!adminServiceInstance) {
        adminServiceInstance = new AdminService();
    }
    return adminServiceInstance;
}
