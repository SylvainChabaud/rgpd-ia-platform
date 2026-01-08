import { test } from '@playwright/test'

test('Debug: Check what page shows', async ({ page }) => {
  await page.goto('/tenants')
  await page.waitForLoadState('networkidle')

  // Log URL
  console.log('Current URL:', page.url())

  // Log page title
  console.log('Page title:', await page.title())

  // Log body text (first 500 chars)
  const bodyText = await page.locator('body').textContent()
  console.log('Body text:', bodyText?.substring(0, 500))

  // Screenshot
  await page.screenshot({ path: 'debug-tenants-page.png', fullPage: true })
})
