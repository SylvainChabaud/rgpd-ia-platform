/**
 * Jest Configuration - Backend Tests
 *
 * Environment: Node.js (no jsdom)
 * Coverage: Backend code only (infrastructure, domain, API routes)
 * Database: Requires PostgreSQL running (loaded via .env.test)
 */

const backendConfig = {
  displayName: {
    name: 'BACKEND',
    color: 'blue',
  },

  // Node environment for backend tests
  testEnvironment: 'node',

  // Match backend tests (all tests except those in frontend/ folder)
  testMatch: [
    '<rootDir>/tests/backend/**/*.test.{ts,tsx}',
  ],

  // Exclude frontend tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/tests/frontend/', // Exclude all frontend tests
  ],

  // Transform TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: false,
        },
        transform: null,
      },
    }],
  },

  // Module resolution
  moduleNameMapper: {
    '^@/middleware$': '<rootDir>/middleware.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },

  // Setup files
  setupFiles: ['<rootDir>/jest.setup.js'], // Loads .env.test
  setupFilesAfterEnv: ['<rootDir>/jest.setup.backend.ts'],

  // Coverage configuration - Backend only
  // Includes: Infrastructure, domain logic, API routes, middleware
  collectCoverageFrom: [
    'src/infrastructure/**/*.{ts,tsx}', // Database, repositories, external services
    'src/domain/**/*.{ts,tsx}',         // Business logic, use cases
    'src/lib/**/*.{ts,tsx}',            // Shared utilities, helpers
    'src/middleware/**/*.{ts,tsx}',     // Auth, CORS, tenant middleware
    'app/api/**/*.{ts,tsx}',            // Next.js API routes
    '!**/*.d.ts',                       // Exclude type definitions
    '!**/node_modules/**',              // Exclude dependencies
    '!**/__tests__/**',                 // Exclude test files
  ],

  coverageDirectory: '<rootDir>/coverage/backend',
  coverageReporters: ['text', 'lcov', 'json-summary'],

  // Performance
  maxWorkers: '50%',
  testTimeout: 10000, // 10s for database operations

  // Module paths to ignore (build artifacts)
  modulePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],

}

export default backendConfig
