import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import * as fc from 'fast-check';

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
const { getApplicationController } = await import(
    '../application.controller'
);

/**
 * Property-Based Tests for ApplicationController
 * **Feature: application-submission-flow**
 */
describe('ApplicationController Property-Based Tests', () => {
    // Fast-check arbitraries for generating random data
    const uuidArbitrary = fc.uuid();
    const resumeTextArbitrary = fc.string({ minLength: 1, maxLength: 1000 });
    const aiScoreArbitrary = fc.float({ min: 0, max: 100 });
    const aiSummaryArbitrary = fc.string({ minLength: 1, maxLength: 500 });
    const statusArbitrary = fc.constantFrom('NEW', 'SCREENED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED');
    const dateArbitrary = fc.date();

    // Arbitrary for generating valid application submission requests
    const submitApplicationRequestArbitrary = fc.record({
        candidateId: uuidArbitrary,
        jobPostingId: uuidArbitrary,
        resumeText: resumeTextArbitrary,
    });

    // Arbitrary for generating successful application responses from service
    const successfulApplicationArbitrary = fc.record({
        id: uuidArbitrary,
        status: statusArbitrary,
        aiScore: aiScoreArbitrary,
        aiSummary: aiSummaryArbitrary,
        candidateId: uuidArbitrary,
        jobPostingId: uuidArbitrary,
        createdAt: dateArbitrary,
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * **Feature: application-submission-flow, Property 5: Respuesta exitosa completa**
     * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
     * 
     * For any successfully processed application, the HTTP response must:
     * - Have status code 201
     * - Include the id of the created Application
     * - Include aiScore and aiSummary from screening
     * - Include the status of the Application
     */
    describe('Property 5: Respuesta exitosa completa', () => {
        it('should return 201 status code for any successful application submission', async () => {
            await fc.assert(
                fc.asyncProperty(
                    submitApplicationRequestArbitrary,
                    successfulApplicationArbitrary,
                    async (requestData, applicationData) => {
                        // Setup request mock
                        const req = {
                            body: requestData,
                        } as Request;

                        // Setup response mock with proper chaining
                        const jsonMock = jest.fn();
                        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
                        const res = {
                            status: statusMock,
                            json: jsonMock,
                        } as unknown as Response;

                        // Setup next mock
                        const next = jest.fn() as NextFunction;

                        // Mock service to return successful application
                        mockSubmitApplication.mockResolvedValueOnce({
                            id: applicationData.id,
                            status: applicationData.status,
                            aiScore: applicationData.aiScore,
                            aiSummary: applicationData.aiSummary,
                            candidate: { id: applicationData.candidateId },
                            jobPosting: { id: applicationData.jobPostingId },
                            createdAt: applicationData.createdAt,
                        });

                        // Execute controller
                        const controller = getApplicationController();
                        await controller.submitApplication(req, res, next);

                        // Verify status code is 201 (Requirement 5.1)
                        expect(statusMock).toHaveBeenCalledWith(201);
                    },
                ),
                { numRuns: 100 },
            );
        }, 30000);

        it('should include all required fields in response for any successful submission', async () => {
            await fc.assert(
                fc.asyncProperty(
                    submitApplicationRequestArbitrary,
                    successfulApplicationArbitrary,
                    async (requestData, applicationData) => {
                        // Setup request mock
                        const req = {
                            body: requestData,
                        } as Request;

                        // Setup response mock with proper chaining
                        const jsonMock = jest.fn();
                        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
                        const res = {
                            status: statusMock,
                            json: jsonMock,
                        } as unknown as Response;

                        // Setup next mock
                        const next = jest.fn() as NextFunction;

                        // Mock service to return successful application
                        mockSubmitApplication.mockResolvedValueOnce({
                            id: applicationData.id,
                            status: applicationData.status,
                            aiScore: applicationData.aiScore,
                            aiSummary: applicationData.aiSummary,
                            candidate: { id: applicationData.candidateId },
                            jobPosting: { id: applicationData.jobPostingId },
                            createdAt: applicationData.createdAt,
                        });

                        // Execute controller
                        const controller = getApplicationController();
                        await controller.submitApplication(req, res, next);

                        // Get the response data
                        expect(jsonMock).toHaveBeenCalledTimes(1);
                        const responseData = jsonMock.mock.calls[0][0] as any;

                        // Verify response includes id (Requirement 5.2)
                        expect(responseData).toHaveProperty('id');
                        expect(responseData.id).toBe(applicationData.id);

                        // Verify response includes aiScore (Requirement 5.3)
                        expect(responseData).toHaveProperty('aiScore');
                        expect(responseData.aiScore).toBe(applicationData.aiScore);

                        // Verify response includes aiSummary (Requirement 5.3)
                        expect(responseData).toHaveProperty('aiSummary');
                        expect(responseData.aiSummary).toBe(applicationData.aiSummary);

                        // Verify response includes status (Requirement 5.4)
                        expect(responseData).toHaveProperty('status');
                        expect(responseData.status).toBe(applicationData.status);

                        // Verify response includes candidateId
                        expect(responseData).toHaveProperty('candidateId');
                        expect(responseData.candidateId).toBe(applicationData.candidateId);

                        // Verify response includes jobPostingId
                        expect(responseData).toHaveProperty('jobPostingId');
                        expect(responseData.jobPostingId).toBe(applicationData.jobPostingId);

                        // Verify response includes createdAt
                        expect(responseData).toHaveProperty('createdAt');
                        expect(responseData.createdAt).toEqual(applicationData.createdAt);
                    },
                ),
                { numRuns: 100 },
            );
        }, 30000);

        it('should preserve exact screening values in response for any successful submission', async () => {
            await fc.assert(
                fc.asyncProperty(
                    submitApplicationRequestArbitrary,
                    aiScoreArbitrary,
                    aiSummaryArbitrary,
                    uuidArbitrary,
                    statusArbitrary,
                    dateArbitrary,
                    async (requestData, aiScore, aiSummary, applicationId, status, createdAt) => {
                        // Setup request mock
                        const req = {
                            body: requestData,
                        } as Request;

                        // Setup response mock with proper chaining
                        const jsonMock = jest.fn();
                        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
                        const res = {
                            status: statusMock,
                            json: jsonMock,
                        } as unknown as Response;

                        // Setup next mock
                        const next = jest.fn() as NextFunction;

                        // Mock service to return application with specific screening values
                        mockSubmitApplication.mockResolvedValueOnce({
                            id: applicationId,
                            status: status,
                            aiScore: aiScore,
                            aiSummary: aiSummary,
                            candidate: { id: requestData.candidateId },
                            jobPosting: { id: requestData.jobPostingId },
                            createdAt: createdAt,
                        });

                        // Execute controller
                        const controller = getApplicationController();
                        await controller.submitApplication(req, res, next);

                        // Get the response data
                        const responseData = jsonMock.mock.calls[0][0] as any;

                        // Verify aiScore is preserved exactly (Requirement 5.3)
                        expect(responseData.aiScore).toBe(aiScore);

                        // Verify aiSummary is preserved exactly (Requirement 5.3)
                        expect(responseData.aiSummary).toBe(aiSummary);
                    },
                ),
                { numRuns: 100 },
            );
        }, 30000);

        it('should not call next() for any successful submission', async () => {
            await fc.assert(
                fc.asyncProperty(
                    submitApplicationRequestArbitrary,
                    successfulApplicationArbitrary,
                    async (requestData, applicationData) => {
                        // Setup request mock
                        const req = {
                            body: requestData,
                        } as Request;

                        // Setup response mock with proper chaining
                        const jsonMock = jest.fn();
                        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
                        const res = {
                            status: statusMock,
                            json: jsonMock,
                        } as unknown as Response;

                        // Setup next mock
                        const next = jest.fn() as NextFunction;

                        // Mock service to return successful application
                        mockSubmitApplication.mockResolvedValueOnce({
                            id: applicationData.id,
                            status: applicationData.status,
                            aiScore: applicationData.aiScore,
                            aiSummary: applicationData.aiSummary,
                            candidate: { id: applicationData.candidateId },
                            jobPosting: { id: applicationData.jobPostingId },
                            createdAt: applicationData.createdAt,
                        });

                        // Execute controller
                        const controller = getApplicationController();
                        await controller.submitApplication(req, res, next);

                        // Verify next() was not called (no errors)
                        expect(next).not.toHaveBeenCalled();
                    },
                ),
                { numRuns: 100 },
            );
        }, 30000);
    });
});
