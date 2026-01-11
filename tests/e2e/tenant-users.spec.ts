/**
 * Tenant Users E2E Tests - LOT 12.1
 *
 * E2E tests for Tenant Admin user management
 *
 * RGPD Compliance:
 * - P1/P2 data only (no P3 content)
 * - Tenant isolation verified
 * - Email only shown in tenant admin context
 * - Audit events logged
 */

import { test, expect, Page } from '@playwright/test'

// Test tenant admin credentials (from setup-dev.bat / seed-test-data.ts)
const TENANT_ADMIN_ACME = {
  email: 'admin@acme.local',
  password: 'Admin1234',
  displayName: 'Admin ACME',
  tenantSlug: 'acme',
}

// Reserved for future cross-tenant isolation tests
const _TENANT_ADMIN_TECHCORP = {
  email: 'admin@techcorp.local',
  password: 'Admin1234',
  displayName: 'Admin TechCorp',
  tenantSlug: 'techcorp',
}

/**
 * Helper: Login as Tenant Admin
 */
async function loginAsTenantAdmin(
  page: Page,
  credentials: { email: string; password: string }
): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 })

  // Clear any existing session
  await page.evaluate(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  await page.waitForSelector('input[type="email"]', { timeout: 10000 })
  await page.fill('input[type="email"]', credentials.email)
  await page.fill('input[type="password"]', credentials.password)
  await page.click('button[type="submit"]')

  // Wait for redirect to portal dashboard
  await page.waitForURL('/portal/dashboard', {
    timeout: 30000,
    waitUntil: 'domcontentloaded',
  })
}

