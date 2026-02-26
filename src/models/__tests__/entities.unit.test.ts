import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Candidate } from '../candidate.entity.js';
import { JobPosting } from '../jobPosting.entity.js';
import { Application } from '../application.entity.js';
import { Interview } from '../interview.entity.js';
import { Evaluation } from '../evaluation.entity.js';
import { Offer } from '../offer.entity.js';
import { Onboarding } from '../onboarding.entity.js';
import { TalentPool } from '../talentPool.entity.js';
import { Referral } from '../referral.entity.js';
import { Requisition } from '../requisition.entity.js';
import {
    JobPostingStatus,
    ApplicationStatus,
    InterviewType,
    OnboardingStatus,
    ReferralStatus,
    RequisitionStatus,
} from '../enums.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test database configuration - uses main database like property tests
const testDbConfig: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '0000',
    database: process.env.DB_NAME || 'recruit',
    entities: [path.join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    synchronize: true,
    logging: false,
    dropSchema: false,
};

let testDataSource: DataSource;

// Initialize test database before all tests
beforeAll(async () => {
    testDataSource = new DataSource(testDbConfig);
    await testDataSource.initialize();

    // Clean database before starting tests
    const entities = testDataSource.entityMetadatas;
    for (const entity of [...entities].reverse()) {
        const repository = testDataSource.getRepository(entity.name);
        await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }
});

// Clean up database after each test
afterEach(async () => {
    if (testDataSource?.isInitialized) {
        const entities = testDataSource.entityMetadatas;

        // Use TRUNCATE CASCADE to handle foreign key constraints
        for (const entity of [...entities].reverse()) {
            const repository = testDataSource.getRepository(entity.name);
            await repository.query(
                `TRUNCATE TABLE "${entity.tableName}" CASCADE;`,
            );
        }
    }
});

// Close database connection after all tests
afterAll(async () => {
    if (testDataSource?.isInitialized) {
        await testDataSource.destroy();
    }
});

