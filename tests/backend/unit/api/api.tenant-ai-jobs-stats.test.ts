/**
 * Tenant AI Jobs Stats API Tests - LOT 12.0
 *
 * Tests for GET /api/tenants/:id/stats/ai-jobs
 *
 * RGPD Compliance:
 * - P1 data only (aggregates per day)
 * - No content (prompts, outputs)
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
import { GET } from '@app/api/tenants/[id]/stats/ai-jobs/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const OTHER_TENANT_ID = 'tenant-xyz-456';

function createPlatformAdminRequest(tenantId: string, days?: number): NextRequest {
  const url = days
    ? `http://localhost/api/tenants/${tenantId}/stats/ai-jobs?days=${days}`
    : `http://localhost/api/tenants/${tenantId}/stats/ai-jobs`;
  const token = signJwt({
    userId: 'superadmin-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.SUPERADMIN,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createTenantAdminRequest(tenantId: string, userTenantId: string, days?: number): NextRequest {
  const url = days
    ? `http://localhost/api/tenants/${tenantId}/stats/ai-jobs?days=${days}`
    : `http://localhost/api/tenants/${tenantId}/stats/ai-jobs`;
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: userTenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(url, {
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
  return new NextRequest(`http://localhost/api/tenants/${tenantId}/stats/ai-jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// =============================================================================
// SAMPLE DATA
// =============================================================================

const sampleStats = [
  { date: new Date('2026-01-08'), success: '10', failed: '2', total: '12' },
  { date: new Date('2026-01-09'), success: '15', failed: '1', total: '16' },
  { date: new Date('2026-01-10'), success: '8', failed: '3', total: '11' },
];

function setupMockResponses(tenantExists: boolean = true, stats: typeof sampleStats = sampleStats) {
  mockQuery
    // Tenant exists check
    .mockResolvedValueOnce({ rows: tenantExists ? [{ id: TEST_TENANT_ID }] : [] })
    // AI jobs time series
    .mockResolvedValueOnce({ rows: stats });
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/tenants/:id/stats/ai-jobs - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[AI-STATS-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest(`http://localhost/api/tenants/${TEST_TENANT_ID}/stats/ai-jobs`);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(401);
  });

  it('[AI-STATS-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(403);
  });

  it('[AI-STATS-003] should allow TENANT_ADMIN for their own tenant', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(200);
  });

  it('[AI-STATS-004] should return 403 for TENANT_ADMIN accessing other tenant', async () => {
    mockQuery.mockReset();

    const req = createTenantAdminRequest(OTHER_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(OTHER_TENANT_ID));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toContain('Access denied');
  });

  it('[AI-STATS-005] should allow PLATFORM SUPERADMIN to access any tenant', async () => {
    const req = createPlatformAdminRequest(TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(200);
  });
});

describe('GET /api/tenants/:id/stats/ai-jobs - Tenant Isolation (RGPD Critical)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[AI-STATS-006] should block cross-tenant access attempts', async () => {
    const req = createTenantAdminRequest(OTHER_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(OTHER_TENANT_ID));

    expect(response.status).toBe(403);

    // Should NOT have queried the database (blocked before query)
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('[AI-STATS-007] should return 404 for non-existent tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // Tenant not found

    const req = createPlatformAdminRequest('non-existent-tenant');
    const response = await GET(req, createParams('non-existent-tenant'));

    expect(response.status).toBe(404);
  });
});

describe('GET /api/tenants/:id/stats/ai-jobs - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[AI-STATS-008] should return stats array and days', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.stats).toBeDefined();
    expect(Array.isArray(body.stats)).toBe(true);
    expect(body.days).toBeDefined();
  });

  it('[AI-STATS-009] should return correct stat structure', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.stats.length).toBe(3);
    const stat = body.stats[0];

    expect(stat.date).toBeDefined();
    expect(stat.success).toBeDefined();
    expect(stat.failed).toBeDefined();
    expect(stat.total).toBeDefined();
  });

  it('[AI-STATS-010] should return dates in YYYY-MM-DD format', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.stats.length).toBeGreaterThan(0);
    const stat = body.stats[0];
    expect(stat.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('[AI-STATS-011] should return numeric values', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    const stat = body.stats[0];
    expect(typeof stat.success).toBe('number');
    expect(typeof stat.failed).toBe('number');
    expect(typeof stat.total).toBe('number');
  });
});

describe('GET /api/tenants/:id/stats/ai-jobs - Query Parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[AI-STATS-012] should use default days of 30', async () => {
    setupMockResponses();

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.days).toBe(30);
  });

  it('[AI-STATS-013] should respect custom days parameter', async () => {
    setupMockResponses();

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID, 14);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.days).toBe(14);
  });

  it('[AI-STATS-014] should enforce max days of 90', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID, 120);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(400);
  });

  it('[AI-STATS-015] should enforce min days of 1', async () => {
    // days=0 should fail validation (min is 1)
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID, -5);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(400);
  });
});

describe('GET /api/tenants/:id/stats/ai-jobs - Error Handling', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('[AI-STATS-016] should return 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(500);
  });

  it('[AI-STATS-017] should handle empty results gracefully', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: TEST_TENANT_ID }] }) // Tenant exists
      .mockResolvedValueOnce({ rows: [] }); // No stats

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats).toEqual([]);
  });
});

describe('GET /api/tenants/:id/stats/ai-jobs - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[AI-STATS-018] should return only P1 data (aggregates)', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    const stat = body.stats[0];

    // Should NOT contain any user-specific data
    expect(stat.prompt).toBeUndefined();
    expect(stat.output).toBeUndefined();
    expect(stat.userId).toBeUndefined();
    expect(stat.content).toBeUndefined();

    // Should contain only aggregates (P1 data)
    expect(typeof stat.success).toBe('number');
    expect(typeof stat.failed).toBe('number');
    expect(typeof stat.total).toBe('number');
  });

  it('[AI-STATS-019] should enforce tenant isolation in SQL queries', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    await GET(req, createParams(TEST_TENANT_ID));

    const queries = mockQuery.mock.calls;

    // All queries should include tenant_id filter
    for (let i = 0; i < queries.length; i++) {
      const params = queries[i][1];
      expect(params).toContain(TEST_TENANT_ID);
    }
  });
});
