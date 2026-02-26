import * as fc from 'fast-check';
import { screeningResultSchema, ScreeningResult } from '../screening';

// Fast-check arbitrary for generating valid ScreeningResult objects
const screeningResultArbitrary = fc.record({
    score: fc.integer({ min: 0, max: 100 }),
    summary: fc.string({ minLength: 1 }),
    keyMatches: fc.array(fc.string()),
    missingSkills: fc.array(fc.string()),
    recommendation: fc.constantFrom('PROCEED', 'HOLD', 'REJECT'),
});

describe('ScreeningResult Schema Property Tests', () => {
    // Feature: ai-candidate-screening, Property 1: Round-trip de ScreeningResult
    // **Validates: Requirements 3.5**
    describe('Property 1: Round-trip de ScreeningResult', () => {
        it('should preserve data through JSON serialization/deserialization', () => {
            fc.assert(
                fc.property(
                    screeningResultArbitrary,
                    (result: ScreeningResult) => {
                        // Serialize to JSON
                        const serialized = JSON.stringify(result);

                        // Parse back from JSON
                        const parsed = JSON.parse(serialized);

                        // Validate with Zod schema
                        const validated = screeningResultSchema.parse(parsed);

                        // Verify equivalence
                        expect(validated).toEqual(result);
                    },
                ),
                { numRuns: 100 },
            );
        });
    });
});
