import { test, expect } from '@playwright/test'

/**
 * Test minimal pour débugger
 */
test.describe('Debug Simple', () => {
  test('Can login and see dashboard', async ({ page }) => {
    // Login manual (pas via helper)
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    
    // Attendre le form
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 })
    await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 10000 })
    await page.waitForTimeout(500)
    
    // Remplir
    await page.fill('input[type="email"]', 'admin@platform.local')
    await page.fill('input[type="password"]', 'AdminPass123!')
    
    // Submit
    await page.click('button[type="submit"]')
    
    // Wait navigation
    await page.waitForURL('/', { timeout: 30000 })
    
    // Check sidebar
    await page.waitForSelector('nav', { timeout: 10000 })
    
    // Screenshot pour voir
    await page.screenshot({ path: 'test-results/debug-dashboard.png', fullPage: true })
    
    // Check link Tenants existe
    const tenantsLink = await page.locator('text="Tenants"').count()
    console.log('Tenants link count:', tenantsLink)
    
    // Try to click
    if (tenantsLink > 0) {
      await page.click('text="Tenants"')
      await page.waitForURL('/tenants', { timeout: 10000 })
      
      // Screenshot page tenants
      await page.screenshot({ path: 'test-results/debug-tenants-page.png', fullPage: true })
      
      // Check table
      const hasTable = await page.locator('table').isVisible()
      console.log('Table visible:', hasTable)
      
      // Check button
      const hasButton = await page.getByRole('button', { name: /créer tenant/i }).isVisible().catch(() => false)
      console.log('Create button visible:', hasButton)
      
      expect(hasTable).toBe(true)
    } else {
      throw new Error('Tenants link not found')
    }
  })
})
