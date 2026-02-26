import { AppDataSource } from '../loaders/db';
import { Application } from '../models/application.entity';
import { Candidate } from '../models/candidate.entity';
import { JobPosting } from '../models/jobPosting.entity';
import { ApplicationStatus } from '../models/enums';
import AppError from '../utils/appError';
import logger from '../utils/pino';
import { DataSource, Repository } from 'typeorm';
import { AIService, getAIService } from './ai.service';

export interface SubmitApplicationInput {
    candidateId: string;
    jobPostingId: string;
    resumeText: string;
}

/**
 * ApplicationService - Service responsible for managing Application entity operations
 */
export class ApplicationService {
    private readonly applicationRepository: Repository<Application>;
    private readonly candidateRepository: Repository<Candidate>;
    private readonly jobPostingRepository: Repository<JobPosting>;
    private readonly aiService: AIService;

    constructor(dataSource?: DataSource, aiService?: AIService) {
        const source = dataSource || AppDataSource;
        this.applicationRepository = source.getRepository(Application);
        this.candidateRepository = source.getRepository(Candidate);
        this.jobPostingRepository = source.getRepository(JobPosting);
        this.aiService = aiService || getAIService();
    }

    /**
     * Submits a new application with automated AI screening
     * @param data - Input data containing candidateId, jobPostingId, and resumeText
     * @returns Created Application with AI screening results
     * @throws AppError if Candidate or JobPosting not found
     */
    async submitApplication(data: SubmitApplicationInput): Promise<Application> {
        const { candidateId, jobPostingId, resumeText } = data;

        // Verify Candidate exists
        const candidate = await this.candidateRepository.findOne({
            where: { id: candidateId },
        });

        if (!candidate) {
            throw new AppError('Candidate not found', 404);
        }

        // Verify JobPosting exists
        const jobPosting = await this.jobPostingRepository.findOne({
            where: { id: jobPostingId },
        });

        if (!jobPosting) {
            throw new AppError('Job posting not found', 404);
        }

        // Execute AI screening
        const screeningResult = await this.aiService.screenCandidate(
            resumeText,
            jobPosting.description,
        );

        // Create Application with screening results
        const application = this.applicationRepository.create({
            status: ApplicationStatus.NEW,
            aiScore: screeningResult.score,
            aiSummary: screeningResult.summary,
            candidate,
            jobPosting,
        });

        const savedApplication = await this.applicationRepository.save(application);

        logger.info(
            {
                applicationId: savedApplication.id,
                candidateId,
                jobPostingId,
                aiScore: screeningResult.score,
            },
            'Application submitted successfully with AI screening',
        );

        return savedApplication;
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
