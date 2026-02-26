import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fc from 'fast-check';
import { Candidate } from '../candidate.entity';
import { JobPosting } from '../jobPosting.entity';
import { Application } from '../application.entity';
import { Interview } from '../interview.entity';
import { Evaluation } from '../evaluation.entity';
import { Onboarding } from '../onboarding.entity';
import {
    JobPostingStatus,
    ApplicationStatus,
    InterviewType,
    OnboardingStatus,
} from '../enums';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test database configuration
let testDataSource: DataSource;

const testDbOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '0000',
    database: process.env.DB_NAME || 'recruit', // Use main database for testing
    entities: [path.join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    synchronize: true, // Synchronize schema with entities for testing
    logging: false,
    dropSchema: false,
};

// Helper function to clean database between tests
async function cleanDatabase() {
    if (!testDataSource?.isInitialized) {
        return;
    }

    const entities = testDataSource.entityMetadatas;

    for (const entity of entities.toReversed()) {
        const repository = testDataSource.getRepository(entity.name);
        await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }
}

// Setup test database connection
beforeAll(async () => {
    try {
        testDataSource = new DataSource(testDbOptions);
        await testDataSource.initialize();
    } catch (error) {
        console.error('Failed to connect to test database. Please ensure:');
        console.error('1. PostgreSQL is running');
        console.error('2. Test database exists (DB_TEST_NAME in .env)');
        console.error('3. Database credentials are correct in .env');
        console.error('Error:', error);
        throw error;
    }
});

// Clean database before each test
beforeEach(async () => {
    await cleanDatabase();
});

// Close database connection after all tests
afterAll(async () => {
    if (testDataSource?.isInitialized) {
        await testDataSource.destroy();
    }
});

// Fast-check arbitraries for generating random entity data
const candidateArbitrary = fc.record({
    firstName: fc.string({ minLength: 1, maxLength: 50 }),
    lastName: fc.string({ minLength: 1, maxLength: 50 }),
    email: fc.uuid().map((uuid) => `test-${uuid}@example.com`),
    phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), {
        nil: null,
    }),
    resumeUrl: fc.option(fc.webUrl(), { nil: null }),
    linkedinUrl: fc.option(fc.webUrl(), { nil: null }),
    skills: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
        minLength: 0,
        maxLength: 10,
    }),
    experienceYears: fc.integer({ min: 0, max: 50 }),
    location: fc.string({ minLength: 1, maxLength: 100 }),
});

const jobPostingArbitrary = fc.record({
    title: fc.string({ minLength: 1, maxLength: 100 }),
    department: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.string({ minLength: 1, maxLength: 500 }),
    salaryRange: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
        nil: null,
    }),
    location: fc.string({ minLength: 1, maxLength: 100 }),
    status: fc.constantFrom(
        JobPostingStatus.OPEN,
        JobPostingStatus.CLOSED,
        JobPostingStatus.DRAFT,
    ),
});

const applicationArbitrary = fc.record({
    status: fc.constantFrom(
        ApplicationStatus.NEW,
        ApplicationStatus.SCREENED,
        ApplicationStatus.INTERVIEWED,
        ApplicationStatus.OFFERED,
        ApplicationStatus.HIRED,
        ApplicationStatus.REJECTED,
    ),
    aiScore: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
    aiSummary: fc.option(fc.string({ minLength: 1, maxLength: 500 }), {
        nil: null,
    }),
});

const interviewArbitrary = fc.record({
    type: fc.constantFrom(
        InterviewType.SCREENING,
        InterviewType.TECHNICAL,
        InterviewType.FINAL,
    ),
    scheduledAt: fc.date({
        min: new Date('2020-01-01'),
        max: new Date('2030-12-31'),
    }),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 500 }), {
        nil: null,
    }),
    score: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
});

const evaluationArbitrary = fc.record({
    category: fc.string({ minLength: 1, maxLength: 50 }),
    score: fc.integer({ min: 0, max: 100 }),
    feedback: fc.option(fc.string({ minLength: 1, maxLength: 500 }), {
        nil: null,
    }),
});

const onboardingArbitrary = fc.record({
    tasks: fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.anything(),
    ),
    status: fc.constantFrom(
        OnboardingStatus.PENDING,
        OnboardingStatus.IN_PROGRESS,
        OnboardingStatus.COMPLETED,
    ),
});

