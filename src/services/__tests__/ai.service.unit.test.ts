import { jest } from '@jest/globals';

// Mock logger first (before AppError import since AppError uses logger)
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.unstable_mockModule('../../utils/pino', () => ({
    default: {
        info: mockLoggerInfo,
        error: mockLoggerError,
    },
}));

// Mock config - will be configured per test
const mockConfigGet = jest.fn();
jest.unstable_mockModule('config', () => ({
    default: {
        get: mockConfigGet,
    },
}));

// Create mock for Anthropic SDK with proper typing
const mockCreate =
    jest.fn<() => Promise<{ content: { type: string; text: string }[] }>>();

// Create mock error classes that will be used for instanceof checks
class MockAPIError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'APIError';
        this.status = status;
    }
}

class MockAPIConnectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'APIConnectionError';
    }
}

// Create the mock Anthropic constructor with static error classes
const MockAnthropicConstructor = jest.fn().mockImplementation(() => ({
    messages: {
        create: mockCreate,
    },
}));

// Attach error classes as static properties
Object.defineProperty(MockAnthropicConstructor, 'APIError', {
    value: MockAPIError,
    writable: false,
});
Object.defineProperty(MockAnthropicConstructor, 'APIConnectionError', {
    value: MockAPIConnectionError,
    writable: false,
});

jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
    default: MockAnthropicConstructor,
}));

// Import modules after mocks are set up
const { default: AppError } = await import('../../utils/appError');
const { AIService } = await import('../ai.service');

/**
 * Unit Tests for AIService
 * **Validates: Requirements 4.1, 4.2, 4.5, 5.2, 7.1, 7.2, 7.3**
 */
