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

// Mock ApplicationService
const mockSubmitApplication =
    jest.fn<
        () => Promise<{
            id: string;
            status: string;
            aiScore: number;
            aiSummary: string;
            candidate: { id: string };
            jobPosting: { id: string };
            createdAt: Date;
        }>
    >();
const mockGetApplicationService = jest.fn(() => ({
    submitApplication: mockSubmitApplication,
}));

jest.unstable_mockModule('../../services/application.service', () => ({
    getApplicationService: mockGetApplicationService,
}));

// Import modules after mocks are set up
const { default: AppError } = await import('../../utils/appError');
const { getApplicationController } = await import(
    '../application.controller'
);

/**
 * Unit Tests for ApplicationController
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 */
describe('ApplicationController Unit Tests', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let controller: ReturnType<typeof getApplicationController>;

    // Helper to create a mock application response
    const createMockApplication = (overrides = {}) => ({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'NEW',
        aiScore: 85,
        aiSummary: 'Strong candidate with relevant experience',
        candidate: {
            id: '123e4567-e89b-12d3-a456-426614174001',
        },
        jobPosting: {
            id: '123e4567-e89b-12d3-a456-426614174002',
        },
        createdAt: new Date('2024-01-15T10:00:00Z'),
        ...overrides,
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup request mock
        req = {
            body: {
                candidateId: '123e4567-e89b-12d3-a456-426614174001',
                jobPostingId: '123e4567-e89b-12d3-a456-426614174002',
                resumeText: 'Sample resume text',
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
        controller = getApplicationController();
    });

    /**
     * Test: Successful response returns 201
     * **Validates: Requirement 5.1**
     */
    describe('submitApplication - Success Response', () => {
        it('should return status 201 when application is submitted successfully', async () => {
            const mockApplication = createMockApplication();
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    /**
     * Test: Response includes all required fields
     * **Validates: Requirements 5.2, 5.3, 5.4**
     */
    describe('submitApplication - Response Structure', () => {
        it('should include all required fields in the response', async () => {
            const mockApplication = createMockApplication({
                id: 'app-123',
                status: 'NEW',
                aiScore: 92,
                aiSummary: 'Excellent match',
                candidate: { id: 'candidate-456' },
                jobPosting: { id: 'job-789' },
                createdAt: new Date('2024-01-15T10:00:00Z'),
            });
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            expect(res.json).toHaveBeenCalledWith({
                id: 'app-123',
                status: 'NEW',
                aiScore: 92,
                aiSummary: 'Excellent match',
                candidateId: 'candidate-456',
                jobPostingId: 'job-789',
                createdAt: new Date('2024-01-15T10:00:00Z'),
            });
        });

        it('should include id field in response', async () => {
            const mockApplication = createMockApplication({
                id: 'unique-app-id',
            });
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0];

            expect(responseData).toHaveProperty('id', 'unique-app-id');
        });

        it('should include status field in response', async () => {
            const mockApplication = createMockApplication({
                status: 'NEW',
            });
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0];

            expect(responseData).toHaveProperty('status', 'NEW');
        });

        it('should include aiScore field in response', async () => {
            const mockApplication = createMockApplication({
                aiScore: 78,
            });
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0];

            expect(responseData).toHaveProperty('aiScore', 78);
        });

        it('should include aiSummary field in response', async () => {
            const mockApplication = createMockApplication({
                aiSummary: 'Good candidate for the role',
            });
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0];

            expect(responseData).toHaveProperty(
                'aiSummary',
                'Good candidate for the role',
            );
        });

        it('should include candidateId field in response', async () => {
            const mockApplication = createMockApplication({
                candidate: { id: 'candidate-xyz' },
            });
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0];

            expect(responseData).toHaveProperty('candidateId', 'candidate-xyz');
        });

        it('should include jobPostingId field in response', async () => {
            const mockApplication = createMockApplication({
                jobPosting: { id: 'job-abc' },
            });
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0];

            expect(responseData).toHaveProperty('jobPostingId', 'job-abc');
        });

        it('should include createdAt field in response', async () => {
            const createdDate = new Date('2024-02-20T15:30:00Z');
            const mockApplication = createMockApplication({
                createdAt: createdDate,
            });
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            const jsonMock = res.json as jest.Mock;
            const responseData = jsonMock.mock.calls[0][0];

            expect(responseData).toHaveProperty('createdAt', createdDate);
        });
    });

    /**
     * Test: Errors are propagated correctly
     * **Validates: Error propagation to next() middleware**
     */
    describe('submitApplication - Error Propagation', () => {
        it('should propagate errors to next() middleware', async () => {
            const error = new Error('Service error');
            mockSubmitApplication.mockRejectedValueOnce(error);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should propagate 404 error when candidate not found', async () => {
            const error = new AppError('Candidate not found', 404);
            mockSubmitApplication.mockRejectedValueOnce(error);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(error);
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Candidate not found',
                    statusCode: 404,
                }),
            );
        });

        it('should propagate 404 error when job posting not found', async () => {
            const error = new AppError('Job posting not found', 404);
            mockSubmitApplication.mockRejectedValueOnce(error);

            await controller.submitApplication(
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

        it('should propagate 502 error when AI service fails', async () => {
            const error = new AppError('Invalid screening result', 502);
            mockSubmitApplication.mockRejectedValueOnce(error);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(error);
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Invalid screening result',
                    statusCode: 502,
                }),
            );
        });

        it('should propagate 503 error when AI service connection fails', async () => {
            const error = new AppError(
                'Failed to connect to Anthropic API',
                503,
            );
            mockSubmitApplication.mockRejectedValueOnce(error);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(error);
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Failed to connect to Anthropic API',
                    statusCode: 503,
                }),
            );
        });

        it('should propagate 504 error when AI service times out', async () => {
            const error = new AppError('Anthropic API request timed out', 504);
            mockSubmitApplication.mockRejectedValueOnce(error);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(error);
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Anthropic API request timed out',
                    statusCode: 504,
                }),
            );
        });
    });

    /**
     * Test: Service is called with correct parameters
     */
    describe('submitApplication - Service Invocation', () => {
        it('should call applicationService.submitApplication with correct parameters', async () => {
            const mockApplication = createMockApplication();
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                jobPostingId: 'job-456',
                resumeText: 'My resume content',
            };

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            expect(mockSubmitApplication).toHaveBeenCalledWith({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                jobPostingId: 'job-456',
                resumeText: 'My resume content',
            });
        });

        it('should log successful application submission', async () => {
            const mockApplication = createMockApplication({
                id: 'app-log-test',
            });
            mockSubmitApplication.mockResolvedValueOnce(mockApplication);

            await controller.submitApplication(
                req as Request,
                res as Response,
                next,
            );

            expect(mockLoggerInfo).toHaveBeenCalledWith(
                { applicationId: 'app-log-test' },
                'Application submitted successfully via API',
            );
        });
    });
});
