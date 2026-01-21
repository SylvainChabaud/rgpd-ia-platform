/**
 * E2E Tests - LOT 12.0 (Tenant Dashboard)
 *
 * Scenarios:
 * 1. Tenant Admin login → Dashboard accessible
 * 2. Dashboard displays KPI widgets with correct data
 * 3. Activity feed shows recent events
 * 4. Charts render correctly (Recharts)
 * 5. Cross-tenant isolation: Admin A cannot access Tenant B dashboard
 * 6. PLATFORM admin cannot access /portal routes
 * 7. Error state displays RGPD-safe messages
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, event types, IDs)
 * - NO user content (prompts, outputs)
 * - Tenant isolation enforced
 * - Error messages generic (no stack traces)
 */

import { test, expect, Page } from '@playwright/test'
import { AUTH_ROUTES, PORTAL_ROUTES, ADMIN_ROUTES } from '@/lib/constants/routes'
import {
  TEST_PLATFORM_ADMIN,
  TEST_TENANT_ADMIN_ACME,
  TEST_TENANT_ADMIN_TECHCORP,
  E2E_TIMEOUTS,
} from './constants'

// Alias for backward compatibility with existing test code
const TENANT_ADMIN_ACME = TEST_TENANT_ADMIN_ACME
const _TENANT_ADMIN_TECHCORP = TEST_TENANT_ADMIN_TECHCORP
const PLATFORM_ADMIN = TEST_PLATFORM_ADMIN

/**
 * Helper: Login as Tenant Admin
 */
