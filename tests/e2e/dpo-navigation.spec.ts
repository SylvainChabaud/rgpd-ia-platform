/**
 * E2E Tests - DPO Navigation & RGPD Pages
 *
 * CRITICAL: These tests prevent regression of the session bug where
 * DPO navigating to DPIA/Registre/RGPD pages caused automatic logout.
 *
 * Root cause was:
 * 1. Race condition in layout (checkAuth not awaited)
 * 2. API middleware not reading httpOnly cookies
 *
 * Scenarios:
 * 1. DPO login → Dashboard accessible
 * 2. DPO can navigate to DPIA page (Art. 35)
 * 3. DPO can navigate to Registre page (Art. 30)
 * 4. DPO can navigate to RGPD page (Art. 15-22)
 * 5. DPO session persists across navigation
 *
 * RGPD Compliance:
 * - Art. 35: DPIA management
 * - Art. 30: Registre des traitements
 * - Art. 15-22: Droits des personnes
 */

import { test, expect, Page } from '@playwright/test';
import { AUTH_ROUTES, PORTAL_ROUTES } from '@/lib/constants/routes';
import { TEST_DPO_ACME, E2E_TIMEOUTS } from './constants';

/**
 * Helper: Login as DPO
 */
async function loginAsDpo(page: Page): Promise<void> {
  await page.goto(AUTH_ROUTES.LOGIN, {
    waitUntil: 'domcontentloaded',
    timeout: E2E_TIMEOUTS.NAVIGATION,
  });

  // Clear any existing session
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  await page.waitForSelector('input[type="email"]', { timeout: E2E_TIMEOUTS.ELEMENT });
  await page.fill('input[type="email"]', TEST_DPO_ACME.email);
  await page.fill('input[type="password"]', TEST_DPO_ACME.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to portal
  await page.waitForURL(/\/portal/, {
    timeout: E2E_TIMEOUTS.NAVIGATION,
    waitUntil: 'domcontentloaded',
  });
}

test.describe('DPO Navigation - Session Persistence', () => {
  test.describe('Authentication', () => {
    test('E2E-DPO-001: DPO can login and access dashboard', async ({ page }) => {
      await loginAsDpo(page);

      // Verify we're on portal
      expect(page.url()).toContain('/portal');

      // Verify DPO name is displayed
      await expect(page.getByText(TEST_DPO_ACME.displayName)).toBeVisible();

      // Verify DPO badge in sidebar
      await expect(page.getByText('DPO')).toBeVisible();
    });
  });

  test.describe('DPIA Navigation (Art. 35)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDpo(page);
    });

    test('E2E-DPO-002: DPO can navigate to DPIA page via sidebar', async ({ page }) => {
      // Click DPIA link in sidebar
      await page.getByRole('link', { name: 'DPIA' }).click();

      // Wait for DPIA page to load
      await page.waitForURL(/\/portal\/dpia/, { timeout: E2E_TIMEOUTS.NAVIGATION });

      // Verify DPIA page content
      await expect(page.getByRole('heading', { name: /Analyses d'Impact/i })).toBeVisible();
      await expect(page.getByText('Art. 35 RGPD')).toBeVisible();

      // CRITICAL: Verify session persisted (not redirected to login)
      expect(page.url()).toContain('/portal/dpia');
      expect(page.url()).not.toContain('/login');

      // Verify DPO still logged in
      await expect(page.getByText(TEST_DPO_ACME.displayName)).toBeVisible();
    });

    test('E2E-DPO-003: DPO can access DPIA page via direct URL', async ({ page }) => {
      // Navigate directly to DPIA page
      await page.goto('/portal/dpia', {
        waitUntil: 'domcontentloaded',
        timeout: E2E_TIMEOUTS.NAVIGATION,
      });

      // Wait for page load
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT);

      // CRITICAL: Should NOT be redirected to login
      expect(page.url()).toContain('/portal/dpia');
      expect(page.url()).not.toContain('/login');

      // Verify content
      await expect(page.getByRole('heading', { name: /Analyses d'Impact/i })).toBeVisible();
    });
  });

  test.describe('Registre Navigation (Art. 30)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDpo(page);
    });

    test('E2E-DPO-004: DPO can navigate to Registre page via sidebar', async ({ page }) => {
      // Click Registre link in sidebar
      await page.getByRole('link', { name: 'Registre des Traitements' }).click();

      // Wait for Registre page to load
      await page.waitForURL(/\/portal\/registre/, { timeout: E2E_TIMEOUTS.NAVIGATION });

      // Verify Registre page content
      await expect(page.getByRole('heading', { name: /Registre des Traitements/i })).toBeVisible();
      await expect(page.getByText('Art. 30 RGPD')).toBeVisible();

      // CRITICAL: Verify session persisted
      expect(page.url()).toContain('/portal/registre');
      expect(page.url()).not.toContain('/login');
    });

    test('E2E-DPO-005: DPO can access Registre page via direct URL', async ({ page }) => {
      await page.goto('/portal/registre', {
        waitUntil: 'domcontentloaded',
        timeout: E2E_TIMEOUTS.NAVIGATION,
      });

      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT);

      // CRITICAL: Should NOT be redirected to login
      expect(page.url()).toContain('/portal/registre');
      expect(page.url()).not.toContain('/login');

      await expect(page.getByRole('heading', { name: /Registre des Traitements/i })).toBeVisible();
    });
  });

  test.describe('RGPD Navigation (Art. 15-22)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDpo(page);
    });

    test('E2E-DPO-006: DPO can navigate to RGPD page via sidebar', async ({ page }) => {
      // Click RGPD link in sidebar
      await page.getByRole('link', { name: 'RGPD' }).click();

      // Wait for RGPD page to load
      await page.waitForURL(/\/portal\/rgpd/, { timeout: E2E_TIMEOUTS.NAVIGATION });

      // Verify RGPD page content
      await expect(page.getByRole('heading', { name: /Gestion RGPD/i })).toBeVisible();

      // Verify RGPD articles are displayed
      await expect(page.getByText('Art. 15')).toBeVisible();
      await expect(page.getByText('Art. 17')).toBeVisible();
      await expect(page.getByText('Art. 18')).toBeVisible();
      await expect(page.getByText('Art. 21')).toBeVisible();
      await expect(page.getByText('Art. 22')).toBeVisible();

      // CRITICAL: Verify session persisted
      expect(page.url()).toContain('/portal/rgpd');
      expect(page.url()).not.toContain('/login');
    });

    test('E2E-DPO-007: DPO can access RGPD page via direct URL', async ({ page }) => {
      await page.goto('/portal/rgpd', {
        waitUntil: 'domcontentloaded',
        timeout: E2E_TIMEOUTS.NAVIGATION,
      });

      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT);

      // CRITICAL: Should NOT be redirected to login
      expect(page.url()).toContain('/portal/rgpd');
      expect(page.url()).not.toContain('/login');

      await expect(page.getByRole('heading', { name: /Gestion RGPD/i })).toBeVisible();
    });
  });

  test.describe('Multi-page Navigation (Session Persistence)', () => {
    test('E2E-DPO-008: DPO session persists across multiple page navigations', async ({ page }) => {
      await loginAsDpo(page);

      // Navigate to DPIA
      await page.goto('/portal/dpia');
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT);
      expect(page.url()).toContain('/portal/dpia');
      await expect(page.getByText(TEST_DPO_ACME.displayName)).toBeVisible();

      // Navigate to Registre
      await page.goto('/portal/registre');
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT);
      expect(page.url()).toContain('/portal/registre');
      await expect(page.getByText(TEST_DPO_ACME.displayName)).toBeVisible();

      // Navigate to RGPD
      await page.goto('/portal/rgpd');
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT);
      expect(page.url()).toContain('/portal/rgpd');
      await expect(page.getByText(TEST_DPO_ACME.displayName)).toBeVisible();

      // Navigate back to Dashboard
      await page.goto('/portal/dashboard');
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT);
      expect(page.url()).toContain('/portal/dashboard');
      await expect(page.getByText(TEST_DPO_ACME.displayName)).toBeVisible();

      // CRITICAL: Throughout all navigations, we should never hit /login
    });

    test('E2E-DPO-009: Page reload preserves DPO session', async ({ page }) => {
      await loginAsDpo(page);

      // Navigate to DPIA
      await page.goto('/portal/dpia');
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT);
      expect(page.url()).toContain('/portal/dpia');

      // Reload page
      await page.reload();
      await page.waitForTimeout(E2E_TIMEOUTS.SHORT_WAIT);

      // CRITICAL: Should still be on DPIA page after reload
      expect(page.url()).toContain('/portal/dpia');
      expect(page.url()).not.toContain('/login');

      // Verify content loaded
      await expect(page.getByRole('heading', { name: /Analyses d'Impact/i })).toBeVisible();
    });
  });

  test.describe('Sidebar Navigation Links', () => {
    test('E2E-DPO-010: DPO sidebar shows all required links', async ({ page }) => {
      await loginAsDpo(page);

      // Verify all DPO-relevant links are visible
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Utilisateurs' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Consentements' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'RGPD' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'DPIA' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Registre des Traitements' })).toBeVisible();
    });
  });
});
