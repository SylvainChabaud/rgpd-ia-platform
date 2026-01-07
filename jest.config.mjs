/**
 * Jest Configuration - Root (Projects Mode)
 *
 * Uses Jest Projects to separate backend and frontend test environments:
 * - BACKEND: Node.js environment for API, domain, infrastructure tests
 * - FRONTEND: jsdom environment for React component tests
 *
 * Run all tests: npm test
 * Run backend only: npm run test:backend
 * Run frontend only: npm run test:frontend
 */

const rootConfig = {
  projects: [
    '<rootDir>/jest.config.backend.mjs',
    '<rootDir>/jest.config.frontend.mjs',
  ],

  // Global coverage aggregation
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],

  // Coverage thresholds (Phase 4.3 - Audit EPICs 1-8)
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 80,
    },
  },
}

export default rootConfig