// Helper functions to reduce cognitive complexity
async function createApplicationWithRelations(
    candidateData: any,
    jobPostingData: any,
    applicationData: any,
    interviewsData: any[],
    evaluationsData: any[],
    onboardingData: any,
) {
    const candidateRepo = testDataSource.getRepository(Candidate);
    const jobPostingRepo = testDataSource.getRepository(JobPosting);
    const applicationRepo = testDataSource.getRepository(Application);
    const interviewRepo = testDataSource.getRepository(Interview);
    const evaluationRepo = testDataSource.getRepository(Evaluation);
    const onboardingRepo = testDataSource.getRepository(Onboarding);

    const candidate = candidateRepo.create(candidateData);
    const savedCandidate = (await candidateRepo.save(
        candidate,
    )) as unknown as Candidate;

    const jobPosting = jobPostingRepo.create(jobPostingData);
    const savedJobPosting = (await jobPostingRepo.save(
        jobPosting,
    )) as unknown as JobPosting;

    const application = applicationRepo.create({
        ...applicationData,
        candidate: savedCandidate,
        jobPosting: savedJobPosting,
    });
    const savedApplication = (await applicationRepo.save(
        application,
    )) as unknown as Application;

    const interviews = interviewsData.map((data) =>
        interviewRepo.create({ ...data, application: savedApplication }),
    ) as unknown as Interview[];
    const savedInterviews =
        interviews.length > 0
            ? await interviewRepo.save(interviews)
            : ([] as Interview[]);

    const evaluations = evaluationsData.map((data) =>
        evaluationRepo.create({ ...data, application: savedApplication }),
    ) as unknown as Evaluation[];
    const savedEvaluations =
        evaluations.length > 0
            ? await evaluationRepo.save(evaluations)
            : ([] as Evaluation[]);

    let onboardingId: string | null = null;
    if (onboardingData) {
        const onboarding = onboardingRepo.create({
            ...onboardingData,
            application: savedApplication,
        }) as unknown as Onboarding;
        const savedOnboarding = await onboardingRepo.save(onboarding);
        onboardingId = savedOnboarding.id;
    }

    return {
        savedCandidate,
        savedJobPosting,
        savedApplication,
        interviewIds: savedInterviews.map((i) => i.id),
        evaluationIds: savedEvaluations.map((e) => e.id),
        onboardingId,
    };
}

async function verifyRelatedRecordsExist(
    applicationId: string,
    interviewIds: string[],
    evaluationIds: string[],
    onboardingId: string | null,
) {
    const interviewRepo = testDataSource.getRepository(Interview);
    const evaluationRepo = testDataSource.getRepository(Evaluation);
    const onboardingRepo = testDataSource.getRepository(Onboarding);

    if (interviewIds.length > 0) {
        const count = await interviewRepo.countBy({
            application: { id: applicationId },
        });
        expect(count).toBe(interviewIds.length);
    }

    if (evaluationIds.length > 0) {
        const count = await evaluationRepo.countBy({
            application: { id: applicationId },
        });
        expect(count).toBe(evaluationIds.length);
    }

    if (onboardingId) {
        const record = await onboardingRepo.findOneBy({ id: onboardingId });
        expect(record).not.toBeNull();
    }
}

async function verifyRelatedRecordsDeleted(
    applicationId: string,
    onboardingId: string | null,
) {
    const interviewRepo = testDataSource.getRepository(Interview);
    const evaluationRepo = testDataSource.getRepository(Evaluation);
    const onboardingRepo = testDataSource.getRepository(Onboarding);

    const interviewsAfter = await interviewRepo.countBy({
        application: { id: applicationId },
    });
    expect(interviewsAfter).toBe(0);

    const evaluationsAfter = await evaluationRepo.countBy({
        application: { id: applicationId },
    });
    expect(evaluationsAfter).toBe(0);

    if (onboardingId) {
        const onboardingAfter = await onboardingRepo.findOneBy({
            id: onboardingId,
        });
        expect(onboardingAfter).toBeNull();
    }
}

async function cleanupEntities(
    savedApplication: Application | undefined,
    savedCandidate: Candidate | undefined,
    savedJobPosting: JobPosting | undefined,
) {
    const candidateRepo = testDataSource.getRepository(Candidate);
    const jobPostingRepo = testDataSource.getRepository(JobPosting);
    const applicationRepo = testDataSource.getRepository(Application);

    if (savedApplication) {
        const app = await applicationRepo.findOneBy({
            id: savedApplication.id,
        });
        if (app) await applicationRepo.remove(app);
    }
    if (savedCandidate) {
        const cand = await candidateRepo.findOneBy({ id: savedCandidate.id });
        if (cand) await candidateRepo.remove(cand);
    }
    if (savedJobPosting) {
        const job = await jobPostingRepo.findOneBy({ id: savedJobPosting.id });
        if (job) await jobPostingRepo.remove(job);
    }
}

