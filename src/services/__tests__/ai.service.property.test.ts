import * as fc from 'fast-check';
import { AIService } from '../ai.service';
import { screeningResultSchema } from '../../schemas/screening';

describe('AIService Property-Based Tests', () => {
    let service: AIService;

    beforeAll(() => {
        // Set up environment variable for testing
        process.env.GEMINI_API_KEY = 'test-api-key-for-property-tests';
        service = new AIService();
    });

    describe('Feature: gemini-ai-integration, Property 3: Always returns valid ScreeningResult', () => {
        /**
         * Property 3: Always Returns Valid ScreeningResult
         * Validates: Requirements 5.5, 5.7, 4.5
         * 
         * For any input combination of resumeText and jobDescription,
         * regardless of API failures, parsing errors, or validation errors,
         * the screenCandidate method must always return a valid ScreeningResult.
         */
        it('should always return valid ScreeningResult for any input strings', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string(), // Random resume text
                    fc.string(), // Random job description
                    async (resumeText, jobDescription) => {
                        // Call screenCandidate with random inputs
                        const result = await service.screenCandidate(resumeText, jobDescription);
                        
                        // Verify result passes schema validation
                        const validation = screeningResultSchema.safeParse(result);
                        
                        return validation.success;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return valid result for empty strings', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('', ''),
                    async () => {
                        const result = await service.screenCandidate('', '');
                        const validation = screeningResultSchema.safeParse(result);
                        
                        return validation.success;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return valid result for very long strings', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 10000, maxLength: 20000 }),
                    fc.string({ minLength: 5000, maxLength: 10000 }),
                    async (longResume, longJobDesc) => {
                        const result = await service.screenCandidate(longResume, longJobDesc);
                        const validation = screeningResultSchema.safeParse(result);
                        
                        return validation.success;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return valid result for strings with special characters', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string(),
                    fc.string(),
                    fc.constantFrom(
                        '\n\r\t',
                        '{}[]()"',
                        'null\u0000byte',
                        '😀🎉🚀',
                        '<script>alert("xss")</script>',
                        'SELECT * FROM users;'
                    ),
                    async (resume, jobDesc, specialChars) => {
                        const resumeWithSpecial = resume + specialChars;
                        const jobDescWithSpecial = jobDesc + specialChars;
                        
                        const result = await service.screenCandidate(resumeWithSpecial, jobDescWithSpecial);
                        const validation = screeningResultSchema.safeParse(result);
                        
                        return validation.success;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return valid result with fallback values on errors', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string(),
                    fc.string(),
                    async (resumeText, jobDescription) => {
                        const result = await service.screenCandidate(resumeText, jobDescription);
                        const validation = screeningResultSchema.safeParse(result);
                        
                        if (!validation.success) {
                            return false;
                        }
                        
                        // Verify result has all required fields
                        return (
                            typeof result.score === 'number' &&
                            result.score >= 0 &&
                            result.score <= 100 &&
                            typeof result.summary === 'string' &&
                            result.summary.length > 0 &&
                            Array.isArray(result.keyMatches) &&
                            Array.isArray(result.missingSkills) &&
                            ['PROCEED', 'HOLD', 'REJECT'].includes(result.recommendation)
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should never throw exceptions regardless of input', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.anything(),
                    fc.anything(),
                    async (input1, input2) => {
                        try {
                            // Convert any input to string (as the method expects strings)
                            const resume = String(input1);
                            const jobDesc = String(input2);
                            
                            const result = await service.screenCandidate(resume, jobDesc);
                            const validation = screeningResultSchema.safeParse(result);
                            
                            // Should always return valid result, never throw
                            return validation.success;
                        } catch (error: unknown) {
                            // If any exception is thrown, the property fails
                            // This is intentional - we're testing that the method never throws
                            console.error('Unexpected exception in screenCandidate:', error);
                            return false;
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    afterAll(() => {
        // Clean up
        delete process.env.GEMINI_API_KEY;
    });

    describe('Feature: gemini-ai-integration, Property 1: Markdown block cleaning', () => {
        /**
         * Property 1: Markdown Block Cleaning
         * Validates: Requirements 4.1, 4.2
         * 
         * For any valid JSON value, when wrapped in markdown code blocks,
         * the cleanMarkdownBlocks method should extract the pure JSON content.
         */
        it('should extract pure JSON from markdown-wrapped content', () => {
            fc.assert(
                fc.property(
                    fc.jsonValue(), // Generate random JSON values
                    (jsonObj) => {
                        // Convert JSON object to string
                        const jsonStr = JSON.stringify(jsonObj);
                        
                        // Wrap in markdown code block with json tag
                        const wrapped = `\`\`\`json\n${jsonStr}\n\`\`\``;
                        
                        // Access the private method through type assertion
                        const cleaned = (service as any).cleanMarkdownBlocks(wrapped);
                        
                        // Verify the cleaned result matches the original JSON string
                        return cleaned === jsonStr;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should extract pure JSON from untagged markdown blocks', () => {
            fc.assert(
                fc.property(
                    fc.jsonValue(),
                    (jsonObj) => {
                        const jsonStr = JSON.stringify(jsonObj);
                        
                        // Wrap in markdown code block without json tag
                        const wrapped = `\`\`\`\n${jsonStr}\n\`\`\``;
                        
                        const cleaned = (service as any).cleanMarkdownBlocks(wrapped);
                        
                        return cleaned === jsonStr;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle JSON with various whitespace patterns', () => {
            fc.assert(
                fc.property(
                    fc.jsonValue(),
                    fc.constantFrom('\n', '\n\n', '  \n', '\n  '),
                    fc.constantFrom('\n', '\n\n', '  \n', '\n  '),
                    (jsonObj, prefixWhitespace, suffixWhitespace) => {
                        const jsonStr = JSON.stringify(jsonObj);
                        
                        // Wrap with various whitespace patterns
                        const wrapped = `\`\`\`json${prefixWhitespace}${jsonStr}${suffixWhitespace}\`\`\``;
                        
                        const cleaned = (service as any).cleanMarkdownBlocks(wrapped);
                        
                        // Should extract and trim to pure JSON
                        return cleaned === jsonStr;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Feature: gemini-ai-integration, Property 2: Response validation', () => {
        /**
         * Property 2: Response Validation
         * Validates: Requirements 4.4, 7.1, 7.2, 7.3, 7.4
         * 
         * For any valid ScreeningResult object, schema validation should pass
         * and preserve all fields with correct types and constraints.
         */
        it('should validate and preserve all fields of valid ScreeningResult objects', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        score: fc.integer({ min: 0, max: 100 }),
                        summary: fc.string({ minLength: 1, maxLength: 200 }),
                        keyMatches: fc.array(fc.string()),
                        missingSkills: fc.array(fc.string()),
                        recommendation: fc.constantFrom('PROCEED', 'HOLD', 'REJECT')
                    }),
                    (validResult) => {
                        // Validate using the schema
                        const result = screeningResultSchema.safeParse(validResult);
                        
                        // Verify validation passes
                        if (!result.success) {
                            return false;
                        }
                        
                        // Verify all fields are preserved correctly
                        return (
                            result.data.score === validResult.score &&
                            result.data.summary === validResult.summary &&
                            result.data.keyMatches.length === validResult.keyMatches.length &&
                            result.data.missingSkills.length === validResult.missingSkills.length &&
                            result.data.recommendation === validResult.recommendation
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should validate score boundaries correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.string({ minLength: 1 }),
                    fc.constantFrom('PROCEED', 'HOLD', 'REJECT'),
                    (score, summary, recommendation) => {
                        const result = screeningResultSchema.safeParse({
                            score,
                            summary,
                            keyMatches: [],
                            missingSkills: [],
                            recommendation
                        });
                        
                        // All scores between 0-100 should be valid
                        return result.success && result.data.score === score;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should validate recommendation enum values', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('PROCEED', 'HOLD', 'REJECT'),
                    (recommendation) => {
                        const result = screeningResultSchema.safeParse({
                            score: 50,
                            summary: 'Test summary',
                            keyMatches: [],
                            missingSkills: [],
                            recommendation
                        });
                        
                        // All valid enum values should pass
                        return result.success && result.data.recommendation === recommendation;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject invalid scores outside 0-100 range', () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.integer({ max: -1 }),
                        fc.integer({ min: 101 })
                    ),
                    (invalidScore) => {
                        const result = screeningResultSchema.safeParse({
                            score: invalidScore,
                            summary: 'Test summary',
                            keyMatches: [],
                            missingSkills: [],
                            recommendation: 'HOLD'
                        });
                        
                        // Invalid scores should fail validation
                        return !result.success;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject empty summary strings', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(''),
                    (emptySummary) => {
                        const result = screeningResultSchema.safeParse({
                            score: 50,
                            summary: emptySummary,
                            keyMatches: [],
                            missingSkills: [],
                            recommendation: 'HOLD'
                        });
                        
                        // Empty summary should fail validation
                        return !result.success;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should preserve array contents for keyMatches and missingSkills', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
                    fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
                    (keyMatches, missingSkills) => {
                        const result = screeningResultSchema.safeParse({
                            score: 75,
                            summary: 'Test summary',
                            keyMatches,
                            missingSkills,
                            recommendation: 'PROCEED'
                        });
                        
                        if (!result.success) {
                            return false;
                        }
                        
                        // Verify arrays are preserved
                        return (
                            result.data.keyMatches.length === keyMatches.length &&
                            result.data.missingSkills.length === missingSkills.length &&
                            result.data.keyMatches.every((skill, idx) => skill === keyMatches[idx]) &&
                            result.data.missingSkills.every((skill, idx) => skill === missingSkills[idx])
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
