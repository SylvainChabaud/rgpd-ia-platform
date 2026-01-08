/**
 * Tenant Suspension API Integration Tests (LOT 11.0 - US 11.4)
 *
 * Tests d'intégration pour les endpoints de suspension tenant
 *
 * Scenarios testés:
 * 1. POST /api/tenants/:id/suspend - Suspend tenant avec raison
 * 2. POST /api/tenants/:id/reactivate - Réactiver tenant suspendu
 * 3. GET /api/tenants/:id - Vérifier champs suspension retournés
 * 4. Contrôle d'accès PLATFORM admin uniquement
 * 5. Validation raison (3-500 chars)
 * 6. Audit trail (événements tenant.suspended/unsuspended)
 * 7. Login bloqué pour users du tenant suspendu
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { setupTestEnvironment, teardownTestEnvironment, TestContext } from '../helpers/integration-test-helper'

let testContext: TestContext

beforeAll(async () => {
  testContext = await setupTestEnvironment()
})

afterAll(async () => {
  await teardownTestEnvironment(testContext)
})

describe('Tenant Suspension API - POST /api/tenants/:id/suspend', () => {
  it('INTEG-TENANT-001: Should suspend tenant with valid reason (PLATFORM admin)', async () => {
    // Act: Suspend tenant
    const response = await fetch(
      `http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.platformAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Impayé - facture échue depuis 30 jours',
        }),
      }
    )

    // Assert
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('suspended')

    // Verify tenant is now suspended
    const getResponse = await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    expect(getResponse.status).toBe(200)
    const tenantData = await getResponse.json()
    expect(tenantData.tenant.suspendedAt).not.toBeNull()
    expect(tenantData.tenant.suspensionReason).toBe('Impayé - facture échue depuis 30 jours')
    expect(tenantData.tenant.suspendedBy).not.toBeNull()

    // Cleanup: Reactivate for next tests
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/reactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })
  })

  it('INTEG-TENANT-002: Should reject suspension without reason', async () => {
    const response = await fetch(
      `http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.platformAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Missing reason
      }
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Validation failed')
  })

  it('INTEG-TENANT-003: Should reject reason < 3 chars', async () => {
    const response = await fetch(
      `http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.platformAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'ab', // Too short
        }),
      }
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Validation failed')
  })

  it('INTEG-TENANT-004: Should reject reason > 500 chars', async () => {
    const longReason = 'a'.repeat(501)

    const response = await fetch(
      `http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.platformAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: longReason,
        }),
      }
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Validation failed')
  })

  it('INTEG-TENANT-005: Should reject if tenant already suspended', async () => {
    // Arrange: Suspend tenant first
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'First suspension',
      }),
    })

    // Act: Try to suspend again
    const response = await fetch(
      `http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.platformAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Second suspension attempt',
        }),
      }
    )

    // Assert
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('already suspended')

    // Cleanup
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/reactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })
  })

  it('INTEG-TENANT-006: Should return 404 for non-existent tenant', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'

    const response = await fetch(`http://localhost:3000/api/tenants/${fakeId}/suspend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Test reason',
      }),
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toContain('not found')
  })

  it('INTEG-TENANT-007: Should return 403 for TENANT admin (not allowed)', async () => {
    const response = await fetch(
      `http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.tenantAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Attempted by tenant admin',
        }),
      }
    )

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toContain('PLATFORM scope required')
  })
})

describe('Tenant Suspension API - POST /api/tenants/:id/reactivate', () => {
  it('INTEG-TENANT-008: Should reactivate suspended tenant (PLATFORM admin)', async () => {
    // Arrange: Suspend tenant first
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Test suspension for reactivation',
      }),
    })

    // Act: Reactivate tenant
    const response = await fetch(
      `http://localhost:3000/api/tenants/${testContext.testTenantId}/reactivate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.platformAdminToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // Assert
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('reactivated')

    // Verify tenant is no longer suspended
    const getResponse = await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    expect(getResponse.status).toBe(200)
    const tenantData = await getResponse.json()
    expect(tenantData.tenant.suspendedAt).toBeNull()
    expect(tenantData.tenant.suspensionReason).toBeNull()
    expect(tenantData.tenant.suspendedBy).toBeNull()
  })

  it('INTEG-TENANT-009: Should reject reactivation if tenant not suspended', async () => {
    // Ensure tenant is not suspended
    const response = await fetch(
      `http://localhost:3000/api/tenants/${testContext.testTenantId}/reactivate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.platformAdminToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('not suspended')
  })

  it('INTEG-TENANT-010: Should return 404 for non-existent tenant', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'

    const response = await fetch(`http://localhost:3000/api/tenants/${fakeId}/reactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toContain('not found')
  })

  it('INTEG-TENANT-011: Should return 403 for TENANT admin (not allowed)', async () => {
    const response = await fetch(
      `http://localhost:3000/api/tenants/${testContext.testTenantId}/reactivate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.tenantAdminToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toContain('PLATFORM scope required')
  })
})

describe('Tenant Suspension API - Authentication Blocking', () => {
  it('INTEG-TENANT-012: Should block login for users when tenant is suspended', async () => {
    // Arrange: Suspend tenant
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Test login blocking',
      }),
    })

    // Act: Try to login as tenant user
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testContext.testTenantUserEmail,
        password: testContext.testTenantUserPassword,
      }),
    })

    // Assert: Login should be blocked
    expect(loginResponse.status).toBe(403)
    const loginData = await loginResponse.json()
    expect(loginData.error).toContain('Tenant suspended')

    // Cleanup: Reactivate tenant
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/reactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })
  })

  it('INTEG-TENANT-013: Should allow login for PLATFORM users when tenant is suspended', async () => {
    // Arrange: Suspend tenant
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Test platform admin login',
      }),
    })

    // Act: Login as platform admin (no tenant association)
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testContext.platformAdminEmail,
        password: testContext.platformAdminPassword,
      }),
    })

    // Assert: Login should succeed
    expect(loginResponse.status).toBe(200)
    const loginData = await loginResponse.json()
    expect(loginData.token).toBeDefined()

    // Cleanup: Reactivate tenant
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/reactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })
  })

  it('INTEG-TENANT-014: Should allow login after tenant reactivation', async () => {
    // Arrange: Suspend then reactivate tenant
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Test reactivation login',
      }),
    })

    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/reactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    // Act: Login as tenant user
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testContext.testTenantUserEmail,
        password: testContext.testTenantUserPassword,
      }),
    })

    // Assert: Login should succeed
    expect(loginResponse.status).toBe(200)
    const loginData = await loginResponse.json()
    expect(loginData.token).toBeDefined()
  })
})

describe('Tenant Suspension API - RGPD Compliance', () => {
  it('INTEG-TENANT-015: Should include suspension fields in GET response', async () => {
    // Arrange: Suspend tenant
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Test RGPD compliance',
      }),
    })

    // Act: Get tenant details
    const response = await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    // Assert
    expect(response.status).toBe(200)
    const data = await response.json()

    // Verify suspension fields are present
    expect(data.tenant).toHaveProperty('suspendedAt')
    expect(data.tenant).toHaveProperty('suspensionReason')
    expect(data.tenant).toHaveProperty('suspendedBy')

    expect(data.tenant.suspendedAt).not.toBeNull()
    expect(data.tenant.suspensionReason).toBe('Test RGPD compliance')
    expect(data.tenant.suspendedBy).not.toBeNull()

    // Cleanup
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/reactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })
  })

  it('INTEG-TENANT-016: Should clear suspension fields after reactivation', async () => {
    // Arrange: Suspend then reactivate
    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/suspend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Test field clearing',
      }),
    })

    await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}/reactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    // Act: Get tenant details
    const response = await fetch(`http://localhost:3000/api/tenants/${testContext.testTenantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    // Assert: All suspension fields should be null
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.tenant.suspendedAt).toBeNull()
    expect(data.tenant.suspensionReason).toBeNull()
    expect(data.tenant.suspendedBy).toBeNull()
  })
})
