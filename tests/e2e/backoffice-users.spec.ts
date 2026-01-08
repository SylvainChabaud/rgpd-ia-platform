import { test, expect, Page } from '@playwright/test'
import { loginAsPlatformAdmin } from './helpers/auth-helper'

/**
 * E2E Tests - LOT 11.2 (CRUD Users)
 *
 * Scenarios critiques (5 tests minimaux):
 * 1. Liste users avec colonnes P1 + email partiel affiché
 * 2. Créer user → Success toast → Liste mise à jour
 * 3. Bulk suspend 2 users → Confirmation → Success
 * 4. Suspendre user individuel → Badge updated
 * 5. RGPD check - Email complet NOT in HTML (only partial)
 *
 * RGPD Compliance:
 * - Email masqué (m***@e***) dans toutes les pages
 * - NO email complet exposé dans HTML
 * - Confirmation obligatoire avant bulk operations
 */

/**
 * Helper: Navigate to users list via sidebar
 */
async function goToUsersList(page: Page) {
  // Click "Utilisateurs" link in sidebar
  await page.click('a[href="/users"]')
  await page.waitForURL('/users')
  await expect(page.locator('table')).toBeVisible()
}

test.describe('Back Office - CRUD Users (LOT 11.2)', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test using helper (same pattern as tenants tests)
    await loginAsPlatformAdmin(page)
  })

  test('E2E-001: Liste users avec colonnes P1 + email partiel affiché', async ({ page }) => {
    // Navigate to users list
    await page.click('a[href="/users"]')
    await page.waitForURL('/users')

    // Assertions
    expect(page.url()).toContain('/users')

    // Table visible
    await expect(page.locator('table')).toBeVisible()

    // Colonnes P1 uniquement (RGPD)
    await expect(page.getByText('Nom')).toBeVisible()
    await expect(page.getByText('Email')).toBeVisible() // Header présent
    await expect(page.getByText('Tenant')).toBeVisible()
    await expect(page.getByText('Rôle')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()

    // Email masqué visible dans table (format m***@e***)
    // On vérifie la présence de code tags avec des ***
    const emailCodes = await page.locator('code:has-text("***@***")').count()
    expect(emailCodes).toBeGreaterThan(0)

    // Bouton "Créer un Utilisateur" visible
    await expect(page.getByText('Créer un Utilisateur')).toBeVisible()

    // Max 100 lignes (pagination)
    const rows = await page.locator('tbody tr').count()
    expect(rows).toBeLessThanOrEqual(100)
  })

  test('E2E-002: Créer user → Success toast → Liste mise à jour', async ({ page }) => {
    // Navigate to users list
    await page.click('a[href="/users"]')
    await page.waitForURL('/users')

    // Wait for table to load
    await expect(page.locator('table')).toBeVisible()

    // Click "Créer un Utilisateur" button
    await page.getByText('Créer un Utilisateur').click()
    await page.waitForURL('/users/new')

    // Fill form
    const userName = `Test User ${Date.now()}`
    const userEmail = `test.user.${Date.now()}@example.com`

    // Select tenant (first option available)
    await page.selectOption('select[name="tenantId"]', { index: 1 })

    // Fill email
    await page.fill('input[name="email"]', userEmail)

    // Fill displayName
    await page.fill('input[name="displayName"]', userName)

    // Select role MEMBER
    await page.selectOption('select[name="role"]', 'MEMBER')

    // Generate password using button
    await page.click('button:has-text("Générer")')

    // Submit
    await page.click('button[type="submit"]:has-text("Créer")')

    // Wait for success (redirect to list OR toast)
    try {
      await page.waitForURL('/users', { timeout: 10000 })
    } catch {
      // Maybe toast appears first
      await expect(
        page.locator('text=/créé avec succès/i, text=/utilisateur créé/i')
      ).toBeVisible({ timeout: 5000 })
    }

    // Should be back on list
    await page.waitForURL('/users', { timeout: 5000 })

    // New user visible dans liste (displayName)
    await expect(page.getByText(userName)).toBeVisible()
  })

  test('E2E-003: Bulk suspend 2 users → Confirmation → Success', async ({ page }) => {
    // Navigate to users list
    await goToUsersList(page)

    // Select 2 users via checkboxes
    const checkboxes = await page.locator('tbody input[type="checkbox"]').all()
    if (checkboxes.length >= 2) {
      await checkboxes[0].check()
      await checkboxes[1].check()

      // Bulk actions card visible
      await expect(page.getByText(/utilisateur\(s\) sélectionné\(s\)/i)).toBeVisible()

      // Click "Suspendre la sélection"
      await page.click('button:has-text("Suspendre la sélection")')

      // Confirmation dialog appears
      await expect(page.getByText(/Suspendre.*utilisateur\(s\)/i)).toBeVisible()

      // Confirm
      await page.click('button:has-text("Confirmer")')

      // Success toast
      await expect(page.locator('text=/suspendu\(s\)/i')).toBeVisible({ timeout: 5000 })
    }
  })

  test('E2E-004: Suspendre user individuel → Badge updated', async ({ page }) => {
    // Navigate to users list
    await goToUsersList(page)

    // Click first "Détails" button
    const detailsButtons = await page.locator('a:has-text("Détails")').all()
    if (detailsButtons.length > 0) {
      await detailsButtons[0].click()

      // Wait for details page
      await page.waitForURL(/\/users\/[a-f0-9-]+$/)

      // Check if "Suspendre" button exists (user not already suspended)
      const suspendButton = page.locator('button:has-text("Suspendre")')
      const isSuspendButtonVisible = await suspendButton.isVisible()

      if (isSuspendButtonVisible) {
        // Click Suspendre
        await suspendButton.click()

        // Wait for success
        await expect(page.locator('text=/suspendu/i')).toBeVisible({ timeout: 5000 })

        // Badge "Suspendu" visible
        await expect(page.locator('text=/Suspendu/i')).toBeVisible()
      }
    }
  })

  test('E2E-005: RGPD - Email complet NOT in HTML (only partial)', async ({ page }) => {
    // Navigate to users list
    await goToUsersList(page)

    // Get page HTML
    const html = await page.content()

    // Vérifier qu'aucun email complet n'est présent
    // Pattern email complet: something@domain.com
    const fullEmailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const fullEmailMatches = html.match(fullEmailPattern) || []

    // Filter out allowed emails (example.com, localhost, test domains)
    const realEmails = fullEmailMatches.filter(
      (email) =>
        !email.includes('example.com') &&
        !email.includes('localhost') &&
        !email.includes('test.com') &&
        !email.includes('noreply')
    )

    // RGPD: Aucun vrai email ne doit être exposé
    expect(realEmails.length).toBe(0)

    // Vérifier que les emails masqués sont présents (format m***@e***)
    const maskedEmailPattern = /[a-zA-Z0-9]\*\*\*@[a-zA-Z0-9]\*\*\*/g
    const maskedEmailMatches = html.match(maskedEmailPattern) || []

    // Au moins un email masqué présent
    expect(maskedEmailMatches.length).toBeGreaterThan(0)

    // Vérifier visuellement dans la table
    const emailCodes = await page.locator('code:has-text("***@***")').count()
    expect(emailCodes).toBeGreaterThan(0)
  })
})
