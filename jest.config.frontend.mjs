/**
 * Jest Configuration - Frontend Tests
 *
 * Environment: jsdom (browser simulation)
 * Coverage: Frontend components, pages, client hooks
 * Dependencies: @testing-library/react, userEvent
 */

import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  displayName: {
    name: 'FRONTEND',
    color: 'magenta',
  },

  // jsdom environment for React components
  testEnvironment: 'jest-environment-jsdom',

  // Match only frontend tests (in tests/frontend/ folder)
  // Subfolders: unit/, integration/, rgpd/
  testMatch: [
    '<rootDir>/tests/frontend/**/*.test.{ts,tsx}',
  ],

  // Setup files
  setupFiles: ['<rootDir>/jest.setup.js'], // Loads .env.test
  setupFilesAfterEnv: ['<rootDir>/jest.setup.frontend.ts'],

  // Module resolution (handled by nextJest)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },

  // Coverage configuration - Frontend only
  // Includes: Next.js pages, layouts, React components, client-side hooks
  collectCoverageFrom: [
    'app/**/page.tsx',           // Next.js pages
    'app/**/layout.tsx',          // Next.js layouts
    'src/components/**/*.{ts,tsx}', // React components
    'src/lib/auth/**/*.{ts,tsx}',   // Auth client logic
    'src/lib/api/hooks/**/*.{ts,tsx}', // React Query hooks
    '!**/*.d.ts',                // Exclude type definitions
    '!**/node_modules/**',       // Exclude dependencies
    '!**/__tests__/**',          // Exclude test files
  ],

  coverageDirectory: '<rootDir>/coverage/frontend',
  coverageReporters: ['text', 'lcov', 'json-summary'],

  // Performance
  maxWorkers: '50%',
  testTimeout: 5000, // 5s for UI tests

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/tests/backend/',
    '/tests/helpers/',
  ],

  modulePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],
}

// Next.js wrapper for proper module resolution
export default createJestConfig(config)