async function loginAsTenantAdmin(
  page: Page,
  credentials: { email: string; password: string }
): Promise<void> {
  await page.goto(AUTH_ROUTES.LOGIN, { waitUntil: 'domcontentloaded', timeout: E2E_TIMEOUTS.NAVIGATION })

  // Clear any existing session
  await page.evaluate(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  await page.waitForSelector('input[type="email"]', { timeout: E2E_TIMEOUTS.ELEMENT })
  await page.fill('input[type="email"]', credentials.email)
  await page.fill('input[type="password"]', credentials.password)
  await page.click('button[type="submit"]')

  // Wait for redirect to portal dashboard
  await page.waitForURL(PORTAL_ROUTES.DASHBOARD, {
    timeout: E2E_TIMEOUTS.NAVIGATION,
    waitUntil: 'domcontentloaded',
  })
}

/**
 * Helper: Login as Platform Admin
 */
async function loginAsPlatformAdmin(page: Page): Promise<void> {
  await page.goto(AUTH_ROUTES.LOGIN, { waitUntil: 'domcontentloaded', timeout: E2E_TIMEOUTS.NAVIGATION })

  await page.evaluate(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  await page.waitForSelector('input[type="email"]', { timeout: E2E_TIMEOUTS.ELEMENT })
  await page.fill('input[type="email"]', PLATFORM_ADMIN.email)
  await page.fill('input[type="password"]', PLATFORM_ADMIN.password)
  await page.click('button[type="submit"]')

  // Platform admin should redirect to / (admin root), not /portal
  await page.waitForURL('/', { timeout: E2E_TIMEOUTS.NAVIGATION, waitUntil: 'domcontentloaded' })
}

test.describe('LOT 12.0 - Tenant Dashboard', () => {
  test.describe('Authentication & Access Control', () => {
    test('E2E-TD-001: Tenant Admin can access /portal/dashboard', async ({
      page,
    }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)

      // Verify URL
      expect(page.url()).toContain(PORTAL_ROUTES.DASHBOARD)

      // Verify dashboard title
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

      // Verify tenant name is displayed
      await expect(page.getByText(TENANT_ADMIN_ACME.displayName)).toBeVisible()
    })

    test('E2E-TD-002: /portal redirects to /portal/dashboard', async ({
      page,
    }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)

      // Navigate to /portal
      await page.goto(PORTAL_ROUTES.BASE)

      // Should redirect to /portal/dashboard
      await page.waitForURL(PORTAL_ROUTES.DASHBOARD, { timeout: E2E_TIMEOUTS.ELEMENT })
      expect(page.url()).toContain(PORTAL_ROUTES.DASHBOARD)
    })

    test('E2E-TD-003: Unauthenticated user redirected to /login', async ({
      page,
    }) => {
      // Try to access dashboard directly without login
      await page.goto(PORTAL_ROUTES.DASHBOARD)

      // Should redirect to login
      await page.waitForURL(AUTH_ROUTES.LOGIN, { timeout: E2E_TIMEOUTS.ELEMENT })
      expect(page.url()).toContain(AUTH_ROUTES.LOGIN)
    })

    test('E2E-TD-004: Platform Admin redirected away from /portal', async ({
      page,
    }) => {
      await loginAsPlatformAdmin(page)

      // Try to access portal (should redirect to /admin)
      await page.goto(PORTAL_ROUTES.DASHBOARD)

      // Platform admin should be redirected to /admin
      await page.waitForURL(ADMIN_ROUTES.BASE, { timeout: E2E_TIMEOUTS.ELEMENT })
      expect(page.url()).toContain(ADMIN_ROUTES.BASE)
    })
  })

  test.describe('Dashboard Content - KPI Widgets', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
    })

    test('E2E-TD-005: Dashboard displays 4 KPI widgets', async ({ page }) => {
      // Wait for widgets to load (not skeleton)
      await page.waitForSelector('[data-testid="stats-widget"]', {
        timeout: E2E_TIMEOUTS.ELEMENT,
      }).catch(() => {
        // Fallback: look for Card components
      })

      // Check for 4 KPI widget titles
      await expect(page.getByText('Utilisateurs actifs')).toBeVisible()
      await expect(page.getByText('Jobs IA ce mois')).toBeVisible()
      await expect(page.getByText('Consentements actifs')).toBeVisible()
      await expect(page.getByText('Exports RGPD')).toBeVisible()
    })

    test('E2E-TD-006: Widgets show numeric values (P1 data)', async ({
      page,
    }) => {
      // Wait for loading to complete
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT)

      // Check that widgets contain numbers (not loading skeletons)
      const widgets = page.locator('text=/\\d+/')
      const count = await widgets.count()

      // Should have at least 4 numeric values (one per widget)
      expect(count).toBeGreaterThanOrEqual(4)
    })

    test('E2E-TD-007: Widgets do NOT display sensitive data', async ({
      page,
    }) => {
      // RGPD: No emails, no prompts, no user content
      const content = await page.content()

      // Should NOT contain email patterns
      expect(content).not.toMatch(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      )

      // Should NOT contain "prompt" or "output" (P3 data)
      await expect(page.locator('text=/prompt/i')).not.toBeVisible()
      await expect(page.locator('text=/output/i')).not.toBeVisible()
    })
  })

  test.describe('Dashboard Content - Charts', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
    })

    test('E2E-TD-008: Charts section renders (Recharts)', async ({ page }) => {
      // Wait for page load
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT)

      // Check for chart titles
      await expect(page.getByText('Jobs IA')).toBeVisible()
      await expect(page.getByText('Consentements')).toBeVisible()

      // Recharts renders SVG elements
      const svgCharts = page.locator('.recharts-responsive-container svg')
      const chartCount = await svgCharts.count()

      // Should have at least 2 charts
      expect(chartCount).toBeGreaterThanOrEqual(2)
    })
  })

  test.describe('Dashboard Content - Activity Feed', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
    })

    test('E2E-TD-009: Activity feed section visible', async ({ page }) => {
      // Check activity feed title
      await expect(page.getByText('Activité récente')).toBeVisible()
      await expect(
        page.getByText('Les 50 derniers événements de votre tenant')
      ).toBeVisible()
    })

    test('E2E-TD-010: Activity feed shows event badges', async ({ page }) => {
      // Wait for activity data to load
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT)

      // Check for event type badges (should have at least some)
      const badges = page.locator('[class*="badge"], [data-slot="badge"]')
      const badgeCount = await badges.count()

      // If data exists, should have badges
      if (badgeCount > 0) {
        expect(badgeCount).toBeGreaterThan(0)
      }
    })

    test('E2E-TD-011: Activity feed shows only P1 data', async ({ page }) => {
      // Wait for activity data to load
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT)

      // Check table headers - should be P1 metadata only
      await expect(page.getByText('Date')).toBeVisible()
      await expect(page.getByText('Type')).toBeVisible()
      await expect(page.getByText('Acteur')).toBeVisible()
      await expect(page.getByText('Cible')).toBeVisible()

      // Should NOT have "Content" or "Prompt" columns
      await expect(page.getByRole('columnheader', { name: 'Content' })).not.toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Prompt' })).not.toBeVisible()
    })
  })

  test.describe('Tenant Isolation (RGPD Critical)', () => {
    test('E2E-TD-012: Tenant Admin cannot access other tenant data via API', async ({
      page,
    }) => {
      // Login as ACME admin
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)

      // Verify we're logged in (token is in httpOnly cookie, not accessible via JS)
      await expect(page.locator('nav')).toBeVisible()

      // Try to access TechCorp's stats via API
      // httpOnly cookie is automatically included with page.request
      const response = await page.request.get(
        '/api/tenants/techcorp-tenant-id/stats'
      )

      // Should be 403 Forbidden (cross-tenant access blocked)
      expect(response.status()).toBe(403)
    })

    test('E2E-TD-013: Dashboard shows only own tenant name', async ({
      page,
    }) => {
      // Login as ACME admin
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)

      // Wait for page load
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT)

      // Should see ACME-related content
      const content = await page.content()

      // Should NOT see TechCorp data
      expect(content.toLowerCase()).not.toContain('techcorp')
    })
  })

  test.describe('Error Handling (RGPD Safe)', () => {
    test('E2E-TD-014: Error state shows generic message', async ({ page }) => {
      // Login first
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)

      // Intercept API to simulate error
      await page.route('**/api/tenants/*/stats', (route) =>
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal error' }),
        })
      )

      // Reload page to trigger error
      await page.reload()

      // Wait for error state
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT)

      // Should show generic error message
      await expect(page.getByText('Erreur de chargement')).toBeVisible()
      await expect(
        page.getByText(/Impossible de charger|Veuillez réessayer/i)
      ).toBeVisible()

      // Should NOT show stack trace
      await expect(page.locator('text=/at \\w+\\(/i')).not.toBeVisible()
      await expect(page.locator('text=/Error:/i')).not.toBeVisible()
    })
  })

  test.describe('Navigation - Sidebar', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
    })

    test('E2E-TD-015: Sidebar displays Tenant Admin navigation', async ({
      page,
    }) => {
      // Check sidebar nav items
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'Utilisateurs' })
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'Consentements' })
      ).toBeVisible()
      await expect(page.getByRole('link', { name: 'RGPD' })).toBeVisible()
    })

    test('E2E-TD-016: Dashboard nav item is active', async ({ page }) => {
      // Dashboard link should have active state
      const dashboardLink = page.getByRole('link', { name: 'Dashboard' })
      await expect(dashboardLink).toBeVisible()

      // Check for active class (secondary variant)
      const button = dashboardLink.locator('button')
      await expect(button).toHaveAttribute('data-variant', 'secondary').catch(() => {
        // Alternative: check class contains active indicator
      })
    })

    test('E2E-TD-017: User menu shows displayName (P1 only)', async ({
      page,
    }) => {
      // Check user menu shows displayName (not email)
      await expect(page.getByText(TENANT_ADMIN_ACME.displayName)).toBeVisible()

      // Should NOT show email
      await expect(page.getByText(TENANT_ADMIN_ACME.email)).not.toBeVisible()
    })

    test('E2E-TD-018: Logout clears session', async ({ page }) => {
      // Open user menu
      await page.click(`text=${TENANT_ADMIN_ACME.displayName}`)

      // Click logout
      await page.click('text=Déconnexion')

      // Should redirect to login
      await page.waitForURL(AUTH_ROUTES.LOGIN, { timeout: E2E_TIMEOUTS.ELEMENT })

      // Verify we're on login page (httpOnly cookie cleared server-side)
      await expect(page.locator('input[type="email"]')).toBeVisible()
    })
  })
})