describe('AIService Unit Tests', () => {
    // Helper to set up default config
    const setupDefaultConfig = () => {
        mockConfigGet.mockImplementation(((key: string) => {
            switch (key) {
                case 'anthropic.apiKey':
                    return 'test-api-key';
                case 'anthropic.model':
                    return 'claude-sonnet-4-20250514';
                case 'anthropic.maxTokens':
                    return 1024;
                default:
                    return undefined;
            }
        }) as (...args: unknown[]) => unknown);
    };

    // Helper to create a valid screening result response
    const createValidResponse = (overrides = {}) => ({
        score: 85,
        summary: 'Strong candidate with relevant experience',
        keyMatches: ['TypeScript', 'Node.js', 'React'],
        missingSkills: ['Kubernetes'],
        recommendation: 'PROCEED',
        ...overrides,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setupDefaultConfig();
    });

    /**
     * Test: API key not configured throws error
     * **Validates: Requirement 5.2**
     */
    describe('Constructor - API Key Configuration', () => {
        it('should throw AppError with status 500 when ANTHROPIC_API_KEY is not configured', () => {
            mockConfigGet.mockImplementation(((key: string) => {
                switch (key) {
                    case 'anthropic.apiKey':
                        return undefined;
                    case 'anthropic.model':
                        return 'claude-sonnet-4-20250514';
                    case 'anthropic.maxTokens':
                        return 1024;
                    default:
                        return undefined;
                }
            }) as (...args: unknown[]) => unknown);

            expect(() => new AIService()).toThrow(AppError);
            expect(() => new AIService()).toThrow(
                'ANTHROPIC_API_KEY not configured',
            );

            try {
                new AIService();
            } catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect(
                    (error as InstanceType<typeof AppError>).statusCode,
                ).toBe(500);
            }
        });

        it('should throw AppError with status 500 when ANTHROPIC_API_KEY is empty string', () => {
            mockConfigGet.mockImplementation(((key: string) => {
                switch (key) {
                    case 'anthropic.apiKey':
                        return '';
                    case 'anthropic.model':
                        return 'claude-sonnet-4-20250514';
                    case 'anthropic.maxTokens':
                        return 1024;
                    default:
                        return undefined;
                }
            }) as (...args: unknown[]) => unknown);

            expect(() => new AIService()).toThrow(AppError);
            expect(() => new AIService()).toThrow(
                'ANTHROPIC_API_KEY not configured',
            );
        });

        it('should initialize successfully when API key is configured', () => {
            setupDefaultConfig();

            expect(() => new AIService()).not.toThrow();
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'AIService initialized successfully',
            );
        });
    });

    /**
     * Test: Timeout handling
     * **Validates: Requirement 4.5**
     */
    describe('screenCandidate - Timeout Handling', () => {
        it('should throw AppError with status 504 when API returns status 408', async () => {
            const aiService = new AIService();

            const timeoutError = new MockAPIError('Request timeout', 408);
            mockCreate.mockRejectedValueOnce(timeoutError);

            await expect(
                aiService.screenCandidate('resume', 'job description'),
            ).rejects.toThrow(AppError);

            mockCreate.mockRejectedValueOnce(
                new MockAPIError('Request timeout', 408),
            );

            try {
                await aiService.screenCandidate('resume', 'job description');
            } catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect(
                    (error as InstanceType<typeof AppError>).statusCode,
                ).toBe(504);
                expect((error as InstanceType<typeof AppError>).message).toBe(
                    'Anthropic API request timed out',
                );
            }
        });

        it('should throw AppError with status 504 when error message contains "timeout"', async () => {
            const aiService = new AIService();

            const timeoutError = new MockAPIError(
                'Connection timeout exceeded',
                500,
            );
            mockCreate.mockRejectedValueOnce(timeoutError);

            try {
                await aiService.screenCandidate('resume', 'job description');
                fail('Expected AppError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect(
                    (error as InstanceType<typeof AppError>).statusCode,
                ).toBe(504);
                expect((error as InstanceType<typeof AppError>).message).toBe(
                    'Anthropic API request timed out',
                );
            }
        });
    });

    /**
     * Test: HTTP error handling
     * **Validates: Requirements 4.1, 4.2**
     */
    describe('screenCandidate - HTTP Error Handling', () => {
        it('should throw AppError with status 502 for HTTP 400 Bad Request', async () => {
            const aiService = new AIService();

            const apiError = new MockAPIError('Bad Request', 400);
            mockCreate.mockRejectedValueOnce(apiError);

            try {
                await aiService.screenCandidate('resume', 'job description');
                fail('Expected AppError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect(
                    (error as InstanceType<typeof AppError>).statusCode,
                ).toBe(502);
                expect((error as InstanceType<typeof AppError>).message).toBe(
                    'Anthropic API error: 400 - Bad Request',
                );
            }
        });

        it('should throw AppError with status 502 for HTTP 401 Unauthorized', async () => {
            const aiService = new AIService();

            const apiError = new MockAPIError('Unauthorized', 401);
            mockCreate.mockRejectedValueOnce(apiError);

            try {
                await aiService.screenCandidate('resume', 'job description');
                fail('Expected AppError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect(
                    (error as InstanceType<typeof AppError>).statusCode,
                ).toBe(502);
                expect((error as InstanceType<typeof AppError>).message).toBe(
                    'Anthropic API error: 401 - Unauthorized',
                );
            }
        });

        it('should throw AppError with status 502 for HTTP 429 Rate Limited', async () => {
            const aiService = new AIService();

            const apiError = new MockAPIError('Rate limit exceeded', 429);
            mockCreate.mockRejectedValueOnce(apiError);

            try {
                await aiService.screenCandidate('resume', 'job description');
                fail('Expected AppError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect(
                    (error as InstanceType<typeof AppError>).statusCode,
                ).toBe(502);
                expect((error as InstanceType<typeof AppError>).message).toBe(
                    'Anthropic API error: 429 - Rate limit exceeded',
                );
            }
        });

        it('should throw AppError with status 502 for HTTP 500 Internal Server Error', async () => {
            const aiService = new AIService();

            const apiError = new MockAPIError('Internal Server Error', 500);
            mockCreate.mockRejectedValueOnce(apiError);

            try {
                await aiService.screenCandidate('resume', 'job description');
                fail('Expected AppError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect(
                    (error as InstanceType<typeof AppError>).statusCode,
                ).toBe(502);
                expect((error as InstanceType<typeof AppError>).message).toBe(
                    'Anthropic API error: 500 - Internal Server Error',
                );
            }
        });

        it('should throw AppError with status 503 for connection errors', async () => {
            const aiService = new AIService();

            const connectionError = new MockAPIConnectionError(
                'Network unreachable',
            );
            mockCreate.mockRejectedValueOnce(connectionError);

            try {
                await aiService.screenCandidate('resume', 'job description');
                fail('Expected AppError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect(
                    (error as InstanceType<typeof AppError>).statusCode,
                ).toBe(503);
                expect((error as InstanceType<typeof AppError>).message).toBe(
                    'Failed to connect to Anthropic API',
                );
            }
        });
    });

    /**
     * Test: Logging operations
     * **Validates: Requirements 7.1, 7.2, 7.3**
     */
    describe('screenCandidate - Logging', () => {
        it('should log info when starting screening with operationId', async () => {
            const aiService = new AIService();

            mockCreate.mockResolvedValueOnce({
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(createValidResponse()),
                    },
                ],
            });

            await aiService.screenCandidate('resume text', 'job description');

            // Check that logger.info was called with operationId for starting
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                expect.objectContaining({ operationId: expect.any(String) }),
                'Starting candidate screening',
            );
        });

        it('should log info when screening completes successfully with operationId, score, and recommendation', async () => {
            const aiService = new AIService();
            const validResponse = createValidResponse({
                score: 92,
                recommendation: 'PROCEED',
            });

            mockCreate.mockResolvedValueOnce({
                content: [
                    { type: 'text', text: JSON.stringify(validResponse) },
                ],
            });

            await aiService.screenCandidate('resume text', 'job description');

            // Check that logger.info was called with success details
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                expect.objectContaining({
                    operationId: expect.any(String),
                    score: 92,
                    recommendation: 'PROCEED',
                }),
                'Candidate screening completed successfully',
            );
        });

        it('should log error when unexpected errors occur', async () => {
            const aiService = new AIService();

            // Simulate an unexpected error (not APIError or APIConnectionError)
            const unexpectedError = new Error('Unexpected failure');
            mockCreate.mockRejectedValueOnce(unexpectedError);

            try {
                await aiService.screenCandidate('resume', 'job description');
                fail('Expected AppError to be thrown');
            } catch {
                // Expected to throw
            }

            // Check that logger.error was called
            expect(mockLoggerError).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: unexpectedError,
                    operationId: expect.any(String),
                }),
                'Unexpected error during candidate screening',
            );
        });

        it('should use different operationId for each screening call', async () => {
            const aiService = new AIService();

            mockCreate.mockResolvedValue({
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(createValidResponse()),
                    },
                ],
            });

            await aiService.screenCandidate('resume 1', 'job 1');
            await aiService.screenCandidate('resume 2', 'job 2');

            // Get the operationIds from the calls
            const startCalls = mockLoggerInfo.mock.calls.filter(
                (call) => call[1] === 'Starting candidate screening',
            );

            expect(startCalls.length).toBe(2);
            const operationId1 = (startCalls[0][0] as { operationId: string })
                .operationId;
            const operationId2 = (startCalls[1][0] as { operationId: string })
                .operationId;

            expect(operationId1).not.toBe(operationId2);
        });
    });
});
