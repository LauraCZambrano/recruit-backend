import * as fc from 'fast-check';
import { jest } from '@jest/globals';

// Mock logger first (before AppError import since AppError uses logger)
jest.unstable_mockModule('../../utils/pino', () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock config before importing AIService
jest.unstable_mockModule('config', () => ({
    default: {
        get: jest.fn((key: string) => {
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
        }),
    },
}));

// Create mock for Anthropic SDK with proper typing
const mockCreate =
    jest.fn<() => Promise<{ content: { type: string; text: string }[] }>>();
jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
    default: jest.fn().mockImplementation(() => ({
        messages: {
            create: mockCreate,
        },
    })),
}));

// Import modules after mocks are set up
const { default: AppError } = await import('../../utils/appError');
const { AIService } = await import('../ai.service');

// Arbitrary for generating invalid JSON strings (not parseable)
const invalidJsonArbitrary = fc.oneof(
    // Strings that are definitely not valid JSON
    fc.string().filter((s) => {
        try {
            JSON.parse(s);
            return false;
        } catch {
            return true;
        }
    }),
    // Common invalid JSON patterns
    fc.constantFrom(
        '{invalid}',
        '{"unclosed": "string',
        '{key: "no quotes on key"}',
        '{"trailing": "comma",}',
        '[1, 2, 3,]',
        'undefined',
        'NaN',
        "{'single': 'quotes'}",
        '{"nested": {"broken": }}',
    ),
);

// Arbitrary for generating valid JSON that doesn't match ScreeningResult schema
const invalidSchemaArbitrary = fc.oneof(
    // Missing required fields
    fc.record({
        score: fc.integer({ min: 0, max: 100 }),
        // Missing summary, keyMatches, missingSkills, recommendation
    }),
    fc.record({
        summary: fc.string({ minLength: 1 }),
        // Missing score, keyMatches, missingSkills, recommendation
    }),
    // Wrong types for fields
    fc.record({
        score: fc.string(), // Should be number
        summary: fc.string({ minLength: 1 }),
        keyMatches: fc.array(fc.string()),
        missingSkills: fc.array(fc.string()),
        recommendation: fc.constantFrom('PROCEED', 'HOLD', 'REJECT'),
    }),
    fc.record({
        score: fc.integer({ min: 0, max: 100 }),
        summary: fc.integer(), // Should be string
        keyMatches: fc.array(fc.string()),
        missingSkills: fc.array(fc.string()),
        recommendation: fc.constantFrom('PROCEED', 'HOLD', 'REJECT'),
    }),
    // Score out of range
    fc.record({
        score: fc.oneof(
            fc.integer({ min: -1000, max: -1 }),
            fc.integer({ min: 101, max: 1000 }),
        ),
        summary: fc.string({ minLength: 1 }),
        keyMatches: fc.array(fc.string()),
        missingSkills: fc.array(fc.string()),
        recommendation: fc.constantFrom('PROCEED', 'HOLD', 'REJECT'),
    }),
    // Invalid recommendation value
    fc.record({
        score: fc.integer({ min: 0, max: 100 }),
        summary: fc.string({ minLength: 1 }),
        keyMatches: fc.array(fc.string()),
        missingSkills: fc.array(fc.string()),
        recommendation: fc
            .string()
            .filter((s) => !['PROCEED', 'HOLD', 'REJECT'].includes(s)),
    }),
    // Empty summary (invalid)
    fc.record({
        score: fc.integer({ min: 0, max: 100 }),
        summary: fc.constant(''),
        keyMatches: fc.array(fc.string()),
        missingSkills: fc.array(fc.string()),
        recommendation: fc.constantFrom('PROCEED', 'HOLD', 'REJECT'),
    }),
    // keyMatches not an array
    fc.record({
        score: fc.integer({ min: 0, max: 100 }),
        summary: fc.string({ minLength: 1 }),
        keyMatches: fc.string(), // Should be array
        missingSkills: fc.array(fc.string()),
        recommendation: fc.constantFrom('PROCEED', 'HOLD', 'REJECT'),
    }),
    // missingSkills not an array
    fc.record({
        score: fc.integer({ min: 0, max: 100 }),
        summary: fc.string({ minLength: 1 }),
        keyMatches: fc.array(fc.string()),
        missingSkills: fc.string(), // Should be array
        recommendation: fc.constantFrom('PROCEED', 'HOLD', 'REJECT'),
    }),
    // Completely wrong structure
    fc.oneof(
        fc.array(fc.anything()),
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.constant(null),
    ),
);

describe('AIService Property Tests', () => {
    let aiService: InstanceType<typeof AIService>;

    beforeEach(() => {
        jest.clearAllMocks();
        aiService = new AIService();
    });

    // Feature: ai-candidate-screening, Property 3: Rechazo de respuestas inválidas
    // **Validates: Requirements 3.1, 4.3, 4.4**
    describe('Property 3: Rechazo de respuestas inválidas', () => {
        it('should throw AppError with status 502 for invalid JSON strings', async () => {
            await fc.assert(
                fc.asyncProperty(invalidJsonArbitrary, async (invalidJson) => {
                    mockCreate.mockResolvedValueOnce({
                        content: [{ type: 'text', text: invalidJson }],
                    });

                    try {
                        await aiService.screenCandidate(
                            'test resume',
                            'test job description',
                        );
                        // Should not reach here
                        throw new Error('Expected AppError to be thrown');
                    } catch (error) {
                        expect(error).toBeInstanceOf(AppError);
                        expect(
                            (error as InstanceType<typeof AppError>).statusCode,
                        ).toBe(502);
                        expect(
                            (error as InstanceType<typeof AppError>).message,
                        ).toBe('Failed to parse Anthropic response as JSON');
                    }
                }),
                { numRuns: 100 },
            );
        });

        it('should throw AppError with status 502 and descriptive message for invalid schema', async () => {
            await fc.assert(
                fc.asyncProperty(
                    invalidSchemaArbitrary,
                    async (invalidData) => {
                        const jsonString = JSON.stringify(invalidData);

                        mockCreate.mockResolvedValueOnce({
                            content: [{ type: 'text', text: jsonString }],
                        });

                        try {
                            await aiService.screenCandidate(
                                'test resume',
                                'test job description',
                            );
                            // Should not reach here
                            throw new Error('Expected AppError to be thrown');
                        } catch (error) {
                            expect(error).toBeInstanceOf(AppError);
                            expect(
                                (error as InstanceType<typeof AppError>)
                                    .statusCode,
                            ).toBe(502);
                            expect(
                                (error as InstanceType<typeof AppError>)
                                    .message,
                            ).toMatch(/^Invalid screening result:/);
                        }
                    },
                ),
                { numRuns: 100 },
            );
        });
    });
});
