import { test, expect } from '@playwright/test'
import { loginAsPlatformAdmin } from './helpers/auth-helper'

/**
 * E2E Tests - RGPD Compliance (LOT 11.0 & 11.1)
 *
 * Scenarios:
 * 1. Page liste affiche UNIQUEMENT P1 (pas d'emails)
 * 2. Error messages RGPD-safe (pas de stack trace)
 * 3. Delete confirmation explicite (protection erreur)
 * 4. Notice audit trail visible dans forms
 * 5. Pas de logs sensitive data dans console browser
 *
 * RGPD Articles:
 * - Art. 5.1.c: Minimisation données (P1 uniquement)
 * - Art. 25: Privacy by Design (confirmations, validations)
 * - Art. 32: Sécurité (error messages safe)
 * - Art. 13-14: Transparence (audit trail notices)
 */

test.describe('Back Office - RGPD Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test using helper
    await loginAsPlatformAdmin(page)
  })

  test('E2E-RGPD-001: Liste tenants affiche UNIQUEMENT P1 (Art. 5.1.c)', async ({ page }) => {
    // Navigate to tenants list via menu click (preserve session)
    await page.click('text=/tenants/i')
    await page.waitForURL('**/tenants', { timeout: 10000 })

    // Assertions: P1 data uniquement
    await expect(page.getByText('Nom')).toBeVisible()
    await expect(page.getByText('Slug')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()

    // FORBIDDEN: P2/P3 data (emails, user content, passwords)
    const sensitivePatterns = [
      /@[a-z0-9.-]+\.[a-z]{2,}/i, // Email pattern
      /password|mdp|pwd/i,
      /secret|token|key/i,
      /credit.*card|carte.*bancaire/i,
    ]

    for (const pattern of sensitivePatterns) {
      const matches = await page.locator(`text=${pattern}`).count()
      expect(matches).toBe(0)
    }

    // Check table cells content (should NOT contain @)
    const tableCells = await page.locator('tbody td').allTextContents()
    const hasEmails = tableCells.some((text) => text.includes('@'))
    expect(hasEmails).toBe(false)

    // Dashboard stats = aggregated counts (RGPD OK)
    await page.goto('/')
    const statsNumbers = await page.locator('[class*="font-bold"]').allTextContents()
    // Stats should be numbers, not sensitive data
    // Note: Some might be empty, so we check that none contain emails
    const hasEmailsInStats = statsNumbers.some((text) => text.includes('@'))
    expect(hasEmailsInStats).toBe(false)
  })

  test('E2E-RGPD-002: Error messages RGPD-safe (Art. 32)', async ({ page }) => {
    // Navigate to create tenant avec slug invalide
    await page.goto('/tenants/new')

    // Fill invalid data
    await page.fill('input[name="name"]', 'Test')
    await page.fill('input[name="slug"]', 'INVALID SLUG!')

    // Submit
    await page.click('button[type="submit"]')

    // Wait for error message
    await page.waitForTimeout(2000)

    // Assertions: Error message doit être RGPD-safe
    const pageContent = await page.content()

    // FORBIDDEN: Stack traces (expose internal architecture)
    expect(pageContent).not.toMatch(/at\s+\w+\s+\([^)]+:\d+:\d+\)/i) // Stack trace pattern
    expect(pageContent).not.toContain('node_modules')
    expect(pageContent).not.toContain('webpack')
    expect(pageContent).not.toContain('__webpack')

    // FORBIDDEN: Internal error details
    expect(pageContent).not.toMatch(/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i)
    expect(pageContent).not.toMatch(/SQL|PostgreSQL|pg\.|database error/i)
    expect(pageContent).not.toContain('localhost:')
    expect(pageContent).not.toMatch(/port \d{4,5}/i)

    // ALLOWED: User-friendly error messages
    const validErrorPatterns = [
      /format invalide/i,
      /champ requis/i,
      /erreur/i,
      /échec/i,
      /veuillez/i,
    ]

    const hasUserFriendlyError = validErrorPatterns.some((pattern) => pattern.test(pageContent))
    expect(hasUserFriendlyError).toBe(true)
  })

  test('E2E-RGPD-003: Delete confirmation explicite (Art. 25 Privacy by Design)', async ({
    page,
  }) => {
    // Navigate to tenant details
    await page.goto('/tenants')
    await page.locator('tbody tr').first().click()
    await page.waitForURL(/\/tenants\/[a-f0-9-]+$/)

    // Scroll to delete button
    await page.locator('text=/zone de danger/i').scrollIntoViewIfNeeded()

    // Click delete button
    await page.click('button:has-text("Supprimer")')

    // Assertions: Confirmation dialog OBLIGATOIRE
    await expect(page.locator('text=/confirmer la suppression/i')).toBeVisible()

    // Warning "irréversible" visible
    await expect(page.locator('text=/irréversible/i')).toBeVisible()

    // Liste impacts visible (users, données, historique)
    await expect(page.locator('ul li')).toHaveCount(3, { timeout: 5000 })

    // Bouton "Annuler" visible (allow escape)
    await expect(page.getByRole('button', { name: /annuler/i })).toBeVisible()

    // Bouton "Confirmer" visible
    await expect(
      page.getByRole('button', { name: /confirmer|supprimer/i }).last()
    ).toBeVisible()

    // Cancel (don't actually delete)
    await page.click('button:has-text("Annuler")')

    // Dialog closed
    await expect(page.locator('text=/confirmer la suppression/i')).not.toBeVisible()
  })

  test('E2E-RGPD-004: Notice audit trail visible (Art. 13-14 Transparence)', async ({ page }) => {
    // Navigate to create tenant form
    await page.goto('/tenants/new')

    // Assertions: Notice RGPD visible
    const rgpdNoticePatterns = [
      /audit/i,
      /traçabilité/i,
      /enregistré/i,
      /logged/i,
      /conformité/i,
    ]

    let foundNotice = false
    for (const pattern of rgpdNoticePatterns) {
      const isVisible = await page.locator(`text=${pattern}`).isVisible().catch(() => false)
      if (isVisible) {
        foundNotice = true
        break
      }
    }

    // Au moins une mention audit/traçabilité
    expect(foundNotice).toBe(true)

    // Navigate to edit form
    await page.goto('/tenants')
    await page.locator('tbody tr').first().click()
    await page.click('button:has-text("Modifier"), a:has-text("Modifier")')

    // Notice également visible dans edit form
    foundNotice = false
    for (const pattern of rgpdNoticePatterns) {
      const isVisible = await page.locator(`text=${pattern}`).isVisible().catch(() => false)
      if (isVisible) {
        foundNotice = true
        break
      }
    }

    expect(foundNotice).toBe(true)
  })

  test('E2E-RGPD-005: Pas de logs sensitive data dans console browser', async ({ page }) => {
    const consoleLogs: string[] = []
    const consoleErrors: string[] = []

    // Capture console logs
    page.on('console', (msg) => {
      const text = msg.text()
      if (msg.type() === 'log') {
        consoleLogs.push(text)
      } else if (msg.type() === 'error') {
        consoleErrors.push(text)
      }
    })

    // Navigate through entire flow
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@platform.local')
    await page.fill('input[type="password"]', 'AdminPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await page.goto('/tenants/new')
    await page.fill('input[name="name"]', 'Test RGPD Logs')
    await page.fill('input[name="slug"]', 'test-rgpd-logs')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Assertions: Console logs RGPD-safe
    const allLogs = [...consoleLogs, ...consoleErrors].join(' ')

    // FORBIDDEN: Passwords logged
    expect(allLogs).not.toContain('AdminPass123!')
    expect(allLogs).not.toMatch(/password.*[:=]\s*\w+/i)

    // FORBIDDEN: JWT tokens logged
    expect(allLogs).not.toMatch(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/) // JWT pattern

    // FORBIDDEN: Emails logged (except in safe contexts like "user logged in")
    const emailMatches = allLogs.match(/@[a-z0-9.-]+\.[a-z]{2,}/gi) || []
    // Allow max 1 email mention (e.g., "User admin@platform.local logged in" is OK)
    expect(emailMatches.length).toBeLessThanOrEqual(1)

    // FORBIDDEN: Database queries logged
    expect(allLogs).not.toMatch(/SELECT.*FROM|INSERT INTO|UPDATE.*SET|DELETE FROM/i)

    // FORBIDDEN: API keys logged
    expect(allLogs).not.toMatch(/api[_-]?key.*[:=]\s*\w+/i)

    // ALLOWED: Technical logs (debug, info, warnings)
    // console.log('[DEBUG] Component mounted') → OK
    // console.error('Fetch failed') → OK
  })
})
