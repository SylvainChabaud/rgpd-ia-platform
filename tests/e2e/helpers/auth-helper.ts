/**
 * E2E Auth Helper
 *
 * Provides reusable authentication functions for E2E tests
 *
 * SECURITY: JWT tokens are stored in httpOnly cookies (not accessible via JS)
 * Authentication is verified by checking UI state (URL, visible elements)
 */

import { Page, expect } from '@playwright/test'
import { AUTH_ROUTES } from '@/lib/constants/routes'
import {
  TEST_PLATFORM_ADMIN,
  TEST_TENANT_ADMIN,
  E2E_TIMEOUTS,
  BASE_URL,
  LEGACY_STORAGE_KEYS,
} from '../constants'

// Re-export for backward compatibility
export const TEST_USERS = {
  PLATFORM_ADMIN: TEST_PLATFORM_ADMIN,
  TENANT_ADMIN: TEST_TENANT_ADMIN,
}

/**
 * Login helper - matches pattern from backoffice-auth.spec.ts
 * Token is set in httpOnly cookie by server (not accessible via JS)
 */
export async function loginAsPlatformAdmin(page: Page): Promise<void> {
  // Navigate to login
  await page.goto(AUTH_ROUTES.LOGIN)

  // Fill login form
  await page.fill('input[type="email"]', TEST_PLATFORM_ADMIN.email)
  await page.fill('input[type="password"]', TEST_PLATFORM_ADMIN.password)

  // Submit
  await page.click('button[type="submit"]')

  // Wait for navigation with increased timeout
  await page.waitForURL('/', { timeout: E2E_TIMEOUTS.NAVIGATION, waitUntil: 'domcontentloaded' })

  // Assertions
  expect(page.url()).toBe(`${BASE_URL}/`)

  // Sidebar visible (PLATFORM scope) - proves auth succeeded
  await expect(page.locator('nav')).toBeVisible()

  // JWT is in httpOnly cookie (not accessible via JS) - verify no token in storage
  const token = await page.evaluate((key) => sessionStorage.getItem(key), LEGACY_STORAGE_KEYS.AUTH_TOKEN)
  expect(token).toBeNull() // Token is in httpOnly cookie, not sessionStorage
}

/**
 * Login helper for TENANT admin
 */
export async function loginAsTenantAdmin(page: Page): Promise<void> {
  await page.goto(AUTH_ROUTES.LOGIN, { waitUntil: 'domcontentloaded', timeout: E2E_TIMEOUTS.NAVIGATION })
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.waitForSelector('input[type="email"]', { timeout: E2E_TIMEOUTS.ELEMENT })
  await page.fill('input[type="email"]', TEST_TENANT_ADMIN.email)
  await page.fill('input[type="password"]', TEST_TENANT_ADMIN.password)
  await page.click('button[type="submit"]')
  // Note: TENANT users should be rejected, so no waitForURL here
}

/**
 * Logout helper
 * Server clears httpOnly cookies on logout
 */
export async function logout(page: Page): Promise<void> {
  // Open user menu
  await page.click(`button:has-text("${TEST_PLATFORM_ADMIN.displayName}")`)

  // Click logout
  await page.click('text=Déconnexion')

  // Wait for redirect to login
  await page.waitForURL(AUTH_ROUTES.LOGIN, { timeout: E2E_TIMEOUTS.ELEMENT })

  // Verify we're on login page (cookies cleared server-side)
  expect(page.url()).toContain(AUTH_ROUTES.LOGIN)
}

/**
 * Verify user is authenticated
 * Authentication is verified by UI state (not token in storage)
 */
export async function verifyAuthenticated(page: Page): Promise<void> {
  // Check URL is not /login
  expect(page.url()).not.toContain(AUTH_ROUTES.LOGIN)

  // Check nav is visible (proves user is authenticated)
  await expect(page.locator('nav')).toBeVisible()
}
