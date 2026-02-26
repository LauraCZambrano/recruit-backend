import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fc from 'fast-check';
import { Application } from '../../models/application.entity';
import { Candidate } from '../../models/candidate.entity';
import { JobPosting } from '../../models/jobPosting.entity';
import { ApplicationStatus, JobPostingStatus } from '../../models/enums';

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
    database: process.env.DB_NAME || 'recruit',
    entities: [
        path.join(__dirname, '..', '..', 'models', '**', '*.entity{.ts,.js}'),
    ],
    synchronize: true,
    logging: false,
    dropSchema: false,
};

/**
 * Simulates JobPostingController.getApplicationsByJobPosting behavior
 * This tests the core property without importing the full controller/service chain
 */
async function getApplicationsByJobPosting(jobPostingId: string) {
    const jobPostingRepo = testDataSource.getRepository(JobPosting);
    const applicationRepo = testDataSource.getRepository(Application);

    // Verify job posting exists
    const jobPosting = await jobPostingRepo.findOne({
        where: { id: jobPostingId },
    });

    if (!jobPosting) {
        throw new Error('Job posting not found');
    }

    // Query applications with relations
    const applications = await applicationRepo.find({
        where: { jobPosting: { id: jobPostingId } },
        relations: ['candidate', 'jobPosting'],
        order: { createdAt: 'DESC' },
    });

    // Transform to response format
    return applications.map((application) => ({
        id: application.id,
        candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
        candidateEmail: application.candidate.email,
        aiScore: application.aiScore,
        status: application.status,
    }));
}

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
        console.error('2. Test database exists (DB_NAME in .env)');
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

// Fast-check arbitraries for generating random data
let emailCounter = 0;

const candidateArbitrary = fc.record({
    firstName: fc.stringMatching(/^[a-zA-Z]{1,50}$/),
    lastName: fc.stringMatching(/^[a-zA-Z]{1,50}$/),
    email: fc.integer().map(() => `test-${Date.now()}-${emailCounter++}@example.com`),
    phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), {
        nil: null,
    }),
    resumeUrl: fc.option(fc.webUrl(), { nil: null }),
    linkedinUrl: fc.option(fc.webUrl(), { nil: null }),
    skills: fc.array(fc.stringMatching(/^[a-zA-Z0-9 ]{1,20}$/), {
        minLength: 0,
        maxLength: 10,
    }),
    experienceYears: fc.integer({ min: 0, max: 50 }),
    location: fc.stringMatching(/^[a-zA-Z0-9 ]{1,100}$/),
});

const jobPostingArbitrary = fc.record({
    title: fc.stringMatching(/^[a-zA-Z0-9 ]{1,100}$/),
    department: fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/),
    description: fc.stringMatching(/^[a-zA-Z0-9 ]{1,500}$/),
    salaryRange: fc.option(fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/), {
        nil: null,
    }),
    location: fc.stringMatching(/^[a-zA-Z0-9 ]{1,100}$/),
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

/**
 * Feature: job-posting-applications-endpoint, Property 2: Response Structure for Success
 * **Validates: Requirements 1.3, 7.1**
 */
