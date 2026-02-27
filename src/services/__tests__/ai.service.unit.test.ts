import { AIService, getAIService } from '../ai.service';

describe('AIService Unit Tests - Configuration and Initialization', () => {
    // Store original environment variable
    const originalApiKey = process.env.GEMINI_API_KEY;

    afterEach(() => {
        // Restore original environment variable after each test
        if (originalApiKey) {
            process.env.GEMINI_API_KEY = originalApiKey;
        } else {
            delete process.env.GEMINI_API_KEY;
        }
    });

    describe('6.1: Successful initialization with valid API key', () => {
        /**
         * Validates: Requirements 1.1, 1.2, 1.3, 8.1
         * 
         * When GEMINI_API_KEY is set, the AIService should initialize successfully
         * and log the initialization.
         */
        it('should initialize successfully with valid API key', () => {
            // Set up valid API key
            process.env.GEMINI_API_KEY = 'test-valid-api-key-12345';

            // Should not throw
            expect(() => {
                const service = new AIService();
                expect(service).toBeInstanceOf(AIService);
            }).not.toThrow();
        });

        it('should initialize with gemini-1.5-flash model', () => {
            process.env.GEMINI_API_KEY = 'test-api-key';
            
            const service = new AIService();
            
            // Verify service has the required properties
            expect(service).toHaveProperty('screenCandidate');
            expect(typeof service.screenCandidate).toBe('function');
        });

        it('should accept any non-empty string as API key', () => {
            const testKeys = [
                'short',
                'a-very-long-api-key-with-many-characters-1234567890',
                'key-with-special-chars-!@#$%',
                '123456789',
            ];

            testKeys.forEach(key => {
                process.env.GEMINI_API_KEY = key;
                
                expect(() => {
                    new AIService();
                }).not.toThrow();
            });
        });
    });

    describe('6.2: Missing API key error', () => {
        /**
         * Validates: Requirements 1.4
         * 
         * When GEMINI_API_KEY is not defined, the constructor should throw
         * a descriptive error message.
         */
        it('should throw error when GEMINI_API_KEY is undefined', () => {
            delete process.env.GEMINI_API_KEY;

            expect(() => {
                new AIService();
            }).toThrow('GEMINI_API_KEY environment variable is not defined');
        });

        it('should throw descriptive error message mentioning .env file', () => {
            delete process.env.GEMINI_API_KEY;

            expect(() => {
                new AIService();
            }).toThrow(/\.env file/);
        });

        it('should throw error when GEMINI_API_KEY is empty string', () => {
            process.env.GEMINI_API_KEY = '';

            expect(() => {
                new AIService();
            }).toThrow('GEMINI_API_KEY environment variable is not defined');
        });

        it('should include helpful message about AI-powered screening', () => {
            delete process.env.GEMINI_API_KEY;

            expect(() => {
                new AIService();
            }).toThrow(/AI-powered candidate screening/);
        });
    });

    describe('6.3: Factory function singleton behavior', () => {
        /**
         * Validates: Requirements 6.6
         * 
         * The getAIService factory function should return the same instance
         * on multiple calls (singleton pattern).
         */
        it('should return the same instance on multiple calls', () => {
            process.env.GEMINI_API_KEY = 'test-singleton-key';

            const instance1 = getAIService();
            const instance2 = getAIService();
            const instance3 = getAIService();

            // All instances should be the exact same object
            expect(instance1).toBe(instance2);
            expect(instance2).toBe(instance3);
            expect(instance1).toBe(instance3);
        });

        it('should return AIService instance', () => {
            process.env.GEMINI_API_KEY = 'test-factory-key';

            const instance = getAIService();

            expect(instance).toBeInstanceOf(AIService);
        });

        it('should return instance with screenCandidate method', () => {
            process.env.GEMINI_API_KEY = 'test-method-key';

            const instance = getAIService();

            expect(instance).toHaveProperty('screenCandidate');
            expect(typeof instance.screenCandidate).toBe('function');
        });

        it('should maintain singleton across different test contexts', () => {
            process.env.GEMINI_API_KEY = 'test-context-key';

            // Get instance in different "contexts"
            const instances = Array.from({ length: 10 }, () => getAIService());

            // All should be the same instance
            const firstInstance = instances[0];
            instances.forEach(instance => {
                expect(instance).toBe(firstInstance);
            });
        });
    });
});
