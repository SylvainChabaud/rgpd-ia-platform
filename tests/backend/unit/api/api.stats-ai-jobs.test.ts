/**
 * AI Jobs Stats API Tests - LOT 11.3
 *
 * Tests for GET /api/stats/ai-jobs
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, no content)
 * - Time-series for dashboard charts
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
import { GET } from '@app/api/stats/ai-jobs/route';

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

const sampleTimeSeriesData = [
  { date: new Date('2026-01-08'), success: '100', failed: '5', total: '105' },
  { date: new Date('2026-01-09'), success: '120', failed: '3', total: '123' },
  { date: new Date('2026-01-10'), success: '90', failed: '10', total: '100' },
];

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/stats/ai-jobs - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: sampleTimeSeriesData });
  });

  it('[STATS-AI-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('[STATS-AI-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[STATS-AI-003] should return 403 for TENANT_ADMIN', async () => {
    const req = createTenantAdminRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[STATS-AI-004] should allow PLATFORM SUPERADMIN', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it('[STATS-AI-005] should allow DPO (PLATFORM scope)', async () => {
    const req = createDpoRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/stats/ai-jobs - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: sampleTimeSeriesData });
  });

  it('[STATS-AI-006] should return stats array', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats).toBeDefined();
    expect(Array.isArray(body.stats)).toBe(true);
  });

  it('[STATS-AI-007] should return time series data with correct fields', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.length).toBe(3);
    expect(body.stats[0]).toHaveProperty('date');
    expect(body.stats[0]).toHaveProperty('success');
    expect(body.stats[0]).toHaveProperty('failed');
    expect(body.stats[0]).toHaveProperty('total');
  });

  it('[STATS-AI-008] should return days parameter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);
    const body = await response.json();

    expect(body.days).toBeDefined();
    expect(body.days).toBe(30); // Default
  });
});

describe('GET /api/stats/ai-jobs - Query Parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: sampleTimeSeriesData });
  });

  it('[STATS-AI-009] should accept days parameter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs?days=7');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.days).toBe(7);
  });

  it('[STATS-AI-010] should use default 30 days when not specified', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);
    const body = await response.json();

    expect(body.days).toBe(30);
  });

  it('[STATS-AI-011] should return 400 for days > 90', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs?days=100');
    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it('[STATS-AI-012] should return 400 for days < 1', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs?days=0');
    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it('[STATS-AI-013] should return 400 for invalid days format', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs?days=abc');
    const response = await GET(req);

    expect(response.status).toBe(400);
  });
});

describe('GET /api/stats/ai-jobs - Error Handling', () => {
  it('[STATS-AI-014] should return 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);

    expect(response.status).toBe(500);
  });

  it('[STATS-AI-015] should handle empty results', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const req = createPlatformAdminRequest('http://localhost/api/stats/ai-jobs');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats).toEqual([]);
  });
});
