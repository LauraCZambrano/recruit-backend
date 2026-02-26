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

    // Arbitrary for valid UUID
    const validUuidArbitrary = fc.uuid();
    
    // Arbitrary for valid names
    const nameArbitrary = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
    
    // Arbitrary for valid email - more restrictive to match Zod validation
    const emailArbitrary = fc.string({ minLength: 3, maxLength: 50 })
        .filter(s => {
            // Must contain @ and have valid format
            const emailRegex = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
            return emailRegex.test(s);
        });
    
    // Arbitrary for invalid email (string without @)
    const invalidEmailArbitrary = fc.string().filter(s => !s.includes('@') && s.length > 0);

    /**
     * **Feature: application-submission-flow, Property 1: Validación de formato UUID y email**
     * **Validates: Requirements 1.5, 1.6**
     * 
     * For any string that is not a valid UUID used as jobPostingId,
     * or invalid email format, the system must reject the request with a 400 error.
     */
    describe('Property 1: Validación de formato UUID y email', () => {
        it('should reject any non-UUID jobPostingId with validation error', () => {
            fc.assert(
                fc.property(
                    nameArbitrary,
                    nameArbitrary,
                    emailArbitrary,
                    nonUuidArbitrary,
                    resumeTextArbitrary,
                    (firstName, lastName, email, invalidJobPostingId, resumeText) => {
                        // Construct request body with invalid jobPostingId
                        const requestData = {
                            body: {
                                firstName,
                                lastName,
                                email,
                                jobPostingId: invalidJobPostingId,
                                resumeText,
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

        it('should reject invalid email format with validation error', () => {
            fc.assert(
                fc.property(
                    nameArbitrary,
                    nameArbitrary,
                    invalidEmailArbitrary,
                    validUuidArbitrary,
                    resumeTextArbitrary,
                    (firstName, lastName, invalidEmail, jobPostingId, resumeText) => {
                        // Construct request body with invalid email
                        const requestData = {
                            body: {
                                firstName,
                                lastName,
                                email: invalidEmail,
                                jobPostingId,
                                resumeText,
                            },
                        };

                        // Attempt to validate - should throw ZodError
                        expect(() => {
                            submitApplicationRequestSchema.parse(requestData);
                        }).toThrow(ZodError);

                        // Verify the error is specifically about email
                        try {
                            submitApplicationRequestSchema.parse(requestData);
                            fail('Expected ZodError to be thrown');
                        } catch (error) {
                            expect(error).toBeInstanceOf(ZodError);
                            const zodError = error as ZodError<any>;
                            
                            // Check that the error is related to email
                            const emailErrors = zodError.issues.filter(
                                (err: any) => err.path.includes('email')
                            );
                            expect(emailErrors.length).toBeGreaterThan(0);
                        }
                    },
                ),
                { numRuns: 100 },
            );
        });

        it('should reject when required fields are missing', () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.constant({}),
                        fc.constant({ firstName: 'John' }),
                        fc.constant({ firstName: 'John', lastName: 'Doe' }),
                        fc.constant({ firstName: 'John', lastName: 'Doe', email: 'john@example.com' }),
                    ),
                    (incompleteBody) => {
                        // Construct request with incomplete body
                        const requestData = {
                            body: incompleteBody,
                        };

                        // Attempt to validate - should throw ZodError
                        expect(() => {
                            submitApplicationRequestSchema.parse(requestData);
                        }).toThrow(ZodError);
                    },
                ),
                { numRuns: 100 },
            );
        });

        it('should accept valid data with all required fields', () => {
            fc.assert(
                fc.property(
                    nameArbitrary,
                    nameArbitrary,
                    emailArbitrary,
                    validUuidArbitrary,
                    resumeTextArbitrary,
                    (firstName, lastName, email, jobPostingId, resumeText) => {
                        // Construct request body with valid data
                        const requestData = {
                            body: {
                                firstName,
                                lastName,
                                email,
                                jobPostingId,
                                resumeText,
                            },
                        };

                        // Should not throw any error
                        expect(() => {
                            submitApplicationRequestSchema.parse(requestData);
                        }).not.toThrow();

                        // Verify the parsed data matches input
                        const parsed = submitApplicationRequestSchema.parse(requestData);
                        expect(parsed.body.firstName).toBe(firstName);
                        expect(parsed.body.lastName).toBe(lastName);
                        expect(parsed.body.email).toBe(email);
                        expect(parsed.body.jobPostingId).toBe(jobPostingId);
                        expect(parsed.body.resumeText).toBe(resumeText);
                    },
                ),
                { numRuns: 100 },
            );
        });
    });
});