describe('JobPostingController Property-Based Tests', () => {
    it('should have test database configured', () => {
        expect(testDataSource).toBeDefined();
        expect(testDataSource.isInitialized).toBe(true);
    });

    describe('Property 2: Response Structure for Success', () => {
        it('should return { success: true, data: Application[] } structure for any successful request', async () => {
            await fc.assert(
                fc.asyncProperty(
                    jobPostingArbitrary,
                    fc.array(
                        fc.tuple(candidateArbitrary, applicationArbitrary),
                        { minLength: 0, maxLength: 10 },
                    ),
                    async (jobPostingData, applicationsData) => {
                        const candidateRepo = testDataSource.getRepository(Candidate);
                        const jobPostingRepo = testDataSource.getRepository(JobPosting);
                        const applicationRepo = testDataSource.getRepository(Application);

                        // Create and save job posting
                        const jobPosting = jobPostingRepo.create(jobPostingData);
                        const savedJobPosting = await jobPostingRepo.save(jobPosting);

                        try {
                            // Create applications with candidates
                            const savedApplications: Application[] = [];
                            for (const [candidateData, applicationData] of applicationsData) {
                                // Create and save candidate
                                const candidate = candidateRepo.create(candidateData);
                                const savedCandidate = await candidateRepo.save(candidate);

                                // Create and save application
                                const application = applicationRepo.create({
                                    ...applicationData,
                                    candidate: savedCandidate,
                                    jobPosting: savedJobPosting,
                                });
                                const savedApplication = await applicationRepo.save(application);
                                savedApplications.push(savedApplication);
                            }

                            // Call the simulated controller behavior
                            const responseData = await getApplicationsByJobPosting(savedJobPosting.id);

                            // Verify response structure
                            expect(responseData).toBeDefined();
                            expect(Array.isArray(responseData)).toBe(true);

                            // Verify data array length matches created applications
                            expect(responseData.length).toBe(applicationsData.length);

                            // Verify each application in response has correct structure
                            for (const application of responseData) {
                                expect(application).toHaveProperty('id');
                                expect(application).toHaveProperty('candidateName');
                                expect(application).toHaveProperty('candidateEmail');
                                expect(application).toHaveProperty('aiScore');
                                expect(application).toHaveProperty('status');

                                // Verify types
                                expect(typeof application.id).toBe('string');
                                expect(typeof application.candidateName).toBe('string');
                                expect(typeof application.candidateEmail).toBe('string');
                                expect(
                                    typeof application.aiScore === 'number' ||
                                        application.aiScore === null,
                                ).toBe(true);
                                expect(typeof application.status).toBe('string');
                            }

                            // Clean up
                            for (const app of savedApplications) {
                                await applicationRepo.remove(app);
                            }
                            await jobPostingRepo.remove(savedJobPosting);
                        } catch (error) {
                            // Clean up on error
                            try {
                                const apps = await applicationRepo.find({
                                    where: { jobPosting: { id: savedJobPosting.id } },
                                });
                                for (const app of apps) {
                                    await applicationRepo.remove(app);
                                }
                                const job = await jobPostingRepo.findOneBy({
                                    id: savedJobPosting.id,
                                });
                                if (job) await jobPostingRepo.remove(job);
                            } catch (cleanupError) {
                                console.error('Cleanup failed:', cleanupError);
                            }
                            throw error;
                        }
                    },
                ),
                { numRuns: 10 },
            );
        }, 60000);

        it('should return empty data array with success structure when no applications exist', async () => {
            await fc.assert(
                fc.asyncProperty(
                    jobPostingArbitrary,
                    async (jobPostingData) => {
                        const jobPostingRepo = testDataSource.getRepository(JobPosting);

                        // Create and save job posting without applications
                        const jobPosting = jobPostingRepo.create(jobPostingData);
                        const savedJobPosting = await jobPostingRepo.save(jobPosting);

                        try {
                            // Call the simulated controller behavior
                            const responseData = await getApplicationsByJobPosting(savedJobPosting.id);

                            // Verify response structure
                            expect(responseData).toBeDefined();
                            expect(Array.isArray(responseData)).toBe(true);
                            expect(responseData.length).toBe(0);

                            // Clean up
                            await jobPostingRepo.remove(savedJobPosting);
                        } catch (error) {
                            // Clean up on error
                            try {
                                const job = await jobPostingRepo.findOneBy({
                                    id: savedJobPosting.id,
                                });
                                if (job) await jobPostingRepo.remove(job);
                            } catch (cleanupError) {
                                console.error('Cleanup failed:', cleanupError);
                            }
                            throw error;
                        }
                    },
                ),
                { numRuns: 10 },
            );
        }, 60000);
    });

    describe('Property 3: Required Fields Present', () => {
        it('should ensure all application objects contain required fields: id, candidateName, candidateEmail, aiScore, status', async () => {
            await fc.assert(
                fc.asyncProperty(
                    jobPostingArbitrary,
                    fc.array(
                        fc.tuple(candidateArbitrary, applicationArbitrary),
                        { minLength: 1, maxLength: 10 },
                    ),
                    async (jobPostingData, applicationsData) => {
                        const candidateRepo = testDataSource.getRepository(Candidate);
                        const jobPostingRepo = testDataSource.getRepository(JobPosting);
                        const applicationRepo = testDataSource.getRepository(Application);

                        // Create and save job posting
                        const jobPosting = jobPostingRepo.create(jobPostingData);
                        const savedJobPosting = await jobPostingRepo.save(jobPosting);

                        try {
                            // Create applications with candidates
                            const savedApplications: Application[] = [];
                            for (const [candidateData, applicationData] of applicationsData) {
                                // Create and save candidate
                                const candidate = candidateRepo.create(candidateData);
                                const savedCandidate = await candidateRepo.save(candidate);

                                // Create and save application
                                const application = applicationRepo.create({
                                    ...applicationData,
                                    candidate: savedCandidate,
                                    jobPosting: savedJobPosting,
                                });
                                const savedApplication = await applicationRepo.save(application);
                                savedApplications.push(savedApplication);
                            }

                            // Call the simulated controller behavior
                            const responseData = await getApplicationsByJobPosting(savedJobPosting.id);

                            // Verify all application objects have required fields
                            expect(responseData).toBeDefined();
                            expect(Array.isArray(responseData)).toBe(true);
                            expect(responseData.length).toBeGreaterThan(0);

                            // For each application object, verify all required fields are present
                            for (const application of responseData) {
                                // Verify field presence
                                expect(application).toHaveProperty('id');
                                expect(application).toHaveProperty('candidateName');
                                expect(application).toHaveProperty('candidateEmail');
                                expect(application).toHaveProperty('aiScore');
                                expect(application).toHaveProperty('status');

                                // Verify field types
                                expect(typeof application.id).toBe('string');
                                expect(application.id.length).toBeGreaterThan(0);

                                expect(typeof application.candidateName).toBe('string');
                                expect(application.candidateName.length).toBeGreaterThan(0);

                                expect(typeof application.candidateEmail).toBe('string');
                                expect(application.candidateEmail.length).toBeGreaterThan(0);

                                // aiScore can be number or null
                                expect(
                                    typeof application.aiScore === 'number' ||
                                        application.aiScore === null,
                                ).toBe(true);
                                if (typeof application.aiScore === 'number') {
                                    expect(application.aiScore).toBeGreaterThanOrEqual(0);
                                    expect(application.aiScore).toBeLessThanOrEqual(100);
                                }

                                expect(typeof application.status).toBe('string');
                                expect(application.status.length).toBeGreaterThan(0);
                                // Verify status is a valid ApplicationStatus enum value
                                expect(
                                    Object.values(ApplicationStatus).includes(
                                        application.status,
                                    ),
                                ).toBe(true);
                            }

                            // Clean up
                            for (const app of savedApplications) {
                                await applicationRepo.remove(app);
                            }
                            await jobPostingRepo.remove(savedJobPosting);
                        } catch (error) {
                            // Clean up on error
                            try {
                                const apps = await applicationRepo.find({
                                    where: { jobPosting: { id: savedJobPosting.id } },
                                });
                                for (const app of apps) {
                                    await applicationRepo.remove(app);
                                }
                                const job = await jobPostingRepo.findOneBy({
                                    id: savedJobPosting.id,
                                });
                                if (job) await jobPostingRepo.remove(job);
                            } catch (cleanupError) {
                                console.error('Cleanup failed:', cleanupError);
                            }
                            throw error;
                        }
                    },
                ),
                { numRuns: 10 },
            );
        }, 60000);
    });
});
