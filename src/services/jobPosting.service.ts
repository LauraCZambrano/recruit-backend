import { AppDataSource } from '../loaders/db';
import { JobPosting } from '../models/jobPosting.entity';
import { JobPostingStatus } from '../models/enums';
import AppError from '../utils/appError';
import logger from '../utils/pino';

/**
 * JobPostingService - Business logic for job posting operations
 */
export class JobPostingService {
    private readonly jobPostingRepository = AppDataSource.getRepository(JobPosting);

    /**
     * Retrieves all job postings with id, title, and department fields
     */
    async getAllJobPostings(): Promise<JobPosting[]> {
        try {
            const jobPostings = await this.jobPostingRepository.find({
                select: ['id', 'title', 'department'],
            });

            return jobPostings;
        } catch (error) {
            logger.error({ error }, 'Error retrieving job postings');
            throw new AppError('Failed to retrieve job postings', 500);
        }
    }

    /**
     * Creates a new job posting
     */
    async createJobPosting(data: {
        title: string;
        department: string;
        description: string;
        location: string;
        salaryRange?: string;
        status?: JobPostingStatus;
    }): Promise<JobPosting> {
        try {
            const jobPosting = this.jobPostingRepository.create({
                title: data.title,
                department: data.department,
                description: data.description,
                location: data.location,
                salaryRange: data.salaryRange || null,
                status: data.status || JobPostingStatus.DRAFT,
            });

            const savedJobPosting = await this.jobPostingRepository.save(jobPosting);

            logger.info(
                { jobPostingId: savedJobPosting.id },
                'Job posting created successfully',
            );

            return savedJobPosting;
        } catch (error) {
            logger.error({ error }, 'Error creating job posting');
            throw new AppError('Failed to create job posting', 500);
        }
    }
}

// Factory function to create JobPostingService instance
let jobPostingServiceInstance: JobPostingService | null = null;

export function getJobPostingService(): JobPostingService {
    if (!jobPostingServiceInstance) {
        jobPostingServiceInstance = new JobPostingService();
    }
    return jobPostingServiceInstance;
}
