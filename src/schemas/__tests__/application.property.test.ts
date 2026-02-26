import * as fc from 'fast-check';
import { submitApplicationRequestSchema } from '../application';
import { ZodError } from 'zod';

/**
 * Property-Based Tests for Application Schema Validation
 * **Feature: application-submission-flow**
 */
describe('Application Schema Property-Based Tests', () => {
    // Fast-check arbitrary for generating non-UUID strings
    // This generates strings that are definitely NOT valid UUIDs
    const nonUuidArbitrary = fc.oneof(
        // Empty string
        fc.constant(''),
        // Random alphanumeric strings (not UUID format)
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
            // Filter out any strings that might accidentally be valid UUIDs
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return !uuidRegex.test(s);
        }),
        // Numbers as strings
        fc.integer().map(n => n.toString()),
        // Invalid UUID-like formats (wrong length, wrong separators, etc.)
        fc.constant('not-a-uuid'),
        fc.constant('12345678-1234-1234-1234'),
        fc.constant('12345678-1234-1234-1234-12345678901234567890'),
        fc.constant('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
        fc.constant('12345678_1234_1234_1234_123456789012'),
        // Special characters
        fc.constant('!@#$%^&*()'),
        // Whitespace
        fc.constant('   '),
        fc.constant('\n\t'),
    );

    // Arbitrary for valid resume text
    const resumeTextArbitrary = fc.string({ minLength: 1, maxLength: 500 });

    // Arbitrary for valid UUID (for the other field)
    const validUuidArbitrary = fc.uuid();

    /**
     * **Feature: application-submission-flow, Property 1: Validación de formato UUID**
     * **Validates: Requirements 1.5, 1.6**
     * 
     * For any string that is not a valid UUID used as candidateId or jobPostingId,
     * the system must reject the request with a 400 error.
     */
    describe('Property 1: Validación de formato UUID', () => {
        it('should reject any non-UUID candidateId with validation error', () => {
            fc.assert(
                fc.property(
                    nonUuidArbitrary,
                    validUuidArbitrary,
                    resumeTextArbitrary,
                    (invalidCandidateId, validJobPostingId, resumeText) => {
                        // Construct request body with invalid candidateId
                        const requestData = {
                            body: {
                                candidateId: invalidCandidateId,
                                jobPostingId: validJobPostingId,
                                resumeText: resumeText,
                            },
                        };

                        // Attempt to validate - should throw ZodError
                        expect(() => {
                            submitApplicationRequestSchema.parse(requestData);
                        }).toThrow(ZodError);

                        // Verify the error is specifically about candidateId
                        try {
                            submitApplicationRequestSchema.parse(requestData);
                            fail('Expected ZodError to be thrown');
                        } catch (error) {
                            expect(error).toBeInstanceOf(ZodError);
                            const zodError = error as ZodError<any>;
                            
                            // Check that the error is related to candidateId
                            const candidateIdErrors = zodError.issues.filter(
                                (err: any) => err.path.includes('candidateId')
                            );
                            expect(candidateIdErrors.length).toBeGreaterThan(0);
                        }
                    },
                ),
                { numRuns: 100 },
            );
        });

        it('should reject any non-UUID jobPostingId with validation error', () => {
            fc.assert(
                fc.property(
                    validUuidArbitrary,
                    nonUuidArbitrary,
                    resumeTextArbitrary,
                    (validCandidateId, invalidJobPostingId, resumeText) => {
                        // Construct request body with invalid jobPostingId
                        const requestData = {
                            body: {
                                candidateId: validCandidateId,
                                jobPostingId: invalidJobPostingId,
                                resumeText: resumeText,
                            },
                        };

                        // Attempt to validate - should throw ZodError
                        expect(() => {
                            submitApplicationRequestSchema.parse(requestData);
                        }).toThrow(ZodError);

                        // Verify the error is specifically about jobPostingId
                        try {
                            submitApplicationRequestSchema.parse(requestData);
                            fail('Expected ZodError to be thrown');
                        } catch (error) {
                            expect(error).toBeInstanceOf(ZodError);
                            const zodError = error as ZodError<any>;
                            
                            // Check that the error is related to jobPostingId
                            const jobPostingIdErrors = zodError.issues.filter(
                                (err: any) => err.path.includes('jobPostingId')
                            );
                            expect(jobPostingIdErrors.length).toBeGreaterThan(0);
                        }
                    },
                ),
                { numRuns: 100 },
            );
        });

        it('should reject when both candidateId and jobPostingId are non-UUID strings', () => {
            fc.assert(
                fc.property(
                    nonUuidArbitrary,
                    nonUuidArbitrary,
                    resumeTextArbitrary,
                    (invalidCandidateId, invalidJobPostingId, resumeText) => {
                        // Construct request body with both invalid UUIDs
                        const requestData = {
                            body: {
                                candidateId: invalidCandidateId,
                                jobPostingId: invalidJobPostingId,
                                resumeText: resumeText,
                            },
                        };

                        // Attempt to validate - should throw ZodError
                        expect(() => {
                            submitApplicationRequestSchema.parse(requestData);
                        }).toThrow(ZodError);

                        // Verify the error contains issues for both fields
                        try {
                            submitApplicationRequestSchema.parse(requestData);
                            fail('Expected ZodError to be thrown');
                        } catch (error) {
                            expect(error).toBeInstanceOf(ZodError);
                            const zodError = error as ZodError<any>;
                            
                            // Check that errors exist (at least one of the fields should error)
                            expect(zodError.issues.length).toBeGreaterThan(0);
                            
                            // Verify at least one error is about UUID validation
                            const uuidErrors = zodError.issues.filter(
                                (err: any) => err.path.includes('candidateId') || err.path.includes('jobPostingId')
                            );
                            expect(uuidErrors.length).toBeGreaterThan(0);
                        }
                    },
                ),
                { numRuns: 100 },
            );
        });

        it('should accept valid UUIDs for both candidateId and jobPostingId', () => {
            fc.assert(
                fc.property(
                    validUuidArbitrary,
                    validUuidArbitrary,
                    resumeTextArbitrary,
                    (validCandidateId, validJobPostingId, resumeText) => {
                        // Construct request body with valid UUIDs
                        const requestData = {
                            body: {
                                candidateId: validCandidateId,
                                jobPostingId: validJobPostingId,
                                resumeText: resumeText,
                            },
                        };

                        // Should not throw any error
                        expect(() => {
                            submitApplicationRequestSchema.parse(requestData);
                        }).not.toThrow();

                        // Verify the parsed data matches input
                        const parsed = submitApplicationRequestSchema.parse(requestData);
                        expect(parsed.body.candidateId).toBe(validCandidateId);
                        expect(parsed.body.jobPostingId).toBe(validJobPostingId);
                        expect(parsed.body.resumeText).toBe(resumeText);
                    },
                ),
                { numRuns: 100 },
            );
        });
    });
});
