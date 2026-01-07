import { test, expect } from '@playwright/test'

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
 * - JWT stocké sessionStorage (cleared on close)
 * - Pas de données sensibles en localStorage
 * - Error messages RGPD-safe
 */

// Mock users (à adapter selon votre DB de test)
const PLATFORM_ADMIN = {
  email: 'admin@platform.local',
  password: 'AdminPass123!',
  displayName: 'Admin Platform',
  scope: 'PLATFORM',
}

const TENANT_ADMIN = {
  email: 'admin@tenant1.local',
  password: 'TenantPass123!',
  displayName: 'Admin Tenant',
  scope: 'TENANT',
}

test.describe('Back Office - Auth Flow (LOT 11.0)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage avant chaque test
    await page.goto('/login')
    await page.evaluate(() => {
      sessionStorage.clear()
      localStorage.clear()
    })
  })

  test('E2E-AUTH-001: Login PLATFORM scope → Dashboard accessible', async ({ page }) => {
    // Navigate to login
    await page.goto('/login')

    // Fill login form
    await page.fill('input[type="email"]', PLATFORM_ADMIN.email)
    await page.fill('input[type="password"]', PLATFORM_ADMIN.password)

    // Submit
    await page.click('button[type="submit"]')

    // Wait for navigation with increased timeout
    await page.waitForURL('/', { timeout: 30000, waitUntil: 'domcontentloaded' })

    // Assertions
    expect(page.url()).toBe('http://localhost:3000/')

    // Sidebar visible (PLATFORM scope)
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Tenants')).toBeVisible()

    // User menu displays displayName (P1 data only)
    await expect(page.getByText(PLATFORM_ADMIN.displayName)).toBeVisible()

    // JWT présent dans sessionStorage
    const token = await page.evaluate(() => sessionStorage.getItem('auth_token'))
    expect(token).toBeTruthy()

    // Pas d'email dans localStorage (RGPD)
    const userData = await page.evaluate(() => localStorage.getItem('auth_user'))
    if (userData) {
      const user = JSON.parse(userData)
      expect(user.email).toBeUndefined() // Email NOT stored (P2 data)
      expect(user.displayName).toBeTruthy() // displayName OK (P1)
    }
  })

  test('E2E-AUTH-002: Login TENANT scope → Redirection refusée', async ({ page }) => {
    // Navigate to login
    await page.goto('/login')

    // Fill login form avec TENANT user
    await page.fill('input[type="email"]', TENANT_ADMIN.email)
    await page.fill('input[type="password"]', TENANT_ADMIN.password)

    // Submit
    await page.click('button[type="submit"]')

    // Wait for error toast ou redirection
    await page.waitForTimeout(2000)

    // Assertions
    // Option 1: Toast error affiché
    const errorToast = page.locator('text=/accès refusé/i, text=/scope platform requis/i')
    const isToastVisible = await errorToast.isVisible().catch(() => false)

    // Option 2: Pas de redirection vers dashboard (doit rester sur login)
    expect(page.url()).toContain('/login')

    // Doit rester sur login ou être redirigé ailleurs
    const isStillOnLogin = page.url().includes('/login')
    expect(isStillOnLogin || isToastVisible).toBeTruthy()
  })

  test('E2E-AUTH-003: Logout → Redirection login + JWT cleared', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', PLATFORM_ADMIN.email)
    await page.fill('input[type="password"]', PLATFORM_ADMIN.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Open user menu and logout
    await page.click('button:has-text("Admin Platform")')
    await page.click('text=Déconnexion')

    // Wait for navigation to /backoffice/login (as per Sidebar.tsx)
    await page.waitForURL('/login', { timeout: 15000, waitUntil: 'domcontentloaded' })

    // Assertions
    expect(page.url()).toContain('/login')

    // JWT cleared from sessionStorage
    const token = await page.evaluate(() => sessionStorage.getItem('auth_token'))
    expect(token).toBeNull()
  })

  test('E2E-AUTH-004: Session persistée après F5 reload', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', PLATFORM_ADMIN.email)
    await page.fill('input[type="password"]', PLATFORM_ADMIN.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // F5 reload
    await page.reload()

    // Wait for layout
    await page.waitForSelector('nav', { timeout: 5000 })

    // Assertions
    expect(page.url()).toBe('http://localhost:3000/')
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.getByText(PLATFORM_ADMIN.displayName)).toBeVisible()

    // JWT toujours présent
    const token = await page.evaluate(() => sessionStorage.getItem('auth_token'))
    expect(token).toBeTruthy()
  })

  test('E2E-AUTH-005: Routes protégées sans auth → Redirection login', async ({ page }) => {
    // Clear auth first
    await page.goto('/login')
    await page.evaluate(() => {
      sessionStorage.clear()
      localStorage.clear()
    })

    // Try accessing protected routes (only test existing pages)
    const protectedRoutes = [
      '/',
      // '/tenants', // Not implemented yet (LOT 11.1)
      // '/audit',   // Not implemented yet (LOT 11.3)
    ]

    for (const route of protectedRoutes) {
      await page.goto(route)

      // Wait for client-side redirect (layout.tsx checks auth and redirects)
      await page.waitForURL('**/login', { timeout: 15000, waitUntil: 'domcontentloaded' })

      // Should be redirected to login
      const currentUrl = page.url()
      expect(currentUrl).toContain('/login')
    }
  })
})
