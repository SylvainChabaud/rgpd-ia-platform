import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jest-environment-node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Si tu utilises des modules ESM, ça aide parfois
  transformIgnorePatterns: ["/node_modules/"],
  // Load .env.test before running tests
  setupFiles: ["<rootDir>/jest.setup.js"],
  // Coverage thresholds (Phase 4.3 - Audit EPICs 1-8)
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 80,
    },
  },
};

export default createJestConfig(customJestConfig);
