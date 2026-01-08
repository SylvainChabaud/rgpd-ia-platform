/**
 * Jest Configuration - Integration Tests
 *
 * Tests API endpoints directly (no browser)
 * Requires dev server running: npm run dev
 */

const config = {
  displayName: "INTEGRATION",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: true,
          },
          transform: {
            react: {
              runtime: "automatic",
            },
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  collectCoverageFrom: [
    "app/api/**/*.ts",
    "src/infrastructure/repositories/**/*.ts",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
};

export default config;