describe('Entity Unit Tests', () => {
    describe('Candidate Entity', () => {
        it('should create a candidate with valid data', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);

            const candidate = candidateRepo.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1234567890',
                resumeUrl: 'https://example.com/resume.pdf',
                linkedinUrl: 'https://linkedin.com/in/johndoe',
                skills: ['JavaScript', 'TypeScript', 'Node.js'],
                experienceYears: 5,
                location: 'New York, NY',
            });

            const saved = await candidateRepo.save(candidate);

            expect(saved.id).toBeDefined();
            expect(saved.firstName).toBe('John');
            expect(saved.lastName).toBe('Doe');
            expect(saved.email).toBe('john.doe@example.com');
            expect(saved.skills).toEqual([
                'JavaScript',
                'TypeScript',
                'Node.js',
            ]);
            expect(saved.experienceYears).toBe(5);
            expect(saved.createdAt).toBeInstanceOf(Date);
            expect(saved.updatedAt).toBeInstanceOf(Date);
        });

        it('should enforce unique email constraint', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);

            const candidate1 = candidateRepo.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'duplicate@example.com',
                skills: [],
                experienceYears: 5,
                location: 'New York',
            });
            await candidateRepo.save(candidate1);

            const candidate2 = candidateRepo.create({
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'duplicate@example.com',
                skills: [],
                experienceYears: 3,
                location: 'Boston',
            });

            await expect(candidateRepo.save(candidate2)).rejects.toThrow();
        });

        it('should handle empty skills array', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);

            const candidate = candidateRepo.create({
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                skills: [],
                experienceYears: 2,
                location: 'Boston, MA',
            });

            const saved = await candidateRepo.save(candidate);
            expect(saved.skills).toEqual([]);
        });

        it('should handle null optional fields', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);

            const candidate = candidateRepo.create({
                firstName: 'Bob',
                lastName: 'Johnson',
                email: 'bob.johnson@example.com',
                phone: null,
                resumeUrl: null,
                linkedinUrl: null,
                skills: ['Python'],
                experienceYears: 1,
                location: 'Chicago, IL',
            });

            const saved = await candidateRepo.save(candidate);
            expect(saved.phone).toBeNull();
            expect(saved.resumeUrl).toBeNull();
            expect(saved.linkedinUrl).toBeNull();
        });
    });

    describe('JobPosting Entity', () => {
        it('should create a job posting with valid data', async () => {
            const jobPostingRepo = testDataSource.getRepository(JobPosting);

            const jobPosting = jobPostingRepo.create({
                title: 'Senior Software Engineer',
                department: 'Engineering',
                description:
                    'We are looking for an experienced software engineer...',
                salaryRange: '$120,000 - $150,000',
                location: 'Remote',
                status: JobPostingStatus.OPEN,
            });

            const saved = await jobPostingRepo.save(jobPosting);

            expect(saved.id).toBeDefined();
            expect(saved.title).toBe('Senior Software Engineer');
            expect(saved.status).toBe(JobPostingStatus.OPEN);
            expect(saved.createdAt).toBeInstanceOf(Date);
            expect(saved.updatedAt).toBeInstanceOf(Date);
        });

        it('should validate enum values for status', async () => {
            const jobPostingRepo = testDataSource.getRepository(JobPosting);

            const validStatuses = [
                JobPostingStatus.OPEN,
                JobPostingStatus.CLOSED,
                JobPostingStatus.DRAFT,
            ];

            for (const status of validStatuses) {
                const jobPosting = jobPostingRepo.create({
                    title: `Job ${status}`,
                    department: 'Engineering',
                    description: 'Description',
                    location: 'Remote',
                    status,
                });
                const saved = await jobPostingRepo.save(jobPosting);
                expect(saved.status).toBe(status);
            }
        });

        it('should handle null salaryRange', async () => {
            const jobPostingRepo = testDataSource.getRepository(JobPosting);

            const jobPosting = jobPostingRepo.create({
                title: 'Junior Developer',
                department: 'Engineering',
                description: 'Entry level position',
                salaryRange: null,
                location: 'New York',
                status: JobPostingStatus.DRAFT,
            });

            const saved = await jobPostingRepo.save(jobPosting);
            expect(saved.salaryRange).toBeNull();
        });
    });

    describe('Application Entity', () => {
        it('should create an application with relationships', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'Alice',
                    lastName: 'Williams',
                    email: 'alice.williams@example.com',
                    skills: ['React', 'Vue'],
                    experienceYears: 4,
                    location: 'Seattle',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Frontend Developer',
                    department: 'Engineering',
                    description: 'Frontend position',
                    location: 'Seattle',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const application = applicationRepo.create({
                status: ApplicationStatus.NEW,
                aiScore: 85.5,
                aiSummary: 'Strong candidate with relevant experience',
                candidate,
                jobPosting,
            });

            const saved = await applicationRepo.save(application);

            expect(saved.id).toBeDefined();
            expect(saved.status).toBe(ApplicationStatus.NEW);
            expect(saved.aiScore).toBe(85.5);
            expect(saved.aiSummary).toBe(
                'Strong candidate with relevant experience',
            );
        });

        it('should validate all application status enum values', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);

            const statuses = [
                ApplicationStatus.NEW,
                ApplicationStatus.SCREENED,
                ApplicationStatus.INTERVIEWED,
                ApplicationStatus.OFFERED,
                ApplicationStatus.HIRED,
                ApplicationStatus.REJECTED,
            ];

            for (let i = 0; i < statuses.length; i++) {
                const status = statuses[i];

                const candidate = await candidateRepo.save(
                    candidateRepo.create({
                        firstName: 'Test',
                        lastName: 'User',
                        email: `test.enum.${i}@example.com`,
                        skills: [],
                        experienceYears: 1,
                        location: 'Test',
                    }),
                );

                const jobPosting = await jobPostingRepo.save(
                    jobPostingRepo.create({
                        title: `Test Job ${i}`,
                        department: 'Test',
                        description: 'Test',
                        location: 'Test',
                        status: JobPostingStatus.OPEN,
                    }),
                );

                const application = applicationRepo.create({
                    status,
                    candidate,
                    jobPosting,
                });
                const saved = await applicationRepo.save(application);
                expect(saved.status).toBe(status);
            }
        });

        it('should handle null AI fields', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'No',
                    lastName: 'AI',
                    email: 'no.ai@example.com',
                    skills: [],
                    experienceYears: 1,
                    location: 'Test',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Test Job',
                    department: 'Test',
                    description: 'Test',
                    location: 'Test',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const application = applicationRepo.create({
                status: ApplicationStatus.NEW,
                aiScore: null,
                aiSummary: null,
                candidate,
                jobPosting,
            });

            const saved = await applicationRepo.save(application);
            expect(saved.aiScore).toBeNull();
            expect(saved.aiSummary).toBeNull();
        });

        it('should load candidate relationship', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'Relation',
                    lastName: 'Test',
                    email: 'relation.test@example.com',
                    skills: [],
                    experienceYears: 1,
                    location: 'Test',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Test Job',
                    department: 'Test',
                    description: 'Test',
                    location: 'Test',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const application = await applicationRepo.save(
                applicationRepo.create({
                    status: ApplicationStatus.NEW,
                    candidate,
                    jobPosting,
                }),
            );

            const loaded = await applicationRepo.findOne({
                where: { id: application.id },
                relations: ['candidate', 'jobPosting'],
            });

            expect(loaded).toBeDefined();
            expect(loaded?.candidate.email).toBe('relation.test@example.com');
            expect(loaded?.jobPosting.title).toBe('Test Job');
        });
    });

    describe('Interview Entity', () => {
        it('should create an interview with valid data', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);
            const interviewRepo = testDataSource.getRepository(Interview);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'Interview',
                    lastName: 'Candidate',
                    email: 'interview.candidate@example.com',
                    skills: [],
                    experienceYears: 3,
                    location: 'Test',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Test Job',
                    department: 'Test',
                    description: 'Test',
                    location: 'Test',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const application = await applicationRepo.save(
                applicationRepo.create({
                    status: ApplicationStatus.SCREENED,
                    candidate,
                    jobPosting,
                }),
            );

            const scheduledDate = new Date('2024-12-31T10:00:00Z');
            const interview = interviewRepo.create({
                type: InterviewType.TECHNICAL,
                scheduledAt: scheduledDate,
                notes: 'Technical interview with senior engineer',
                score: 85,
                application,
            });

            const saved = await interviewRepo.save(interview);

            expect(saved.id).toBeDefined();
            expect(saved.type).toBe(InterviewType.TECHNICAL);
            expect(saved.scheduledAt).toEqual(scheduledDate);
            expect(saved.notes).toBe(
                'Technical interview with senior engineer',
            );
            expect(saved.score).toBe(85);
        });

        it('should validate interview type enum', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);
            const interviewRepo = testDataSource.getRepository(Interview);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'Type',
                    lastName: 'Test',
                    email: 'type.test@example.com',
                    skills: [],
                    experienceYears: 1,
                    location: 'Test',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Test Job',
                    department: 'Test',
                    description: 'Test',
                    location: 'Test',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const application = await applicationRepo.save(
                applicationRepo.create({
                    status: ApplicationStatus.SCREENED,
                    candidate,
                    jobPosting,
                }),
            );

            const types = [
                InterviewType.SCREENING,
                InterviewType.TECHNICAL,
                InterviewType.FINAL,
            ];

            for (const type of types) {
                const interview = interviewRepo.create({
                    type,
                    scheduledAt: new Date(),
                    application,
                });
                const saved = await interviewRepo.save(interview);
                expect(saved.type).toBe(type);
                await interviewRepo.remove(saved);
            }
        });
    });

    describe('Evaluation Entity', () => {
        it('should create an evaluation with valid data', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);
            const evaluationRepo = testDataSource.getRepository(Evaluation);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'Eval',
                    lastName: 'Candidate',
                    email: 'eval.candidate@example.com',
                    skills: [],
                    experienceYears: 2,
                    location: 'Test',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Test Job',
                    department: 'Test',
                    description: 'Test',
                    location: 'Test',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const application = await applicationRepo.save(
                applicationRepo.create({
                    status: ApplicationStatus.INTERVIEWED,
                    candidate,
                    jobPosting,
                }),
            );

            const evaluation = evaluationRepo.create({
                category: 'Technical Skills',
                score: 90,
                feedback: 'Excellent problem-solving abilities',
                application,
            });

            const saved = await evaluationRepo.save(evaluation);

            expect(saved.id).toBeDefined();
            expect(saved.category).toBe('Technical Skills');
            expect(saved.score).toBe(90);
            expect(saved.feedback).toBe('Excellent problem-solving abilities');
        });

        it('should handle null feedback', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);
            const evaluationRepo = testDataSource.getRepository(Evaluation);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'No',
                    lastName: 'Feedback',
                    email: 'no.feedback@example.com',
                    skills: [],
                    experienceYears: 1,
                    location: 'Test',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Test Job',
                    department: 'Test',
                    description: 'Test',
                    location: 'Test',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const application = await applicationRepo.save(
                applicationRepo.create({
                    status: ApplicationStatus.INTERVIEWED,
                    candidate,
                    jobPosting,
                }),
            );

            const evaluation = evaluationRepo.create({
                category: 'Communication',
                score: 75,
                feedback: null,
                application,
            });

            const saved = await evaluationRepo.save(evaluation);
            expect(saved.feedback).toBeNull();
        });
    });

    describe('Offer Entity', () => {
        it('should create an offer with valid data', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);
            const offerRepo = testDataSource.getRepository(Offer);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'Offer',
                    lastName: 'Candidate',
                    email: 'offer.candidate@example.com',
                    skills: [],
                    experienceYears: 5,
                    location: 'Test',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Test Job',
                    department: 'Test',
                    description: 'Test',
                    location: 'Test',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const application = await applicationRepo.save(
                applicationRepo.create({
                    status: ApplicationStatus.OFFERED,
                    candidate,
                    jobPosting,
                }),
            );

            const startDate = new Date('2025-01-15');
            const offer = offerRepo.create({
                salary: 120000,
                benefits: 'Health insurance, 401k, unlimited PTO',
                startDate,
                application,
            });

            const saved = await offerRepo.save(offer);

            expect(saved.id).toBeDefined();
            expect(Number(saved.salary)).toBe(120000);
            expect(saved.benefits).toBe(
                'Health insurance, 401k, unlimited PTO',
            );
            expect(saved.startDate).toEqual(startDate);
        });

        it('should handle null benefits', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);
            const offerRepo = testDataSource.getRepository(Offer);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'No',
                    lastName: 'Benefits',
                    email: 'no.benefits@example.com',
                    skills: [],
                    experienceYears: 1,
                    location: 'Test',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Test Job',
                    department: 'Test',
                    description: 'Test',
                    location: 'Test',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const application = await applicationRepo.save(
                applicationRepo.create({
                    status: ApplicationStatus.OFFERED,
                    candidate,
                    jobPosting,
                }),
            );

            const offer = offerRepo.create({
                salary: 80000,
                benefits: null,
                startDate: new Date('2025-02-01'),
                application,
            });

            const saved = await offerRepo.save(offer);
            expect(saved.benefits).toBeNull();
        });
    });

    describe('Onboarding Entity', () => {
        it('should create an onboarding with JSONB tasks', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);
            const onboardingRepo = testDataSource.getRepository(Onboarding);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'Onboard',
                    lastName: 'Candidate',
                    email: 'onboard.candidate@example.com',
                    skills: [],
                    experienceYears: 3,
                    location: 'Test',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Test Job',
                    department: 'Test',
                    description: 'Test',
                    location: 'Test',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const application = await applicationRepo.save(
                applicationRepo.create({
                    status: ApplicationStatus.HIRED,
                    candidate,
                    jobPosting,
                }),
            );

            const tasks = {
                'setup-workstation': {
                    completed: false,
                    dueDate: '2025-01-20',
                },
                'complete-paperwork': {
                    completed: false,
                    dueDate: '2025-01-18',
                },
                'attend-orientation': {
                    completed: false,
                    dueDate: '2025-01-22',
                },
            };

            const onboarding = onboardingRepo.create({
                tasks,
                status: OnboardingStatus.PENDING,
                application,
            });

            const saved = await onboardingRepo.save(onboarding);

            expect(saved.id).toBeDefined();
            expect(saved.tasks).toEqual(tasks);
            expect(saved.status).toBe(OnboardingStatus.PENDING);
        });

        it('should validate onboarding status enum', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const applicationRepo = testDataSource.getRepository(Application);
            const onboardingRepo = testDataSource.getRepository(Onboarding);

            const statuses = [
                OnboardingStatus.PENDING,
                OnboardingStatus.IN_PROGRESS,
                OnboardingStatus.COMPLETED,
            ];

            for (const status of statuses) {
                const candidate = await candidateRepo.save(
                    candidateRepo.create({
                        firstName: 'Status',
                        lastName: 'Test',
                        email: `status.${status}@example.com`,
                        skills: [],
                        experienceYears: 1,
                        location: 'Test',
                    }),
                );

                const jobPosting = await jobPostingRepo.save(
                    jobPostingRepo.create({
                        title: 'Test Job',
                        department: 'Test',
                        description: 'Test',
                        location: 'Test',
                        status: JobPostingStatus.OPEN,
                    }),
                );

                const application = await applicationRepo.save(
                    applicationRepo.create({
                        status: ApplicationStatus.HIRED,
                        candidate,
                        jobPosting,
                    }),
                );

                const onboarding = onboardingRepo.create({
                    tasks: {},
                    status,
                    application,
                });

                const saved = await onboardingRepo.save(onboarding);
                expect(saved.status).toBe(status);
            }
        });
    });

    describe('TalentPool Entity', () => {
        it('should create a talent pool with valid data', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const talentPoolRepo = testDataSource.getRepository(TalentPool);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'Pool',
                    lastName: 'Candidate',
                    email: 'pool.candidate@example.com',
                    skills: ['Java', 'Spring'],
                    experienceYears: 6,
                    location: 'Test',
                }),
            );

            const talentPool = talentPoolRepo.create({
                name: 'Senior Java Developers',
                description: 'Experienced Java developers for future projects',
                candidate,
            });

            const saved = await talentPoolRepo.save(talentPool);

            expect(saved.id).toBeDefined();
            expect(saved.name).toBe('Senior Java Developers');
            expect(saved.description).toBe(
                'Experienced Java developers for future projects',
            );
        });

        it('should handle null description', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const talentPoolRepo = testDataSource.getRepository(TalentPool);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'No',
                    lastName: 'Description',
                    email: 'no.description@example.com',
                    skills: [],
                    experienceYears: 1,
                    location: 'Test',
                }),
            );

            const talentPool = talentPoolRepo.create({
                name: 'General Pool',
                description: null,
                candidate,
            });

            const saved = await talentPoolRepo.save(talentPool);
            expect(saved.description).toBeNull();
        });
    });

    describe('Referral Entity', () => {
        it('should create a referral with valid data', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const referralRepo = testDataSource.getRepository(Referral);

            const candidate = await candidateRepo.save(
                candidateRepo.create({
                    firstName: 'Referred',
                    lastName: 'Candidate',
                    email: 'referred.candidate@example.com',
                    skills: ['Python', 'Django'],
                    experienceYears: 4,
                    location: 'Test',
                }),
            );

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Backend Developer',
                    department: 'Engineering',
                    description: 'Backend position',
                    location: 'Remote',
                    status: JobPostingStatus.OPEN,
                }),
            );

            const referrerId = '123e4567-e89b-12d3-a456-426614174000';
            const referral = referralRepo.create({
                referrerId,
                status: ReferralStatus.PENDING,
                candidate,
                jobPosting,
            });

            const saved = await referralRepo.save(referral);

            expect(saved.id).toBeDefined();
            expect(saved.referrerId).toBe(referrerId);
            expect(saved.status).toBe(ReferralStatus.PENDING);
        });

        it('should validate referral status enum', async () => {
            const candidateRepo = testDataSource.getRepository(Candidate);
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const referralRepo = testDataSource.getRepository(Referral);

            const statuses = [
                ReferralStatus.PENDING,
                ReferralStatus.ACCEPTED,
                ReferralStatus.REJECTED,
            ];

            for (const status of statuses) {
                const candidate = await candidateRepo.save(
                    candidateRepo.create({
                        firstName: 'Referral',
                        lastName: 'Status',
                        email: `referral.${status}@example.com`,
                        skills: [],
                        experienceYears: 1,
                        location: 'Test',
                    }),
                );

                const jobPosting = await jobPostingRepo.save(
                    jobPostingRepo.create({
                        title: 'Test Job',
                        department: 'Test',
                        description: 'Test',
                        location: 'Test',
                        status: JobPostingStatus.OPEN,
                    }),
                );

                const referral = referralRepo.create({
                    referrerId: '123e4567-e89b-12d3-a456-426614174000',
                    status,
                    candidate,
                    jobPosting,
                });

                const saved = await referralRepo.save(referral);
                expect(saved.status).toBe(status);
            }
        });
    });

    describe('Requisition Entity', () => {
        it('should create a requisition with valid data', async () => {
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const requisitionRepo = testDataSource.getRepository(Requisition);

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Data Scientist',
                    department: 'Analytics',
                    description: 'Data science position',
                    location: 'San Francisco',
                    status: JobPostingStatus.DRAFT,
                }),
            );

            const requisition = requisitionRepo.create({
                requestedBy: 'John Manager',
                justification:
                    'Need to expand analytics team to handle increased data volume',
                status: RequisitionStatus.PENDING,
                jobPosting,
            });

            const saved = await requisitionRepo.save(requisition);

            expect(saved.id).toBeDefined();
            expect(saved.requestedBy).toBe('John Manager');
            expect(saved.justification).toBe(
                'Need to expand analytics team to handle increased data volume',
            );
            expect(saved.status).toBe(RequisitionStatus.PENDING);
        });

        it('should validate requisition status enum', async () => {
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const requisitionRepo = testDataSource.getRepository(Requisition);

            const statuses = [
                RequisitionStatus.PENDING,
                RequisitionStatus.APPROVED,
                RequisitionStatus.REJECTED,
            ];

            for (const status of statuses) {
                const jobPosting = await jobPostingRepo.save(
                    jobPostingRepo.create({
                        title: `Job ${status}`,
                        department: 'Test',
                        description: 'Test',
                        location: 'Test',
                        status: JobPostingStatus.DRAFT,
                    }),
                );

                const requisition = requisitionRepo.create({
                    requestedBy: 'Test Manager',
                    justification: 'Test justification',
                    status,
                    jobPosting,
                });

                const saved = await requisitionRepo.save(requisition);
                expect(saved.status).toBe(status);
            }
        });

        it('should load jobPosting relationship', async () => {
            const jobPostingRepo = testDataSource.getRepository(JobPosting);
            const requisitionRepo = testDataSource.getRepository(Requisition);

            const jobPosting = await jobPostingRepo.save(
                jobPostingRepo.create({
                    title: 'Relationship Test Job',
                    department: 'Test',
                    description: 'Test',
                    location: 'Test',
                    status: JobPostingStatus.DRAFT,
                }),
            );

            const requisition = await requisitionRepo.save(
                requisitionRepo.create({
                    requestedBy: 'Test Manager',
                    justification: 'Test',
                    status: RequisitionStatus.PENDING,
                    jobPosting,
                }),
            );

            const loaded = await requisitionRepo.findOne({
                where: { id: requisition.id },
                relations: ['jobPosting'],
            });

            expect(loaded).toBeDefined();
            expect(loaded?.jobPosting.title).toBe('Relationship Test Job');
        });
    });
});
