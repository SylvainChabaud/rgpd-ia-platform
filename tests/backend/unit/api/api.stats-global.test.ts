/**
 * Global Stats API Tests - LOT 11.3
 *
 * Tests for GET /api/stats/global
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, metadata)
 * - No sensitive user content
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
import { GET } from '@app/api/stats/global/route';

// =============================================================================
// HELPERS
// =============================================================================

function createPlatformAdminRequest(url: string): NextRequest {
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

function createDpoRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'dpo-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.DPO,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createTenantAdminRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: 'tenant-abc',
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createMemberRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: 'tenant-abc',
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// =============================================================================
// SAMPLE DATA
// =============================================================================

function setupMockResponses() {
  mockQuery
    // Tenants
    .mockResolvedValueOnce({ rows: [{ active: '10', suspended: '2', total: '12' }] })
    // Users
    .mockResolvedValueOnce({ rows: [{ active: '100', suspended: '5', total: '105' }] })
    // AI Jobs
    .mockResolvedValueOnce({ rows: [{ success: '500', failed: '10', total: '510' }] })
    // RGPD Exports
    .mockResolvedValueOnce({ rows: [{ pending: '5', completed: '50', total: '55' }] })
    // RGPD Deletions
    .mockResolvedValueOnce({ rows: [{ pending: '2', completed: '20', total: '22' }] })
    // Incidents
    .mockResolvedValueOnce({ rows: [{ unresolved: '3', resolved: '15', total: '18' }] });
}

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/stats/global - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[STATS-GLOB-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/stats/global');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('[STATS-GLOB-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('http://localhost/api/stats/global');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[STATS-GLOB-003] should return 403 for TENANT_ADMIN', async () => {
    const req = createTenantAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[STATS-GLOB-004] should allow PLATFORM SUPERADMIN', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it('[STATS-GLOB-005] should allow DPO (PLATFORM scope)', async () => {
    const req = createDpoRequest('http://localhost/api/stats/global');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/stats/global - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[STATS-GLOB-006] should return stats object', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats).toBeDefined();
  });

  it('[STATS-GLOB-007] should return tenant statistics', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.tenants).toBeDefined();
    expect(body.stats.tenants.active).toBe(10);
    expect(body.stats.tenants.suspended).toBe(2);
    expect(body.stats.tenants.total).toBe(12);
  });

  it('[STATS-GLOB-008] should return user statistics', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.users).toBeDefined();
    expect(body.stats.users.active).toBe(100);
    expect(body.stats.users.suspended).toBe(5);
    expect(body.stats.users.total).toBe(105);
  });

  it('[STATS-GLOB-009] should return AI jobs statistics', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.aiJobs).toBeDefined();
    expect(body.stats.aiJobs.success).toBe(500);
    expect(body.stats.aiJobs.failed).toBe(10);
    expect(body.stats.aiJobs.total).toBe(510);
    expect(body.stats.aiJobs.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('[STATS-GLOB-010] should return RGPD statistics', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.rgpd).toBeDefined();
    expect(body.stats.rgpd.exports).toBeDefined();
    expect(body.stats.rgpd.exports.pending).toBe(5);
    expect(body.stats.rgpd.exports.completed).toBe(50);
    expect(body.stats.rgpd.deletions).toBeDefined();
    expect(body.stats.rgpd.deletions.pending).toBe(2);
  });

  it('[STATS-GLOB-011] should return incident statistics', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.incidents).toBeDefined();
    expect(body.stats.incidents.unresolved).toBe(3);
    expect(body.stats.incidents.resolved).toBe(15);
    expect(body.stats.incidents.total).toBe(18);
  });
});

describe('GET /api/stats/global - Error Handling', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('[STATS-GLOB-012] should return 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const req = createPlatformAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);

    expect(response.status).toBe(500);
  });

  it('[STATS-GLOB-013] should handle empty results gracefully', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ active: '0', suspended: '0', total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ active: '0', suspended: '0', total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ success: '0', failed: '0', total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ pending: '0', completed: '0', total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ pending: '0', completed: '0', total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ unresolved: '0', resolved: '0', total: '0' }] });

    const req = createPlatformAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.tenants.total).toBe(0);
  });

  it('[STATS-GLOB-014] should handle missing rows gracefully', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const req = createPlatformAdminRequest('http://localhost/api/stats/global');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.tenants.total).toBe(0);
    expect(body.stats.users.total).toBe(0);
  });
});
