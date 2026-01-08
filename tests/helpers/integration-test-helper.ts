/**
 * Integration Test Helper
 *
 * Setup and teardown for integration tests
 * Provides authenticated tokens and test data
 */

export interface TestContext {
  platformAdminToken: string
  platformAdminEmail: string
  tenantAdminToken: string
  tenantAdminEmail: string
  testTenantId: string
  testTenantName: string
}

/**
 * Setup test environment with authenticated users
 *
 * Creates:
 * - PLATFORM admin with JWT token
 * - TENANT admin with JWT token
 * - Test tenant
 */
export async function setupTestEnvironment(): Promise<TestContext> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  // Test credentials (from E2E global setup)
  const platformAdminEmail = 'admin@platform.local'
  const platformAdminPassword = 'AdminPass123!'
  const tenantAdminEmail = 'admin@tenant1.local'
  const tenantAdminPassword = 'AdminPass123!'

  // Login as PLATFORM admin
  const platformLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: platformAdminEmail,
      password: platformAdminPassword,
    }),
  })

  if (!platformLoginResponse.ok) {
    throw new Error(`Platform admin login failed: ${platformLoginResponse.status}`)
  }

  const platformLoginData = await platformLoginResponse.json()
  const platformAdminToken = platformLoginData.token

  // Login as TENANT admin
  const tenantLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: tenantAdminEmail,
      password: tenantAdminPassword,
    }),
  })

  if (!tenantLoginResponse.ok) {
    throw new Error(`Tenant admin login failed: ${tenantLoginResponse.status}`)
  }

  const tenantLoginData = await tenantLoginResponse.json()
  const tenantAdminToken = tenantLoginData.token

  // Get test tenant ID (from TENANT admin user data)
  const testTenantId = tenantLoginData.user.tenantId
  const testTenantName = 'Test Tenant'

  return {
    platformAdminToken,
    platformAdminEmail,
    tenantAdminToken,
    tenantAdminEmail,
    testTenantId,
    testTenantName,
  }
}

/**
 * Teardown test environment
 * Currently no cleanup needed (tests use existing data)
 */
export async function teardownTestEnvironment(_context: TestContext): Promise<void> {
  // No cleanup needed - tests read existing data
  // Future: Clean up test users created during tests
}