describe('Entity Property-Based Tests', () => {
    it('should have test database configured', () => {
        expect(testDataSource).toBeDefined();
        expect(testDataSource.isInitialized).toBe(true);
    });

    // Feature: recruitment-database-entities, Property 1: Audit Column Creation Timestamp
    // **Validates: Requirements 13.1**
    describe('Property 1: Audit Column Creation Timestamp', () => {
        it('should automatically populate createdAt when entity is saved', async () => {
            await fc.assert(
                fc.asyncProperty(candidateArbitrary, async (candidateData) => {
                    const candidateRepo =
                        testDataSource.getRepository(Candidate);

                    // Create and save candidate
                    const candidate = candidateRepo.create(candidateData);
                    const beforeSave = new Date();

                    const savedCandidate = await candidateRepo.save(candidate);

                    const afterSave = new Date();

                    // Verify createdAt is populated
                    expect(savedCandidate.createdAt).toBeDefined();
                    expect(savedCandidate.createdAt).toBeInstanceOf(Date);

                    // Verify createdAt is within reasonable time range
                    expect(
                        savedCandidate.createdAt.getTime(),
                    ).toBeGreaterThanOrEqual(beforeSave.getTime() - 1000);
                    expect(
                        savedCandidate.createdAt.getTime(),
                    ).toBeLessThanOrEqual(afterSave.getTime() + 1000);

                    // Clean up
                    await candidateRepo.remove(savedCandidate);
                }),
                { numRuns: 100 },
            );
        });

        it('should automatically populate createdAt for JobPosting entities', async () => {
            await fc.assert(
                fc.asyncProperty(
                    jobPostingArbitrary,
                    async (jobPostingData) => {
                        const jobPostingRepo =
                            testDataSource.getRepository(JobPosting);

                        const jobPosting =
                            jobPostingRepo.create(jobPostingData);
                        const beforeSave = new Date();

                        const savedJobPosting =
                            await jobPostingRepo.save(jobPosting);

                        const afterSave = new Date();

                        expect(savedJobPosting.createdAt).toBeDefined();
                        expect(savedJobPosting.createdAt).toBeInstanceOf(Date);
                        expect(
                            savedJobPosting.createdAt.getTime(),
                        ).toBeGreaterThanOrEqual(beforeSave.getTime() - 1000);
                        expect(
                            savedJobPosting.createdAt.getTime(),
                        ).toBeLessThanOrEqual(afterSave.getTime() + 1000);

                        await jobPostingRepo.remove(savedJobPosting);
                    },
                ),
                { numRuns: 100 },
            );
        });
    });

    // Feature: recruitment-database-entities, Property 2: Audit Column Update Timestamp
    // **Validates: Requirements 13.2**
    describe('Property 2: Audit Column Update Timestamp', () => {
        it('should automatically update updatedAt when entity is modified', async () => {
            await fc.assert(
                fc.asyncProperty(
                    candidateArbitrary,
                    fc.string({ minLength: 1, maxLength: 100 }),
                    async (candidateData, newLocation) => {
                        const candidateRepo =
                            testDataSource.getRepository(Candidate);

                        // Create and save candidate
                        const candidate = candidateRepo.create(candidateData);
                        const savedCandidate =
                            await candidateRepo.save(candidate);

                        const initialUpdatedAt = savedCandidate.updatedAt;

                        // Wait a small amount to ensure timestamp difference
                        await new Promise((resolve) => setTimeout(resolve, 10));

                        // Update the candidate
                        savedCandidate.location = newLocation;
                        const beforeUpdate = new Date();
                        const updatedCandidate =
                            await candidateRepo.save(savedCandidate);
                        const afterUpdate = new Date();

                        // Verify updatedAt changed
                        expect(updatedCandidate.updatedAt).toBeDefined();
                        expect(updatedCandidate.updatedAt).toBeInstanceOf(Date);

                        // Verify updatedAt is greater than or equal to initial value
                        expect(
                            updatedCandidate.updatedAt.getTime(),
                        ).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());

                        // Verify updatedAt is within reasonable time range of update
                        expect(
                            updatedCandidate.updatedAt.getTime(),
                        ).toBeGreaterThanOrEqual(beforeUpdate.getTime() - 1000);
                        expect(
                            updatedCandidate.updatedAt.getTime(),
                        ).toBeLessThanOrEqual(afterUpdate.getTime() + 1000);

                        // Clean up
                        await candidateRepo.remove(updatedCandidate);
                    },
                ),
                { numRuns: 100 },
            );
        });

        it('should automatically update updatedAt for JobPosting entities', async () => {
            await fc.assert(
                fc.asyncProperty(
                    jobPostingArbitrary,
                    fc.constantFrom(
                        JobPostingStatus.OPEN,
                        JobPostingStatus.CLOSED,
                        JobPostingStatus.DRAFT,
                    ),
                    async (jobPostingData, newStatus) => {
                        const jobPostingRepo =
                            testDataSource.getRepository(JobPosting);

                        // Create and save job posting
                        const jobPosting =
                            jobPostingRepo.create(jobPostingData);
                        const savedJobPosting =
                            await jobPostingRepo.save(jobPosting);

                        const initialUpdatedAt = savedJobPosting.updatedAt;

                        // Wait to ensure timestamp difference
                        await new Promise((resolve) => setTimeout(resolve, 10));

                        // Update the job posting
                        savedJobPosting.status = newStatus;
                        const beforeUpdate = new Date();
                        const updatedJobPosting =
                            await jobPostingRepo.save(savedJobPosting);
                        const afterUpdate = new Date();

                        // Verify updatedAt changed
                        expect(updatedJobPosting.updatedAt).toBeDefined();
                        expect(updatedJobPosting.updatedAt).toBeInstanceOf(
                            Date,
                        );
                        expect(
                            updatedJobPosting.updatedAt.getTime(),
                        ).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
                        expect(
                            updatedJobPosting.updatedAt.getTime(),
                        ).toBeGreaterThanOrEqual(beforeUpdate.getTime() - 1000);
                        expect(
                            updatedJobPosting.updatedAt.getTime(),
                        ).toBeLessThanOrEqual(afterUpdate.getTime() + 1000);

                        // Clean up
                        await jobPostingRepo.remove(updatedJobPosting);
                    },
                ),
                { numRuns: 100 },
            );
        });
    });

    // Property-based tests will be added here in subsequent tasks
    // Task 9.1: Property 3 - Candidate Cascade Delete
    // Task 9.2: Property 4 - JobPosting Cascade Delete
    // Task 9.3: Property 5 - Application Cascade Delete

    // Feature: recruitment-database-entities, Property 3: Candidate Cascade Delete
    // **Validates: Requirements 14.1**
    describe('Property 3: Candidate Cascade Delete', () => {
        it('should cascade delete all related Applications when Candidate is deleted', async () => {
            await fc.assert(
                fc.asyncProperty(
                    candidateArbitrary,
                    jobPostingArbitrary,
                    fc.array(applicationArbitrary, {
                        minLength: 1,
                        maxLength: 5,
                    }),
                    async (candidateData, jobPostingData, applicationsData) => {
                        const candidateRepo =
                            testDataSource.getRepository(Candidate);
                        const jobPostingRepo =
                            testDataSource.getRepository(JobPosting);
                        const applicationRepo =
                            testDataSource.getRepository(Application);

                        // Create and save candidate
                        const candidate = candidateRepo.create(candidateData);
                        const savedCandidate =
                            await candidateRepo.save(candidate);

                        // Create and save job posting
                        const jobPosting =
                            jobPostingRepo.create(jobPostingData);
                        const savedJobPosting =
                            await jobPostingRepo.save(jobPosting);

                        // Create and save applications
                        const applications = applicationsData.map((appData) =>
                            applicationRepo.create({
                                ...appData,
                                candidate: savedCandidate,
                                jobPosting: savedJobPosting,
                            }),
                        );
                        const savedApplications =
                            await applicationRepo.save(applications);
                        const applicationIds = savedApplications.map(
                            (app) => app.id,
                        );

                        // Verify applications exist
                        const beforeDelete = await applicationRepo.countBy({
                            candidate: { id: savedCandidate.id },
                        });
                        expect(beforeDelete).toBe(applicationIds.length);

                        // Delete candidate
                        await candidateRepo.remove(savedCandidate);

                        // Verify all applications were cascade deleted
                        const afterDelete = await applicationRepo.countBy({
                            candidate: { id: savedCandidate.id },
                        });
                        expect(afterDelete).toBe(0);

                        // Clean up job posting
                        await jobPostingRepo.remove(savedJobPosting);
                    },
                ),
                { numRuns: 100 },
            );
        });
    });

    // Feature: recruitment-database-entities, Property 4: JobPosting Cascade Delete
    // **Validates: Requirements 14.2**
    describe('Property 4: JobPosting Cascade Delete', () => {
        it('should cascade delete all related Applications when JobPosting is deleted', async () => {
            await fc.assert(
                fc.asyncProperty(
                    candidateArbitrary,
                    jobPostingArbitrary,
                    fc.array(applicationArbitrary, {
                        minLength: 1,
                        maxLength: 5,
                    }),
                    async (candidateData, jobPostingData, applicationsData) => {
                        const candidateRepo =
                            testDataSource.getRepository(Candidate);
                        const jobPostingRepo =
                            testDataSource.getRepository(JobPosting);
                        const applicationRepo =
                            testDataSource.getRepository(Application);

                        // Create and save candidate
                        const candidate = candidateRepo.create(candidateData);
                        const savedCandidate =
                            await candidateRepo.save(candidate);

                        // Create and save job posting
                        const jobPosting =
                            jobPostingRepo.create(jobPostingData);
                        const savedJobPosting =
                            await jobPostingRepo.save(jobPosting);

                        // Create and save applications
                        const applications = applicationsData.map((appData) =>
                            applicationRepo.create({
                                ...appData,
                                candidate: savedCandidate,
                                jobPosting: savedJobPosting,
                            }),
                        );
                        const savedApplications =
                            await applicationRepo.save(applications);
                        const applicationIds = savedApplications.map(
                            (app) => app.id,
                        );

                        // Verify applications exist
                        const beforeDelete = await applicationRepo.countBy({
                            jobPosting: { id: savedJobPosting.id },
                        });
                        expect(beforeDelete).toBe(applicationIds.length);

                        // Delete job posting
                        await jobPostingRepo.remove(savedJobPosting);

                        // Verify all applications were cascade deleted
                        const afterDelete = await applicationRepo.countBy({
                            jobPosting: { id: savedJobPosting.id },
                        });
                        expect(afterDelete).toBe(0);

                        // Clean up candidate
                        await candidateRepo.remove(savedCandidate);
                    },
                ),
                { numRuns: 100 },
            );
        });
    });

    // Feature: recruitment-database-entities, Property 5: Application Cascade Delete
    // **Validates: Requirements 14.3**
    describe('Property 5: Application Cascade Delete', () => {
        it('should cascade delete all related Interview, Evaluation, and Onboarding records when Application is deleted', async () => {
            await fc.assert(
                fc.asyncProperty(
                    candidateArbitrary,
                    jobPostingArbitrary,
                    applicationArbitrary,
                    fc.array(interviewArbitrary, {
                        minLength: 0,
                        maxLength: 3,
                    }),
                    fc.array(evaluationArbitrary, {
                        minLength: 0,
                        maxLength: 3,
                    }),
                    fc.option(onboardingArbitrary, { nil: null }),
                    async (
                        candidateData,
                        jobPostingData,
                        applicationData,
                        interviewsData,
                        evaluationsData,
                        onboardingData,
                    ) => {
                        const result = await createApplicationWithRelations(
                            candidateData,
                            jobPostingData,
                            applicationData,
                            interviewsData,
                            evaluationsData,
                            onboardingData,
                        );

                        const savedCandidate = result.savedCandidate;
                        const savedJobPosting = result.savedJobPosting;
                        const savedApplication = result.savedApplication;

                        try {
                            await verifyRelatedRecordsExist(
                                savedApplication.id,
                                result.interviewIds,
                                result.evaluationIds,
                                result.onboardingId,
                            );

                            const candidateRepo =
                                testDataSource.getRepository(Candidate);
                            const jobPostingRepo =
                                testDataSource.getRepository(JobPosting);
                            const applicationRepo =
                                testDataSource.getRepository(Application);

                            await applicationRepo.remove(savedApplication);

                            await verifyRelatedRecordsDeleted(
                                savedApplication.id,
                                result.onboardingId,
                            );

                            await candidateRepo.remove(savedCandidate);
                            await jobPostingRepo.remove(savedJobPosting);
                        } catch (error) {
                            const candidateRepo =
                                testDataSource.getRepository(Candidate);
                            const jobPostingRepo =
                                testDataSource.getRepository(JobPosting);
                            try {
                                await cleanupEntities(
                                    savedApplication,
                                    savedCandidate,
                                    savedJobPosting,
                                );
                            } catch (cleanupError) {
                                console.error('Cleanup failed:', cleanupError);
                            }
                            throw error;
                        }
                    },
                ),
                { numRuns: 100 },
            );
        }, 30000);
    });
});
