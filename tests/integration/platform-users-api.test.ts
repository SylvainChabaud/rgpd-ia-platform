/**
 * Platform Users API Integration Tests (LOT 11.2)
 *
 * Tests d'intégration pour les endpoints /api/platform/users
 * Alternative stable aux tests E2E Playwright
 *
 * Scenarios testés:
 * 1. Liste users cross-tenant (PLATFORM admin uniquement)
 * 2. Création user dans n'importe quel tenant
 * 3. Vérification RGPD (P1 data uniquement)
 * 4. Contrôle d'accès (403 pour TENANT admin)
 * 5. Validation des données (email unique, password fort)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { setupTestEnvironment, teardownTestEnvironment, TestContext } from '../helpers/integration-test-helper'
import { ACTOR_ROLE } from '@/shared/actorRole'

let testContext: TestContext

beforeAll(async () => {
  testContext = await setupTestEnvironment()
})

afterAll(async () => {
  await teardownTestEnvironment(testContext)
})

describe('Platform Users API - GET /api/platform/users', () => {
  it('INTEG-001: Should list users cross-tenant for PLATFORM admin', async () => {
    const response = await fetch('http://localhost:3000/api/platform/users?limit=10&offset=0', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('users')
    expect(Array.isArray(data.users)).toBe(true)
    expect(data.users.length).toBeGreaterThan(0)

    // Verify P1 data only (RGPD compliance)
    const firstUser = data.users[0]
    expect(firstUser).toHaveProperty('id')
    expect(firstUser).toHaveProperty('displayName')
    expect(firstUser).toHaveProperty('tenantId')
    expect(firstUser).toHaveProperty('scope')
    expect(firstUser).toHaveProperty('role')
    expect(firstUser).toHaveProperty('createdAt')

    // CRITICAL: NO P2/P3 data
    expect(firstUser).not.toHaveProperty('email')
    expect(firstUser).not.toHaveProperty('emailHash')
    expect(firstUser).not.toHaveProperty('passwordHash')
    expect(firstUser).not.toHaveProperty('password')
  })

  it('INTEG-002: Should return 403 for TENANT admin (cross-tenant not allowed)', async () => {
    const response = await fetch('http://localhost:3000/api/platform/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.tenantAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(403)

    const data = await response.json()
    expect(data.error).toContain('PLATFORM scope required')
  })

  it('INTEG-003: Should filter by tenant', async () => {
    const response = await fetch(
      `http://localhost:3000/api/platform/users?tenantId=${testContext.testTenantId}&limit=10`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testContext.platformAdminToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.users).toBeDefined()

    // All users should belong to the filtered tenant
    data.users.forEach((user: { tenantId: string }) => {
      expect(user.tenantId).toBe(testContext.testTenantId)
    })
  })

  it('INTEG-004: Should filter by role', async () => {
    const response = await fetch('http://localhost:3000/api/platform/users?role=ADMIN&limit=10', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.users).toBeDefined()

    // All users should have ADMIN role
    data.users.forEach((user: { role: string }) => {
      expect(user.role).toBe(ACTOR_ROLE.ADMIN)
    })
  })

  it('INTEG-005: Should return 401 for unauthenticated request', async () => {
    const response = await fetch('http://localhost:3000/api/platform/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // NO Authorization header
      },
    })

    expect(response.status).toBe(401)
  })
})

describe('Platform Users API - POST /api/platform/users', () => {
  it('INTEG-006: Should create user in any tenant (PLATFORM admin)', async () => {
    const newUser = {
      email: `test-${Date.now()}@example.com`,
      displayName: 'Test User Integration',
      tenantId: testContext.testTenantId,
      role: ACTOR_ROLE.MEMBER,
      password: 'SecurePass123!@#',
    }

    const response = await fetch('http://localhost:3000/api/platform/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    })

    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data).toHaveProperty('userId')
    expect(data.displayName).toBe(newUser.displayName)
    expect(data.role).toBe(newUser.role)
    expect(data.tenantId).toBe(newUser.tenantId)

    // CRITICAL: Email REDACTED in response (RGPD)
    expect(data.email).toBe('[REDACTED]')
  })

  it('INTEG-007: Should return 403 for TENANT admin (cannot create cross-tenant)', async () => {
    const newUser = {
      email: `tenant-test-${Date.now()}@example.com`,
      displayName: 'Tenant Test User',
      tenantId: testContext.testTenantId,
      role: ACTOR_ROLE.MEMBER,
      password: 'SecurePass123!@#',
    }

    const response = await fetch('http://localhost:3000/api/platform/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.tenantAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    })

    expect(response.status).toBe(403)
  })

  it('INTEG-008: Should reject duplicate email (409 Conflict)', async () => {
    const duplicateUser = {
      email: testContext.platformAdminEmail, // Email already exists
      displayName: 'Duplicate Test',
      tenantId: testContext.testTenantId,
      role: ACTOR_ROLE.MEMBER,
      password: 'SecurePass123!@#',
    }

    const response = await fetch('http://localhost:3000/api/platform/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duplicateUser),
    })

    expect(response.status).toBe(409)

    const data = await response.json()
    expect(data.error).toContain('already exists')
  })

  it('INTEG-009: Should reject weak password (400 Validation)', async () => {
    const weakPasswordUser = {
      email: `weak-${Date.now()}@example.com`,
      displayName: 'Weak Password Test',
      tenantId: testContext.testTenantId,
      role: ACTOR_ROLE.MEMBER,
      password: 'weak', // Too short, no uppercase, no digit, no special
    }

    const response = await fetch('http://localhost:3000/api/platform/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(weakPasswordUser),
    })

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it('INTEG-010: Should reject invalid tenant ID (400 Validation)', async () => {
    const invalidTenantUser = {
      email: `invalid-${Date.now()}@example.com`,
      displayName: 'Invalid Tenant Test',
      tenantId: 'not-a-uuid', // Invalid UUID
      role: ACTOR_ROLE.MEMBER,
      password: 'SecurePass123!@#',
    }

    const response = await fetch('http://localhost:3000/api/platform/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidTenantUser),
    })

    expect(response.status).toBe(400)
  })
})

describe('RGPD Compliance - Data Classification', () => {
  it('INTEG-011: Should NEVER return email in GET response', async () => {
    const response = await fetch('http://localhost:3000/api/platform/users?limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    const allUsers = data.users

    // Verify NO email in any user object
    allUsers.forEach((user: Record<string, unknown>) => {
      expect(user.email).toBeUndefined()
      expect(user.emailHash).toBeUndefined()
      expect(user.password).toBeUndefined()
      expect(user.passwordHash).toBeUndefined()
    })

    // Verify response body doesn't contain email-like patterns
    const responseText = JSON.stringify(data)
    expect(responseText).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i)
  })

  it('INTEG-012: Should return [REDACTED] email in POST response', async () => {
    const newUser = {
      email: `rgpd-test-${Date.now()}@example.com`,
      displayName: 'RGPD Test User',
      tenantId: testContext.testTenantId,
      role: ACTOR_ROLE.MEMBER,
      password: 'SecurePass123!@#',
    }

    const response = await fetch('http://localhost:3000/api/platform/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    })

    const data = await response.json()

    // CRITICAL: Email must be REDACTED
    expect(data.email).toBe('[REDACTED]')

    // Verify response body doesn't contain actual email
    const responseText = JSON.stringify(data)
    expect(responseText).not.toContain(newUser.email)
  })

  it('INTEG-013: Should include dataSuspended fields (Art. 18 RGPD)', async () => {
    const response = await fetch('http://localhost:3000/api/platform/users?limit=10', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.platformAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    const firstUser = data.users[0]

    // RGPD Art. 18 - Suspension fields must be present
    expect(firstUser).toHaveProperty('dataSuspended')
    expect(firstUser).toHaveProperty('dataSuspendedAt')

    // Values should be boolean and ISO date or null
    expect(typeof firstUser.dataSuspended).toBe('boolean')
    if (firstUser.dataSuspendedAt !== null) {
      expect(new Date(firstUser.dataSuspendedAt).toISOString()).toBe(firstUser.dataSuspendedAt)
    }
  })
})

describe('Security - Access Control', () => {
  it('INTEG-014: Should enforce PLATFORM scope check', async () => {
    // Try with TENANT admin token
    const response = await fetch('http://localhost:3000/api/platform/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.tenantAdminToken}`,
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(403)

    const data = await response.json()
    expect(data.error).toContain('PLATFORM scope required')
  })

  it('INTEG-015: Should reject invalid JWT token', async () => {
    const response = await fetch('http://localhost:3000/api/platform/users', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token-123',
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(401)
  })
})
