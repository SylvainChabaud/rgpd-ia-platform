import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Tests Configuration
 *
 * Tests LOT 11.0 & 11.1 (Back Office Super Admin)
 * - Auth flow (login, logout, session)
 * - CRUD Tenants (liste, création, édition, suppression)
 * - RGPD compliance (P1 data only, confirmations, safe errors)
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Test timeout increased for auth flows
  timeout: 60000,

  // Parallel execution
  fullyParallel: false, // Disabled for now due to auth state issues

  // Fail fast on CI
  forbidOnly: !!process.env.CI,

  // Retry on failures (auth timing issues)
  retries: 2,

  // Workers
  workers: 1, // Sequential for now

  // Reporter
  reporter: 'html',

  // Global setup (seed test data)
  globalSetup: './tests/e2e/setup/global-setup.ts',

  // Shared settings
  use: {
    // Base URL
    baseURL: 'http://localhost:3000',

    // Increased timeouts for auth flows
    navigationTimeout: 30000,
    actionTimeout: 15000,

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on retry
    video: 'retain-on-failure',
  },

  // Projects (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
