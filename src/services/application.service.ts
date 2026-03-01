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
    firstName: string;
    lastName: string;
    email: string;
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
     * @param data - Input data containing firstName, lastName, email, jobPostingId, and resumeText
     * @returns Created Application with AI screening results
     * @throws AppError if JobPosting not found
     */
    async submitApplication(data: SubmitApplicationInput): Promise<Application> {
        const { firstName, lastName, email, jobPostingId, resumeText } = data;

        // Step 1: Find or create candidate
        let candidate = await this.candidateRepository.findOne({
            where: { email },
        });

        const isNewCandidate = !candidate;

        if (!candidate) {
            // Create new candidate with default values
            candidate = this.candidateRepository.create({
                firstName,
                lastName,
                email,
                experienceYears: 0,
                skills: [],
                location: 'Remote',
            });
            candidate = await this.candidateRepository.save(candidate);
            logger.info({ email, candidateId: candidate.id }, 'New candidate created');
        } else {
            logger.info({ email, candidateId: candidate.id }, 'Existing candidate found');
        }

        // Step 2: Verify JobPosting exists
        const jobPosting = await this.jobPostingRepository.findOne({
            where: { id: jobPostingId },
        });

        if (!jobPosting) {
            throw new AppError('Job posting not found', 404);
        }

        // Step 3: Execute AI screening with fallback on failure
        let screeningResult;
        let aiScreeningSucceeded = true;
        try {
            screeningResult = await this.aiService.screenCandidate(
                resumeText,
                jobPosting.description,
            );
        } catch (error) {
            aiScreeningSucceeded = false;
            
            // Create fallback ScreeningResult when AI service fails
            logger.error(
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    candidateId: candidate.id,
                    jobPostingId,
                    isNewCandidate,
                },
                'AI screening failed, using fallback result',
            );

            // For new candidates: use fallback values
            // For existing candidates: preserve their current values
            screeningResult = {
                score: 0,
                summary: 'Error en el análisis de IA',
                keyMatches: isNewCandidate ? [] : candidate.skills,
                missingSkills: [],
                recommendation: 'HOLD' as const,
                experienceYears: isNewCandidate ? 0 : candidate.experienceYears,
            };
        }

        // Step 3.5: Update candidate profile with AI-extracted data
        // Only update if AI screening succeeded
        if (aiScreeningSucceeded) {
            candidate.skills = screeningResult.keyMatches;
            candidate.experienceYears = screeningResult.experienceYears;
            await this.candidateRepository.save(candidate);
        }

        if (aiScreeningSucceeded) {
            logger.info(
                {
                    candidateId: candidate.id,
                    skillsCount: candidate.skills.length,
                    experienceYears: candidate.experienceYears,
                    isNewCandidate,
                },
                'Candidate profile updated with AI-extracted data',
            );
        } else {
            logger.info(
                {
                    candidateId: candidate.id,
                    isNewCandidate,
                    preservedSkillsCount: isNewCandidate ? 0 : candidate.skills.length,
                    preservedExperienceYears: isNewCandidate ? 0 : candidate.experienceYears,
                },
                'Candidate profile preserved due to AI failure',
            );
        }

        // Step 4: Create Application linking candidate and jobPosting
        const application = this.applicationRepository.create({
            status: ApplicationStatus.NEW,
            aiScore: screeningResult.score,
            aiSummary: screeningResult.summary,
            aiAnalysis: screeningResult,
            resumeText,
            candidate,
            jobPosting,
        });

        const savedApplication = await this.applicationRepository.save(application);

        // Reload the application with all relations to ensure all fields are populated
        const reloadedApplication = await this.applicationRepository.findOne({
            where: { id: savedApplication.id },
            relations: ['candidate', 'jobPosting'],
        });

        if (!reloadedApplication) {
            throw new AppError('Failed to reload application after save', 500);
        }

        logger.info(
            {
                applicationId: reloadedApplication.id,
                candidateId: candidate.id,
                jobPostingId,
                aiScore: screeningResult.score,
                isNewCandidate,
            },
            'Application submitted successfully with AI screening',
        );

        return reloadedApplication;
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

    /**
     * Retrieves all applications for a specific job posting
     * @param jobPostingId - UUID of the job posting
     * @returns Array of Applications with related candidate and jobPosting data
     * @throws AppError(404) if job posting doesn't exist
     */
    async getApplicationsByJobPosting(jobPostingId: string): Promise<{ jobPosting: any; applications: Application[] }> {
        // Verify job posting exists
        const jobPosting = await this.jobPostingRepository.findOne({
            where: { id: jobPostingId },
        });

        if (!jobPosting) {
            throw new AppError('Job posting not found', 404);
        }

        // Query applications with relations
        const applications = await this.applicationRepository.find({
            where: { jobPosting: { id: jobPostingId } },
            relations: ['candidate', 'jobPosting'],
            order: { createdAt: 'DESC' },
        });

        logger.info(
            { jobPostingId, count: applications.length },
            'Applications retrieved successfully',
        );

        return { jobPosting, applications };
    }

    /**
     * Updates the status of an application
     * @param applicationId - UUID of the application
     * @param status - New ApplicationStatus value
     * @returns Updated Application
     * @throws AppError(404) if application not found
     */
    async updateApplicationStatus(
        applicationId: string,
        status: ApplicationStatus,
    ): Promise<Application> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
        });

        if (!application) {
            throw new AppError('Application not found', 404);
        }

        const oldStatus = application.status;
        application.status = status;
        const updatedApplication = await this.applicationRepository.save(application);

        logger.info(
            { applicationId, oldStatus, newStatus: status },
            'Application status updated successfully',
        );

        return updatedApplication;
    }

    /**
     * Retrieves an application by ID with candidate and jobPosting relations
     * @param applicationId - UUID of the application
     * @returns Application with candidate and jobPosting populated
     * @throws AppError(404) if application not found
     * @throws AppError(400) if resumeText is not available
     */
    async getApplicationForQuestions(applicationId: string): Promise<Application> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
            relations: ['candidate', 'jobPosting'],
        });

        if (!application) {
            throw new AppError('Application not found', 404);
        }

        if (!application.resumeText) {
            throw new AppError('Resume text not available for this application', 400);
        }

        logger.info(
            {
                applicationId,
                candidateId: application.candidate.id,
                jobPostingId: application.jobPosting.id,
                resumeLength: application.resumeText.length,
            },
            'Application retrieved for interview questions generation',
        );

        return application;
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
