import { test as setup } from '@playwright/test'
import path from 'path'

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
  await page.goto('/login')

  // Fill login form
  await page.fill('input[type="email"]', 'admin@platform.local')
  await page.fill('input[type="password"]', 'AdminPass123!')
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: 10000 })

  // Verify we're logged in
  await page.waitForSelector('nav', { timeout: 5000 })

  // Save authenticated state
  await page.context().storageState({ path: authFile })
})
