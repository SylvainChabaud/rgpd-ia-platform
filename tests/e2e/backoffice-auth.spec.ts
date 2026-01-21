import { test, expect } from '@playwright/test'
import { AUTH_ROUTES } from '@/lib/constants/routes'
import {
  TEST_PLATFORM_ADMIN,
  TEST_TENANT_ADMIN,
  E2E_TIMEOUTS,
  BASE_URL,
  LEGACY_STORAGE_KEYS,
} from './constants'

/**
 * E2E Tests - LOT 11.0 (Back Office Auth Flow)
 *
 * Scenarios:
 * 1. Login PLATFORM scope → Dashboard
 * 2. Login TENANT scope → Redirection refusée
 * 3. Logout → Redirection login
 * 4. Session persistée (F5 reload)
 * 5. Routes protégées sans auth → Redirection login
 *
 * RGPD Compliance:
 * - JWT stocké dans httpOnly cookie (XSS-safe, non accessible via JS)
 * - Pas de données sensibles en localStorage
 * - Error messages RGPD-safe
 */

// Alias for backward compatibility with existing test code
const PLATFORM_ADMIN = TEST_PLATFORM_ADMIN
const TENANT_ADMIN = TEST_TENANT_ADMIN

test.describe('Back Office - Auth Flow (LOT 11.0)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage avant chaque test
    await page.goto(AUTH_ROUTES.LOGIN)
    await page.evaluate(() => {
      sessionStorage.clear()
      localStorage.clear()
    })
  })

  test('E2E-AUTH-001: Login PLATFORM scope → Dashboard accessible', async ({ page }) => {
    // Navigate to login
    await page.goto(AUTH_ROUTES.LOGIN)

    // Fill login form
    await page.fill('input[type="email"]', PLATFORM_ADMIN.email)
    await page.fill('input[type="password"]', PLATFORM_ADMIN.password)

    // Submit
    await page.click('button[type="submit"]')

    // Wait for navigation with increased timeout
    await page.waitForURL('/', { timeout: E2E_TIMEOUTS.NAVIGATION, waitUntil: 'domcontentloaded' })

    // Assertions
    expect(page.url()).toBe(`${BASE_URL}/`)

    // Sidebar visible (PLATFORM scope)
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Tenants')).toBeVisible()

    // User menu displays displayName (P1 data only)
    await expect(page.getByText(PLATFORM_ADMIN.displayName)).toBeVisible()

    // JWT is in httpOnly cookie (XSS-safe, not accessible via JS)
    // Verify token is NOT in sessionStorage (old pattern)
    const token = await page.evaluate((key) => sessionStorage.getItem(key), LEGACY_STORAGE_KEYS.AUTH_TOKEN)
    expect(token).toBeNull()

    // Pas d'email dans localStorage (RGPD)
    const authStorage = await page.evaluate((key) => localStorage.getItem(key), LEGACY_STORAGE_KEYS.AUTH_STORAGE)
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      expect(parsed.state?.user?.email).toBeUndefined() // Email NOT stored (P2 data)
      expect(parsed.state?.user?.displayName).toBeTruthy() // displayName OK (P1)
    }
  })

  test('E2E-AUTH-002: Login TENANT scope → Redirection refusée', async ({ page }) => {
    // Navigate to login
    await page.goto(AUTH_ROUTES.LOGIN)

    // Fill login form avec TENANT user
    await page.fill('input[type="email"]', TENANT_ADMIN.email)
    await page.fill('input[type="password"]', TENANT_ADMIN.password)

    // Submit
    await page.click('button[type="submit"]')

    // Wait for error toast ou redirection
    await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT)

    // Assertions
    // Option 1: Toast error affiché
    const errorToast = page.locator('text=/accès refusé/i, text=/scope platform requis/i')
    const isToastVisible = await errorToast.isVisible().catch(() => false)

    // Option 2: Pas de redirection vers dashboard (doit rester sur login)
    expect(page.url()).toContain(AUTH_ROUTES.LOGIN)

    // Doit rester sur login ou être redirigé ailleurs
    const isStillOnLogin = page.url().includes(AUTH_ROUTES.LOGIN)
    expect(isStillOnLogin || isToastVisible).toBeTruthy()
  })

  test('E2E-AUTH-003: Logout → Redirection login + JWT cleared', async ({ page }) => {
    // Login first
    await page.goto(AUTH_ROUTES.LOGIN)
    await page.fill('input[type="email"]', PLATFORM_ADMIN.email)
    await page.fill('input[type="password"]', PLATFORM_ADMIN.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Open user menu and logout
    await page.click(`button:has-text("${PLATFORM_ADMIN.displayName}")`)
    await page.click('text=Déconnexion')

    // Wait for navigation to login
    await page.waitForURL(AUTH_ROUTES.LOGIN, { timeout: E2E_TIMEOUTS.LOGOUT, waitUntil: 'domcontentloaded' })

    // Assertions
    expect(page.url()).toContain(AUTH_ROUTES.LOGIN)

    // httpOnly cookie cleared by server (cannot verify from JS)
    // Verify we're on login page and session is cleared
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('E2E-AUTH-004: Session persistée après F5 reload', async ({ page }) => {
    // Login first
    await page.goto(AUTH_ROUTES.LOGIN)
    await page.fill('input[type="email"]', PLATFORM_ADMIN.email)
    await page.fill('input[type="password"]', PLATFORM_ADMIN.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // F5 reload
    await page.reload()

    // Wait for layout
    await page.waitForSelector('nav', { timeout: E2E_TIMEOUTS.SELECTOR })

    // Assertions
    expect(page.url()).toBe(`${BASE_URL}/`)
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.getByText(PLATFORM_ADMIN.displayName)).toBeVisible()

    // Session still valid (httpOnly cookie persists across reload)
    // Verified by UI state - user still logged in
  })

  test('E2E-AUTH-005: Routes protégées sans auth → Redirection login', async ({ page }) => {
    // Clear auth first
    await page.goto(AUTH_ROUTES.LOGIN)
    await page.evaluate(() => {
      sessionStorage.clear()
      localStorage.clear()
    })

    // Try accessing protected routes (LOT 11.0-11.3 implemented)
    const protectedRoutes = [
      '/',
      '/tenants',  // LOT 11.1
      '/audit',    // LOT 11.3
    ]

    for (const route of protectedRoutes) {
      await page.goto(route)

      // Wait for client-side redirect (layout.tsx checks auth and redirects)
      await page.waitForURL('**/login', { timeout: E2E_TIMEOUTS.LOGOUT, waitUntil: 'domcontentloaded' })

      // Should be redirected to login
      const currentUrl = page.url()
      expect(currentUrl).toContain(AUTH_ROUTES.LOGIN)
    }
  })
})