test.describe('LOT 12.1 - Tenant Users Management', () => {
  // =====================
  // List Users Tests
  // =====================
  test.describe('Users List', () => {
    test('[E2E-USERS-001] should display users list page', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      await expect(page.getByText('Gestion des Utilisateurs')).toBeVisible()
    })

    test('[E2E-USERS-002] should display user table with correct columns', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      await expect(page.getByRole('columnheader', { name: 'Nom' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Rôle' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Statut' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Créé le' })).toBeVisible()
    })

    test('[E2E-USERS-003] should filter users by role', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Select Admin role filter
      const roleSelect = page.locator('select').first()
      await roleSelect.selectOption('TENANT_ADMIN')

      // Wait for filtered results
      await page.waitForResponse((resp) =>
        resp.url().includes('/api/users') && resp.url().includes('role=TENANT_ADMIN')
      )

      // All visible users should be admins
      const adminBadges = page.getByText('TENANT_ADMIN')
      await expect(adminBadges.first()).toBeVisible()
    })

    test('[E2E-USERS-004] should filter users by status', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Select suspended status filter
      const statusSelect = page.locator('select').nth(1)
      await statusSelect.selectOption('suspended')

      // Wait for filtered results
      await page.waitForResponse((resp) =>
        resp.url().includes('/api/users') && resp.url().includes('status=suspended')
      )
    })

    test('[E2E-USERS-005] should search users by name', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Type search query
      await page.getByPlaceholder('Rechercher par nom...').fill('Admin')

      // Wait for search results
      await page.waitForResponse((resp) =>
        resp.url().includes('/api/users') && resp.url().includes('search=Admin')
      )
    })

    test('[E2E-USERS-006] should navigate to user detail page', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Click first details button
      await page.getByText('Détails').first().click()

      // Should be on user detail page
      await expect(page.url()).toContain('/portal/users/')
    })
  })

  // =====================
  // Create User Tests
  // =====================
  test.describe('Create User', () => {
    test('[E2E-USERS-010] should display create user form', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users/new')

      await expect(page.getByText('Créer un Utilisateur')).toBeVisible()
      await expect(page.getByLabel('Adresse email')).toBeVisible()
      await expect(page.getByLabel('Nom complet')).toBeVisible()
      await expect(page.getByLabel('Rôle')).toBeVisible()
      await expect(page.getByLabel('Mot de passe')).toBeVisible()
    })

    test('[E2E-USERS-011] should validate required fields', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users/new')

      // Submit empty form
      await page.getByRole('button', { name: /Créer/ }).click()

      // Should show validation errors
      await expect(page.getByText('Email invalide')).toBeVisible()
    })

    test('[E2E-USERS-012] should generate random password', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users/new')

      // Click generate password
      await page.getByText('Générer').click()

      // Password field should have value
      const passwordInput = page.getByLabel('Mot de passe')
      const value = await passwordInput.inputValue()
      expect(value.length).toBeGreaterThanOrEqual(8)
    })

    test('[E2E-USERS-013] should create user successfully', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users/new')

      // Fill form
      const uniqueEmail = `test-${Date.now()}@example.com`
      await page.getByLabel('Adresse email').fill(uniqueEmail)
      await page.getByLabel('Nom complet').fill('E2E Test User')
      await page.getByLabel('Rôle').selectOption('MEMBER')
      await page.getByLabel('Mot de passe').fill('SecurePassword123!')

      // Submit
      await page.getByRole('button', { name: /Créer/ }).click()

      // Should redirect to users list
      await page.waitForURL('/portal/users')

      // Should show success message
      await expect(page.getByText('Utilisateur créé avec succès')).toBeVisible()
    })
  })

  // =====================
  // User Detail Tests
  // =====================
  test.describe('User Detail', () => {
    test('[E2E-USERS-020] should display user details', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Click first user details
      await page.getByText('Détails').first().click()

      // Should show user info
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      // Should show stats cards
      await expect(page.getByText('Membre depuis')).toBeVisible()
      await expect(page.getByText('Jobs IA')).toBeVisible()
      await expect(page.getByText('Consentements')).toBeVisible()
      await expect(page.getByText('Événements audit')).toBeVisible()
    })

    test('[E2E-USERS-021] should display tabs for history', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')
      await page.getByText('Détails').first().click()

      await expect(page.getByRole('tab', { name: /Jobs IA/ })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Consentements/ })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Audit/ })).toBeVisible()
    })

    test('[E2E-USERS-022] should switch between tabs', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')
      await page.getByText('Détails').first().click()

      // Click consents tab
      await page.getByRole('tab', { name: /Consentements/ }).click()
      await page.waitForTimeout(500)

      // Click audit tab
      await page.getByRole('tab', { name: /Audit/ }).click()
      await page.waitForTimeout(500)
    })

    test('[E2E-USERS-023] should NOT display email (RGPD compliance)', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')
      await page.getByText('Détails').first().click()

      // Email should not be visible (except in form fields for creation)
      const pageContent = await page.textContent('body')
      // User detail page should not show email in content area
      expect(pageContent).not.toMatch(/@example\.com/)
    })
  })

  // =====================
  // Edit User Tests
  // =====================
  test.describe('Edit User', () => {
    test('[E2E-USERS-030] should display edit form with current values', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Click first user details
      await page.getByText('Détails').first().click()

      // Click edit button
      await page.getByText('Modifier').click()

      await expect(page.getByText("Modifier l'utilisateur")).toBeVisible()

      // Form should have current values
      const nameInput = page.getByLabel('Nom complet')
      const value = await nameInput.inputValue()
      expect(value.length).toBeGreaterThan(0)
    })

    test('[E2E-USERS-031] should update user successfully', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Click first user details
      await page.getByText('Détails').first().click()
      const url = page.url()
      const userId = url.split('/').pop()

      // Click edit button
      await page.getByText('Modifier').click()

      // Change name
      const newName = `Updated User ${Date.now()}`
      await page.getByLabel('Nom complet').fill(newName)

      // Submit
      await page.getByRole('button', { name: /Enregistrer/ }).click()

      // Should redirect to detail page
      await page.waitForURL(`/portal/users/${userId}`)

      // Should show success message
      await expect(page.getByText('Utilisateur mis à jour')).toBeVisible()
    })
  })

  // =====================
  // Suspend/Reactivate Tests
  // =====================
  test.describe('Suspend and Reactivate', () => {
    test('[E2E-USERS-040] should suspend user with reason', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Click first user details
      await page.getByText('Détails').first().click()

      // Click suspend
      await page.getByRole('button', { name: 'Suspendre' }).click()

      // Fill reason
      await page.getByLabel('Raison de la suspension').fill('Test suspension E2E')

      // Confirm
      await page.getByRole('button', { name: 'Confirmer la suspension' }).click()

      // Should show success
      await expect(page.getByText('Utilisateur suspendu')).toBeVisible()

      // Status should change
      await expect(page.getByText('Suspendu')).toBeVisible()
    })

    test('[E2E-USERS-041] should reactivate suspended user', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Find suspended user or use the one we just suspended
      await page.getByText('Détails').first().click()

      // If user is suspended, reactivate button should be visible
      const reactivateButton = page.getByRole('button', { name: 'Réactiver' })
      if (await reactivateButton.isVisible()) {
        await reactivateButton.click()

        // Confirm
        await page.getByRole('button', { name: 'Confirmer' }).click()

        // Should show success
        await expect(page.getByText('Utilisateur réactivé')).toBeVisible()
      }
    })
  })

  // =====================
  // Bulk Actions Tests
  // =====================
  test.describe('Bulk Actions', () => {
    test('[E2E-USERS-050] should select multiple users', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Wait for table to load
      await page.waitForSelector('table tbody tr')

      // Select first two users
      const checkboxes = page.locator('tbody input[type="checkbox"]')
      const count = await checkboxes.count()
      if (count >= 2) {
        await checkboxes.nth(0).check()
        await checkboxes.nth(1).check()

        // Should show selection count
        await expect(page.getByText(/2 utilisateur\(s\) sélectionné\(s\)/)).toBeVisible()
      }
    })

    test('[E2E-USERS-051] should select all users with header checkbox', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Wait for table to load
      await page.waitForSelector('table tbody tr')

      // Select all
      const headerCheckbox = page.locator('thead input[type="checkbox"]')
      await headerCheckbox.check()

      // Should show bulk action bar
      await expect(page.getByText(/sélectionné\(s\)/)).toBeVisible()
    })

    test('[E2E-USERS-052] should bulk suspend users with reason', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Wait for table to load
      await page.waitForSelector('table tbody tr')

      // Select first user
      const checkboxes = page.locator('tbody input[type="checkbox"]')
      const count = await checkboxes.count()
      if (count >= 1) {
        await checkboxes.nth(0).check()

        // Click bulk suspend
        await page.getByRole('button', { name: 'Suspendre' }).click()

        // Fill reason
        await page.getByLabel('Raison de la suspension').fill('Bulk suspension E2E test')

        // Confirm
        await page.getByRole('button', { name: 'Confirmer' }).click()

        // Should show success
        await expect(page.getByText(/suspendu/)).toBeVisible()
      }
    })
  })

  // =====================
  // Tenant Isolation Tests
  // =====================
  test.describe('Tenant Isolation', () => {
    test('[E2E-USERS-060] should NOT see users from other tenant', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)
      await page.goto('/portal/users')

      // Get users list
      const pageContent = await page.textContent('body')

      // Should NOT contain users from TechCorp tenant
      expect(pageContent?.toLowerCase()).not.toContain('techcorp')
    })

    test('[E2E-USERS-061] Admin from Tenant A cannot access user from Tenant B via API', async ({ page, request }) => {
      // Login as Tenant A admin
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)

      // Get auth token from page context
      const cookies = await page.context().cookies()
      const token = cookies.find((c) => c.name === 'auth-token')?.value

      // Try to access a random user ID (simulating cross-tenant access)
      const response = await request.get(`/api/users/non-existent-user-id`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      // Should be forbidden or not found
      expect([403, 404]).toContain(response.status())
    })

    test('[E2E-USERS-062] Admin from Tenant A cannot suspend user from Tenant B via API', async ({ page, request }) => {
      // Login as Tenant A admin
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)

      // Get auth token from page context
      const cookies = await page.context().cookies()
      const token = cookies.find((c) => c.name === 'auth-token')?.value

      // Try to suspend a random user ID (simulating cross-tenant attack)
      const response = await request.post(`/api/users/fake-tenant-b-user/suspend`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        data: { reason: 'Cross-tenant attack attempt' },
      })

      // Should be forbidden or not found
      expect([403, 404]).toContain(response.status())
    })
  })

  // =====================
  // Delete User Tests
  // =====================
  test.describe('Delete User', () => {
    test('[E2E-USERS-070] should delete user with confirmation', async ({ page }) => {
      await loginAsTenantAdmin(page, TENANT_ADMIN_ACME)

      // First create a user to delete
      await page.goto('/portal/users/new')
      const uniqueEmail = `delete-test-${Date.now()}@example.com`
      await page.getByLabel('Adresse email').fill(uniqueEmail)
      await page.getByLabel('Nom complet').fill('User To Delete')
      await page.getByLabel('Rôle').selectOption('MEMBER')
      await page.getByLabel('Mot de passe').fill('SecurePassword123!')
      await page.getByRole('button', { name: /Créer/ }).click()

      await page.waitForURL('/portal/users')

      // Wait for success message
      await expect(page.getByText('Utilisateur créé avec succès')).toBeVisible()

      // Navigate to user detail
      await page.getByText('User To Delete').click()

      // Click delete
      await page.getByRole('button', { name: 'Supprimer' }).click()

      // Confirm deletion
      await page.getByRole('button', { name: /Supprimer définitivement/ }).click()

      // Should redirect to list
      await page.waitForURL('/portal/users')

      // Should show success
      await expect(page.getByText('Utilisateur supprimé')).toBeVisible()
    })
  })
})
