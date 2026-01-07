import { test, expect } from '@playwright/test'

/**
 * Quick Check - Verify LOT 11.0 & 11.1 basics work
 *
 * This is a fast smoke test to verify:
 * 1. Auth works (storageState)
 * 2. Pages exist and load
 * 3. Basic navigation works
 */

test.describe('Quick Check', () => {
  test('Can access tenants list page', async ({ page }) => {
    // Navigate directly (auth from storageState)
    await page.goto('/tenants')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Verify we're on the right page (not redirected to login)
    expect(page.url()).toContain('/tenants')

    // Verify table or "Créer Tenant" button exists
    const hasTable = await page.locator('table').isVisible().catch(() => false)
    const hasCreateButton = await page.getByRole('button', { name: /créer tenant/i }).isVisible().catch(() => false)

    expect(hasTable || hasCreateButton).toBe(true)
  })

  test('Can access tenant creation page', async ({ page }) => {
    await page.goto('/tenants/new')
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/tenants/new')

    // Verify form exists
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[name="slug"]')).toBeVisible({ timeout: 5000 })
  })
})
