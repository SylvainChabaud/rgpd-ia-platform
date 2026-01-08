/**
 * E2E Auth Helper
 * 
 * Provides reusable authentication functions for E2E tests
 */

import { Page, expect } from '@playwright/test'

export const TEST_USERS = {
  PLATFORM_ADMIN: {
    email: 'admin@platform.local',
    password: 'AdminPass123!',
    displayName: 'Admin Platform',
    scope: 'PLATFORM',
  },
  TENANT_ADMIN: {
    email: 'admin@tenant1.local',
    password: 'TenantPass123!',
    displayName: 'Admin Tenant',
    scope: 'TENANT',
  },
}

/**
 * Login helper - matches pattern from backoffice-auth.spec.ts
 */
export async function loginAsPlatformAdmin(page: Page): Promise<void> {
  // Navigate to login
  await page.goto('/login')

  // Fill login form
  await page.fill('input[type="email"]', TEST_USERS.PLATFORM_ADMIN.email)
  await page.fill('input[type="password"]', TEST_USERS.PLATFORM_ADMIN.password)

  // Submit
  await page.click('button[type="submit"]')

  // Wait for navigation with increased timeout
  await page.waitForURL('/', { timeout: 30000, waitUntil: 'domcontentloaded' })

  // Assertions
  expect(page.url()).toBe('http://localhost:3000/')

  // Sidebar visible (PLATFORM scope)
  await expect(page.locator('nav')).toBeVisible()

  // JWT présent dans sessionStorage
  const token = await page.evaluate(() => sessionStorage.getItem('auth_token'))
  expect(token).toBeTruthy()
}

/**
 * Login helper for TENANT admin
 */
export async function loginAsTenantAdmin(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.evaluate(() => {
    sessionStorage.clear()
    localStorage.clear()
  })
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })
  await page.fill('input[type="email"]', TEST_USERS.TENANT_ADMIN.email)
  await page.fill('input[type="password"]', TEST_USERS.TENANT_ADMIN.password)
  await page.click('button[type="submit"]')
  // Note: TENANT users should be rejected, so no waitForURL here
}

/**
 * Logout helper
 */
export async function logout(page: Page): Promise<void> {
  // Open user menu
  await page.click('button:has-text("Admin Platform")')
  
  // Click logout
  await page.click('text=Déconnexion')
  
  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 10000 })
  
  // Verify JWT cleared
  const token = await page.evaluate(() => sessionStorage.getItem('auth_token'))
  expect(token).toBeNull()
}

/**
 * Verify user is authenticated
 */
export async function verifyAuthenticated(page: Page): Promise<void> {
  // Check URL is not /login
  expect(page.url()).not.toContain('/login')
  
  // Check nav is visible
  await expect(page.locator('nav')).toBeVisible()
  
  // Check JWT present
  const token = await page.evaluate(() => sessionStorage.getItem('auth_token'))
  expect(token).toBeTruthy()
}
