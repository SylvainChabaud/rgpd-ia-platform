import { test as setup } from '@playwright/test'
import path from 'path'
import { AUTH_ROUTES } from '@/lib/constants/routes'
import { TEST_PLATFORM_ADMIN, E2E_TIMEOUTS } from '../constants'

/**
 * Global Auth Setup
 *
 * This setup file creates an authenticated storage state that can be reused
 * across all tests, avoiding the need to login in every test's beforeEach.
 *
 * Benefits:
 * - Faster test execution (login once, reuse everywhere)
 * - More reliable (no timing issues with repeated logins)
 * - Better isolation (each test gets fresh browser context with auth)
 */

const authFile = path.join(__dirname, '../.auth/platform-admin.json')

setup('authenticate as PLATFORM admin', async ({ page }) => {
  // Navigate to login
  await page.goto(AUTH_ROUTES.LOGIN)

  // Fill login form
  await page.fill('input[type="email"]', TEST_PLATFORM_ADMIN.email)
  await page.fill('input[type="password"]', TEST_PLATFORM_ADMIN.password)

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: E2E_TIMEOUTS.ELEMENT })

  // Verify we're logged in
  await page.waitForSelector('nav', { timeout: E2E_TIMEOUTS.SELECTOR })

  // Save authenticated state
  await page.context().storageState({ path: authFile })
})
