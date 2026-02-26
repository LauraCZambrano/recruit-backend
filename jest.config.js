export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: {
                    module: 'esnext',
                    moduleResolution: 'bundler',
                    experimentalDecorators: true,
                    emitDecoratorMetadata: true,
                },
            },
        ],
    },
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    maxWorkers: 1, // Run tests serially to avoid database deadlocks
    testTimeout: 60000, // Increase timeout for property-based tests
    // Note: Some tests may fail when run together due to TypeORM connection lifecycle
    // If you encounter "Failed to connect to test database" errors, run test suites individually:
    // npm test -- <test-file-name>
};
