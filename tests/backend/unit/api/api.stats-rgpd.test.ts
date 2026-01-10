/**
 * RGPD Stats API Tests - LOT 11.3
 *
 * Tests for GET /api/stats/rgpd
 *
 * RGPD Compliance:
 * - P1 data only (counts, no user data)
 * - Time-series for exports/deletions/contests
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
import { GET } from '@app/api/stats/rgpd/route';

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

const sampleExportsData = [
  { date: new Date('2026-01-08'), count: '10' },
  { date: new Date('2026-01-09'), count: '15' },
];

const sampleDeletionsData = [
  { date: new Date('2026-01-08'), count: '5' },
  { date: new Date('2026-01-09'), count: '3' },
];

const sampleContestsData = [
  { date: new Date('2026-01-09'), count: '2' },
];

const sampleOppositionsData = [
  { date: new Date('2026-01-08'), count: '1' },
];

const sampleSuspensionsData = [
  { date: new Date('2026-01-10'), count: '1' },
];

function setupMockResponses() {
  mockQuery
    .mockResolvedValueOnce({ rows: sampleExportsData })
    .mockResolvedValueOnce({ rows: sampleDeletionsData })
    .mockResolvedValueOnce({ rows: sampleContestsData })
    .mockResolvedValueOnce({ rows: sampleOppositionsData })
    .mockResolvedValueOnce({ rows: sampleSuspensionsData });
}

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/stats/rgpd - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[STATS-RGPD-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('[STATS-RGPD-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[STATS-RGPD-003] should return 403 for TENANT_ADMIN', async () => {
    const req = createTenantAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[STATS-RGPD-004] should allow PLATFORM SUPERADMIN', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it('[STATS-RGPD-005] should allow DPO (PLATFORM scope)', async () => {
    const req = createDpoRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/stats/rgpd - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[STATS-RGPD-006] should return stats object', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats).toBeDefined();
  });

  it('[STATS-RGPD-007] should return exports time series', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.exports).toBeDefined();
    expect(Array.isArray(body.stats.exports)).toBe(true);
    expect(body.stats.exports[0]).toHaveProperty('date');
    expect(body.stats.exports[0]).toHaveProperty('count');
  });

  it('[STATS-RGPD-008] should return deletions time series', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.deletions).toBeDefined();
    expect(Array.isArray(body.stats.deletions)).toBe(true);
  });

  it('[STATS-RGPD-009] should return contests time series (Art. 22)', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.contests).toBeDefined();
    expect(Array.isArray(body.stats.contests)).toBe(true);
  });

  it('[STATS-RGPD-010] should return oppositions time series (Art. 21)', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.oppositions).toBeDefined();
    expect(Array.isArray(body.stats.oppositions)).toBe(true);
  });

  it('[STATS-RGPD-011] should return suspensions time series (Art. 18)', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.suspensions).toBeDefined();
    expect(Array.isArray(body.stats.suspensions)).toBe(true);
  });

  it('[STATS-RGPD-012] should return days parameter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);
    const body = await response.json();

    expect(body.days).toBe(30); // Default
  });
});

describe('GET /api/stats/rgpd - Query Parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[STATS-RGPD-013] should accept days parameter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd?days=7');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.days).toBe(7);
  });

  it('[STATS-RGPD-014] should return 400 for days > 90', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd?days=100');
    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it('[STATS-RGPD-015] should return 400 for days < 1', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd?days=0');
    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it('[STATS-RGPD-016] should return 400 for invalid days format', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd?days=abc');
    const response = await GET(req);

    expect(response.status).toBe(400);
  });
});

describe('GET /api/stats/rgpd - Error Handling', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('[STATS-RGPD-017] should return 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);

    expect(response.status).toBe(500);
  });

  it('[STATS-RGPD-018] should handle empty results', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const req = createPlatformAdminRequest('http://localhost/api/stats/rgpd');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.exports).toEqual([]);
    expect(body.stats.deletions).toEqual([]);
  });
});
