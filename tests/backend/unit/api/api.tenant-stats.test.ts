/**
 * Tenant Stats API Tests - LOT 12.0
 *
 * Tests for GET /api/tenants/:id/stats
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, metadata)
 * - No sensitive user content
 * - Tenant isolation enforced
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockQuery = jest.fn();

jest.mock('@/infrastructure/db/pool', () => ({
  getPool: () => ({
    query: mockQuery,
  }),
}));

// Import route handler AFTER mocking
import { GET } from '@app/api/tenants/[id]/stats/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const OTHER_TENANT_ID = 'tenant-xyz-456';

function createPlatformAdminRequest(tenantId: string): NextRequest {
  const token = signJwt({
    userId: 'superadmin-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.SUPERADMIN,
  });
  return new NextRequest(`http://localhost/api/tenants/${tenantId}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createTenantAdminRequest(tenantId: string, userTenantId: string): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: userTenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(`http://localhost/api/tenants/${tenantId}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createMemberRequest(tenantId: string, userTenantId: string): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: userTenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(`http://localhost/api/tenants/${tenantId}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// =============================================================================
// SAMPLE DATA
// =============================================================================

function setupMockResponses(tenantExists: boolean = true) {
  mockQuery
    // Tenant exists check
    .mockResolvedValueOnce({ rows: tenantExists ? [{ id: TEST_TENANT_ID }] : [] })
    // Users
    .mockResolvedValueOnce({ rows: [{ active: '50', suspended: '3', total: '53' }] })
    // AI Jobs
    .mockResolvedValueOnce({ rows: [{ success: '200', failed: '5', total: '205' }] })
    // Consents
    .mockResolvedValueOnce({ rows: [{ granted: '45', revoked: '2', pending: '6' }] })
    // RGPD Exports
    .mockResolvedValueOnce({ rows: [{ pending: '2', completed: '10' }] })
    // RGPD Deletions
    .mockResolvedValueOnce({ rows: [{ pending: '1', completed: '5' }] });
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/tenants/:id/stats - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[TENANT-STATS-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest(`http://localhost/api/tenants/${TEST_TENANT_ID}/stats`);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(401);
  });

  it('[TENANT-STATS-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(403);
  });

  it('[TENANT-STATS-003] should allow TENANT_ADMIN for their own tenant', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(200);
  });

  it('[TENANT-STATS-004] should return 403 for TENANT_ADMIN accessing other tenant', async () => {
    mockQuery.mockReset();
    // No need to setup tenant check since cross-tenant check happens before DB query

    const req = createTenantAdminRequest(OTHER_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(OTHER_TENANT_ID));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toContain('Access denied');
  });

  it('[TENANT-STATS-005] should allow PLATFORM SUPERADMIN to access any tenant', async () => {
    const req = createPlatformAdminRequest(TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(200);
  });
});

describe('GET /api/tenants/:id/stats - Tenant Isolation (RGPD Critical)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[TENANT-STATS-006] should block cross-tenant access attempts', async () => {
    // TENANT_ADMIN from tenant-abc trying to access tenant-xyz
    const req = createTenantAdminRequest(OTHER_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(OTHER_TENANT_ID));

    expect(response.status).toBe(403);

    // Should NOT have queried the database (blocked before query)
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('[TENANT-STATS-007] should return 404 for non-existent tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // Tenant not found

    const req = createPlatformAdminRequest('non-existent-tenant');
    const response = await GET(req, createParams('non-existent-tenant'));

    expect(response.status).toBe(404);
  });
});

describe('GET /api/tenants/:id/stats - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[TENANT-STATS-008] should return stats object', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.stats).toBeDefined();
  });

  it('[TENANT-STATS-009] should return user statistics', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.stats.users).toBeDefined();
    expect(body.stats.users.active).toBe(50);
    expect(body.stats.users.suspended).toBe(3);
    expect(body.stats.users.total).toBe(53);
  });

  it('[TENANT-STATS-010] should return AI jobs statistics', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.stats.aiJobs).toBeDefined();
    expect(body.stats.aiJobs.success).toBe(200);
    expect(body.stats.aiJobs.failed).toBe(5);
    expect(body.stats.aiJobs.total).toBe(205);
    expect(body.stats.aiJobs.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('[TENANT-STATS-011] should return consents statistics', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.stats.consents).toBeDefined();
    expect(body.stats.consents.granted).toBe(45);
    expect(body.stats.consents.revoked).toBe(2);
    expect(body.stats.consents.pending).toBe(6);
  });

  it('[TENANT-STATS-012] should return RGPD statistics', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.stats.rgpd).toBeDefined();
    expect(body.stats.rgpd.exports).toBeDefined();
    expect(body.stats.rgpd.exports.pending).toBe(2);
    expect(body.stats.rgpd.exports.completed).toBe(10);
    expect(body.stats.rgpd.deletions).toBeDefined();
    expect(body.stats.rgpd.deletions.pending).toBe(1);
    expect(body.stats.rgpd.deletions.completed).toBe(5);
  });
});

describe('GET /api/tenants/:id/stats - Error Handling', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('[TENANT-STATS-013] should return 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(500);
  });

  it('[TENANT-STATS-014] should handle empty results gracefully', async () => {
    mockQuery
      // Tenant exists
      .mockResolvedValueOnce({ rows: [{ id: TEST_TENANT_ID }] })
      // Empty stats
      .mockResolvedValueOnce({ rows: [{ active: '0', suspended: '0', total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ success: '0', failed: '0', total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ granted: '0', revoked: '0', pending: '0' }] })
      .mockResolvedValueOnce({ rows: [{ pending: '0', completed: '0' }] })
      .mockResolvedValueOnce({ rows: [{ pending: '0', completed: '0' }] });

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.users.total).toBe(0);
    expect(body.stats.aiJobs.total).toBe(0);
  });

  it('[TENANT-STATS-015] should handle missing rows gracefully', async () => {
    mockQuery
      // Tenant exists
      .mockResolvedValueOnce({ rows: [{ id: TEST_TENANT_ID }] })
      // Missing rows
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.users.total).toBe(0);
    expect(body.stats.users.active).toBe(0);
    expect(body.stats.consents.granted).toBe(0);
  });
});

describe('GET /api/tenants/:id/stats - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[TENANT-STATS-016] should return only P1 data (aggregates)', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    // Should NOT contain any user-specific data
    expect(body.stats.users.emails).toBeUndefined();
    expect(body.stats.users.names).toBeUndefined();
    expect(body.stats.aiJobs.content).toBeUndefined();
    expect(body.stats.aiJobs.prompts).toBeUndefined();

    // Should contain only aggregates (P1 data)
    expect(typeof body.stats.users.active).toBe('number');
    expect(typeof body.stats.aiJobs.success).toBe('number');
  });

  it('[TENANT-STATS-017] should enforce tenant isolation in SQL queries', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    await GET(req, createParams(TEST_TENANT_ID));

    // All queries should include tenant_id filter
    const queries = mockQuery.mock.calls;

    // Skip tenant check query, verify data queries include tenant_id
    for (let i = 1; i < queries.length; i++) {
      const _query = queries[i][0]; // Prefixed with _ to indicate intentionally unused
      const params = queries[i][1];

      // Each data query should have tenant_id parameter
      expect(params).toContain(TEST_TENANT_ID);
    }
  });
});
