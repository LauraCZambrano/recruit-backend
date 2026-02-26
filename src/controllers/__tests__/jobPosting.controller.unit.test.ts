import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Mock logger first
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.unstable_mockModule('../../utils/pino', () => ({
    default: {
        info: mockLoggerInfo,
        error: mockLoggerError,
    },
}));

// Mock db loader to prevent config loading
jest.unstable_mockModule('../../loaders/db', () => ({
    AppDataSource: {
        getRepository: jest.fn(),
        isInitialized: true,
    },
}));

// Mock ApplicationService
const mockGetApplicationsByJobPosting = jest.fn<() => Promise<any[]>>();
const mockGetApplicationService = jest.fn(() => ({
    getApplicationsByJobPosting: mockGetApplicationsByJobPosting,
}));

jest.unstable_mockModule('../../services/application.service', () => ({
    getApplicationService: mockGetApplicationService,
}));

// Import modules after mocks are set up
const { default: AppError } = await import('../../utils/appError');
const { getJobPostingController } = await import('../jobPosting.controller');

/**
 * Unit Tests for JobPostingController.getApplicationsByJobPosting
 * **Validates: Requirements 1.3, 1.4, 1.5, 3.2, 4.1, 4.2**
 */
describe('JobPostingController.getApplicationsByJobPosting Unit Tests', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let controller: ReturnType<typeof getJobPostingController>;

    // Helper to create a mock application with candidate data
    const createMockApplication = (overrides = {}) => ({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'NEW',
        aiScore: 85,
        aiSummary: 'Strong candidate with relevant experience',
        candidate: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            resumeUrl: 'https://example.com/resume.pdf',
            linkedinUrl: 'https://linkedin.com/in/johndoe',
            skills: ['JavaScript', 'TypeScript'],
            experienceYears: 5,
            location: 'New York',
            createdAt: new Date('2024-01-10T10:00:00Z'),
            updatedAt: new Date('2024-01-10T10:00:00Z'),
        },
        jobPosting: {
            id: '123e4567-e89b-12d3-a456-426614174002',
            title: 'Senior Developer',
            department: 'Engineering',
            description: 'Looking for a senior developer',
            location: 'New York',
            status: 'OPEN',
            salaryRange: '$100k-$150k',
            createdAt: new Date('2024-01-01T10:00:00Z'),
            updatedAt: new Date('2024-01-01T10:00:00Z'),
        },
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
        ...overrides,
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup request mock
        req = {
            params: {
                id: '123e4567-e89b-12d3-a456-426614174002',
            },
        };

        // Setup response mock with proper chaining
        const jsonMock = jest.fn();
        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        res = {
            status: statusMock as unknown as Response['status'],
            json: jsonMock as unknown as Response['json'],
        };

        // Setup next mock
        next = jest.fn();

        // Get controller instance
        controller = getJobPostingController();
    });

    /**
     * Test: Successful retrieval with mock service
     * **Validates: Requirements 1.3, 1.4**
     */
    describe('getApplicationsByJobPosting - Success Response', () => {
        it('should return status 200 when applications are retrieved successfully', async () => {
            const mockApplications = [
                createMockApplication(),
                createMockApplication({
                    id: '223e4567-e89b-12d3-a456-426614174000',
                    candidate: {
                        id: '223e4567-e89b-12d3-a456-426614174001',
                        firstName: 'Jane',
                        lastName: 'Smith',
                        email: 'jane.smith@example.com',
                        phone: '+1234567891',
                        resumeUrl: 'https://example.com/resume2.pdf',
                        linkedinUrl: 'https://linkedin.com/in/janesmith',
                        skills: ['Python', 'Django'],
                        experienceYears: 3,
                        location: 'Boston',
                        createdAt: new Date('2024-01-11T10:00:00Z'),
                        updatedAt: new Date('2024-01-11T10:00:00Z'),
                    },
                    aiScore: 92,
                }),
            ];
            mockGetApplicationsByJobPosting.mockResolvedValueOnce(
                mockApplications,
            );

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return success response structure with data array', async () => {
            const mockApplications = [createMockApplication()];
            mockGetApplicationsByJobPosting.mockResolvedValueOnce(
                mockApplications,
            );

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0] as any;

            expect(responseData).toHaveProperty('success', true);
            expect(responseData).toHaveProperty('data');
            expect(Array.isArray(responseData.data)).toBe(true);
        });

        it('should include all required fields in each application object', async () => {
            const mockApplications = [
                createMockApplication({
                    id: 'app-123',
                    status: 'NEW',
                    aiScore: 88,
                    candidate: {
                        id: 'candidate-456',
                        firstName: 'Alice',
                        lastName: 'Johnson',
                        email: 'alice.johnson@example.com',
                        phone: '+1234567892',
                        resumeUrl: 'https://example.com/resume3.pdf',
                        linkedinUrl: 'https://linkedin.com/in/alicejohnson',
                        skills: ['Java', 'Spring'],
                        experienceYears: 7,
                        location: 'Seattle',
                        createdAt: new Date('2024-01-12T10:00:00Z'),
                        updatedAt: new Date('2024-01-12T10:00:00Z'),
                    },
                }),
            ];
            mockGetApplicationsByJobPosting.mockResolvedValueOnce(
                mockApplications,
            );

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0] as any;
            const application = responseData.data[0];

            expect(application).toHaveProperty('id', 'app-123');
            expect(application).toHaveProperty(
                'candidateName',
                'Alice Johnson',
            );
            expect(application).toHaveProperty(
                'candidateEmail',
                'alice.johnson@example.com',
            );
            expect(application).toHaveProperty('aiScore', 88);
            expect(application).toHaveProperty('status', 'NEW');
        });

        it('should log successful retrieval with job posting ID and count', async () => {
            const mockApplications = [
                createMockApplication(),
                createMockApplication({
                    id: '223e4567-e89b-12d3-a456-426614174000',
                }),
            ];
            mockGetApplicationsByJobPosting.mockResolvedValueOnce(
                mockApplications,
            );

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(mockLoggerInfo).toHaveBeenCalledWith(
                {
                    jobPostingId: '123e4567-e89b-12d3-a456-426614174002',
                    count: 2,
                },
                'Applications retrieved successfully via API',
            );
        });
    });

    /**
     * Test: Empty applications array scenario
     * **Validates: Requirement 1.5**
     */
    describe('getApplicationsByJobPosting - Empty Applications', () => {
        it('should return status 200 with empty data array when no applications exist', async () => {
            mockGetApplicationsByJobPosting.mockResolvedValueOnce([]);

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(res.status).toHaveBeenCalledWith(200);

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0] as any;

            expect(responseData).toEqual({
                success: true,
                data: [],
            });
        });

        it('should log successful retrieval with count 0 for empty results', async () => {
            mockGetApplicationsByJobPosting.mockResolvedValueOnce([]);

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(mockLoggerInfo).toHaveBeenCalledWith(
                {
                    jobPostingId: '123e4567-e89b-12d3-a456-426614174002',
                    count: 0,
                },
                'Applications retrieved successfully via API',
            );
        });
    });

    /**
     * Test: 404 error handling
     * **Validates: Requirement 3.2**
     */
    describe('getApplicationsByJobPosting - 404 Error Handling', () => {
        it('should propagate 404 error when job posting not found', async () => {
            const error = new AppError('Job posting not found', 404);
            mockGetApplicationsByJobPosting.mockRejectedValueOnce(error);

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(error);
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Job posting not found',
                    statusCode: 404,
                }),
            );
        });

        it('should not call res.status when 404 error occurs', async () => {
            const error = new AppError('Job posting not found', 404);
            mockGetApplicationsByJobPosting.mockRejectedValueOnce(error);

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(res.status).not.toHaveBeenCalled();
        });

        it('should not call res.json when 404 error occurs', async () => {
            const error = new AppError('Job posting not found', 404);
            mockGetApplicationsByJobPosting.mockRejectedValueOnce(error);

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(res.json).not.toHaveBeenCalled();
        });
    });

    /**
     * Test: 500 error handling
     * **Validates: Requirements 4.1, 4.2**
     */
    describe('getApplicationsByJobPosting - 500 Error Handling', () => {
        it('should propagate database errors to next() middleware', async () => {
            const error = new Error('Database connection failed');
            mockGetApplicationsByJobPosting.mockRejectedValueOnce(error);

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(error);
        });

        it('should propagate unexpected errors to next() middleware', async () => {
            const error = new Error('Unexpected error occurred');
            mockGetApplicationsByJobPosting.mockRejectedValueOnce(error);

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should not call res.status when database error occurs', async () => {
            const error = new Error('Database query failed');
            mockGetApplicationsByJobPosting.mockRejectedValueOnce(error);

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(res.status).not.toHaveBeenCalled();
        });

        it('should not call res.json when database error occurs', async () => {
            const error = new Error('Database query failed');
            mockGetApplicationsByJobPosting.mockRejectedValueOnce(error);

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(res.json).not.toHaveBeenCalled();
        });
    });

    /**
     * Test: Response transformation
     * **Validates: Requirements 1.3, 1.4**
     */
    describe('getApplicationsByJobPosting - Response Transformation', () => {
        it('should transform Application entities to response DTOs correctly', async () => {
            const mockApplications = [
                createMockApplication({
                    id: 'app-transform-1',
                    status: 'SCREENING',
                    aiScore: 75,
                    candidate: {
                        id: 'candidate-transform-1',
                        firstName: 'Bob',
                        lastName: 'Williams',
                        email: 'bob.williams@example.com',
                        phone: '+1234567893',
                        resumeUrl: 'https://example.com/resume4.pdf',
                        linkedinUrl: 'https://linkedin.com/in/bobwilliams',
                        skills: ['React', 'Node.js'],
                        experienceYears: 4,
                        location: 'Austin',
                        createdAt: new Date('2024-01-13T10:00:00Z'),
                        updatedAt: new Date('2024-01-13T10:00:00Z'),
                    },
                }),
            ];
            mockGetApplicationsByJobPosting.mockResolvedValueOnce(
                mockApplications,
            );

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0] as any;
            const application = responseData.data[0];

            expect(application).toEqual({
                id: 'app-transform-1',
                candidateName: 'Bob Williams',
                candidateEmail: 'bob.williams@example.com',
                aiScore: 75,
                status: 'SCREENING',
            });
        });

        it('should concatenate firstName and lastName with space for candidateName', async () => {
            const mockApplications = [
                createMockApplication({
                    candidate: {
                        id: 'candidate-name-test',
                        firstName: 'Mary',
                        lastName: 'Anderson',
                        email: 'mary.anderson@example.com',
                        phone: '+1234567894',
                        resumeUrl: 'https://example.com/resume5.pdf',
                        linkedinUrl: 'https://linkedin.com/in/maryanderson',
                        skills: ['Python', 'Machine Learning'],
                        experienceYears: 6,
                        location: 'San Francisco',
                        createdAt: new Date('2024-01-14T10:00:00Z'),
                        updatedAt: new Date('2024-01-14T10:00:00Z'),
                    },
                }),
            ];
            mockGetApplicationsByJobPosting.mockResolvedValueOnce(
                mockApplications,
            );

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0] as any;
            const application = responseData.data[0];

            expect(application.candidateName).toBe('Mary Anderson');
        });

        it('should handle null aiScore in transformation', async () => {
            const mockApplications = [
                createMockApplication({
                    aiScore: null,
                }),
            ];
            mockGetApplicationsByJobPosting.mockResolvedValueOnce(
                mockApplications,
            );

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0] as any;
            const application = responseData.data[0];

            expect(application.aiScore).toBeNull();
        });

        it('should transform multiple applications correctly', async () => {
            const mockApplications = [
                createMockApplication({
                    id: 'app-1',
                    candidate: {
                        id: 'candidate-1',
                        firstName: 'First1',
                        lastName: 'Last1',
                        email: 'first1.last1@example.com',
                        phone: '+1234567895',
                        resumeUrl: 'https://example.com/resume6.pdf',
                        linkedinUrl: 'https://linkedin.com/in/first1last1',
                        skills: ['Skill1'],
                        experienceYears: 2,
                        location: 'Location1',
                        createdAt: new Date('2024-01-15T10:00:00Z'),
                        updatedAt: new Date('2024-01-15T10:00:00Z'),
                    },
                    aiScore: 80,
                    status: 'NEW',
                }),
                createMockApplication({
                    id: 'app-2',
                    candidate: {
                        id: 'candidate-2',
                        firstName: 'First2',
                        lastName: 'Last2',
                        email: 'first2.last2@example.com',
                        phone: '+1234567896',
                        resumeUrl: 'https://example.com/resume7.pdf',
                        linkedinUrl: 'https://linkedin.com/in/first2last2',
                        skills: ['Skill2'],
                        experienceYears: 3,
                        location: 'Location2',
                        createdAt: new Date('2024-01-16T10:00:00Z'),
                        updatedAt: new Date('2024-01-16T10:00:00Z'),
                    },
                    aiScore: 90,
                    status: 'SCREENING',
                }),
            ];
            mockGetApplicationsByJobPosting.mockResolvedValueOnce(
                mockApplications,
            );

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0] as any;

            expect(responseData.data).toHaveLength(2);
            expect(responseData.data[0]).toEqual({
                id: 'app-1',
                candidateName: 'First1 Last1',
                candidateEmail: 'first1.last1@example.com',
                aiScore: 80,
                status: 'NEW',
            });
            expect(responseData.data[1]).toEqual({
                id: 'app-2',
                candidateName: 'First2 Last2',
                candidateEmail: 'first2.last2@example.com',
                aiScore: 90,
                status: 'SCREENING',
            });
        });
    });

    /**
     * Test: Service invocation
     */
    describe('getApplicationsByJobPosting - Service Invocation', () => {
        it('should call applicationService.getApplicationsByJobPosting with correct job posting ID', async () => {
            mockGetApplicationsByJobPosting.mockResolvedValueOnce([]);

            req.params = {
                id: 'job-posting-xyz',
            };

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(mockGetApplicationsByJobPosting).toHaveBeenCalledWith(
                'job-posting-xyz',
            );
        });

        it('should handle array-type params.id by extracting first element', async () => {
            mockGetApplicationsByJobPosting.mockResolvedValueOnce([]);

            req.params = {
                id: ['job-posting-array-1', 'job-posting-array-2'] as any,
            };

            await controller.getApplicationsByJobPosting(
                req as Request,
                res as Response,
                next,
            );

            expect(mockGetApplicationsByJobPosting).toHaveBeenCalledWith(
                'job-posting-array-1',
            );
        });
    });
});
