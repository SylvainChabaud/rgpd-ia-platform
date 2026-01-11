/**
 * Tenant Activity API Tests - LOT 12.0
 *
 * Tests for GET /api/tenants/:id/activity
 *
 * RGPD Compliance:
 * - P1 data only (event types, IDs, timestamps)
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
import { GET } from '@app/api/tenants/[id]/activity/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const OTHER_TENANT_ID = 'tenant-xyz-456';

function createPlatformAdminRequest(tenantId: string, limit?: number): NextRequest {
  const url = limit
    ? `http://localhost/api/tenants/${tenantId}/activity?limit=${limit}`
    : `http://localhost/api/tenants/${tenantId}/activity`;
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

function createTenantAdminRequest(tenantId: string, userTenantId: string, limit?: number): NextRequest {
  const url = limit
    ? `http://localhost/api/tenants/${tenantId}/activity?limit=${limit}`
    : `http://localhost/api/tenants/${tenantId}/activity`;
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
  return new NextRequest(`http://localhost/api/tenants/${tenantId}/activity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// =============================================================================
// SAMPLE DATA
// =============================================================================

const sampleEvents = [
  {
    id: 'event-001',
    type: 'user.created',
    actorId: 'user-001',
    targetId: 'user-002',
    createdAt: new Date('2026-01-10T10:00:00Z'),
  },
  {
    id: 'event-002',
    type: 'consent.granted',
    actorId: 'user-002',
    targetId: null,
    createdAt: new Date('2026-01-10T11:00:00Z'),
  },
  {
    id: 'event-003',
    type: 'ai.invoked',
    actorId: 'user-002',
    targetId: 'job-001',
    createdAt: new Date('2026-01-10T12:00:00Z'),
  },
];

function setupMockResponses(tenantExists: boolean = true, events: typeof sampleEvents = sampleEvents) {
  mockQuery
    // Tenant exists check
    .mockResolvedValueOnce({ rows: tenantExists ? [{ id: TEST_TENANT_ID }] : [] })
    // Events query
    .mockResolvedValueOnce({ rows: events })
    // Count query
    .mockResolvedValueOnce({ rows: [{ total: String(events.length) }] });
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/tenants/:id/activity - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[TENANT-ACT-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest(`http://localhost/api/tenants/${TEST_TENANT_ID}/activity`);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(401);
  });

  it('[TENANT-ACT-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(403);
  });

  it('[TENANT-ACT-003] should allow TENANT_ADMIN for their own tenant', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(200);
  });

  it('[TENANT-ACT-004] should return 403 for TENANT_ADMIN accessing other tenant', async () => {
    const req = createTenantAdminRequest(OTHER_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(OTHER_TENANT_ID));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toContain('Access denied');
  });

  it('[TENANT-ACT-005] should allow PLATFORM SUPERADMIN to access any tenant', async () => {
    const req = createPlatformAdminRequest(TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(200);
  });
});

describe('GET /api/tenants/:id/activity - Tenant Isolation (RGPD Critical)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[TENANT-ACT-006] should block cross-tenant access attempts', async () => {
    // TENANT_ADMIN from tenant-abc trying to access tenant-xyz
    const req = createTenantAdminRequest(OTHER_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(OTHER_TENANT_ID));

    expect(response.status).toBe(403);

    // Should NOT have queried the database (blocked before query)
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('[TENANT-ACT-007] should return 404 for non-existent tenant', async () => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // Tenant not found

    const req = createPlatformAdminRequest('non-existent-tenant');
    const response = await GET(req, createParams('non-existent-tenant'));

    expect(response.status).toBe(404);
  });
});

describe('GET /api/tenants/:id/activity - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[TENANT-ACT-008] should return events array and total', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.events).toBeDefined();
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.total).toBe(3);
  });

  it('[TENANT-ACT-009] should return correct event structure', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.events.length).toBeGreaterThan(0);
    const event = body.events[0];

    expect(event.id).toBeDefined();
    expect(event.type).toBeDefined();
    expect(event.createdAt).toBeDefined();
    // actorId and targetId can be null
    expect('actorId' in event).toBe(true);
    expect('targetId' in event).toBe(true);
  });

  it('[TENANT-ACT-010] should return events in ISO date format', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(body.events.length).toBeGreaterThan(0);
    const event = body.events[0];
    // ISO 8601 format check
    expect(event.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('GET /api/tenants/:id/activity - Query Parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[TENANT-ACT-011] should use default limit of 50', async () => {
    setupMockResponses(true, sampleEvents);

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    await GET(req, createParams(TEST_TENANT_ID));

    // Check that limit 50 was passed to the query
    const eventsQuery = mockQuery.mock.calls[1];
    expect(eventsQuery[1]).toContain(50);
  });

  it('[TENANT-ACT-012] should respect custom limit', async () => {
    setupMockResponses(true, sampleEvents);

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID, 10);
    await GET(req, createParams(TEST_TENANT_ID));

    const eventsQuery = mockQuery.mock.calls[1];
    expect(eventsQuery[1]).toContain(10);
  });

  it('[TENANT-ACT-013] should enforce max limit of 100', async () => {
    setupMockResponses(true, sampleEvents);

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID, 500);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    // Should return 400 for invalid limit
    expect(response.status).toBe(400);
  });

  it('[TENANT-ACT-014] should enforce min limit of 1', async () => {
    // Limit -1 is invalid (below min of 1)
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID, -1);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(400);
  });
});

describe('GET /api/tenants/:id/activity - Error Handling', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('[TENANT-ACT-015] should return 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));

    expect(response.status).toBe(500);
  });

  it('[TENANT-ACT-016] should handle empty results gracefully', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: TEST_TENANT_ID }] }) // Tenant exists
      .mockResolvedValueOnce({ rows: [] }) // No events
      .mockResolvedValueOnce({ rows: [{ total: '0' }] }); // Count

    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events).toEqual([]);
    expect(body.total).toBe(0);
  });
});

describe('GET /api/tenants/:id/activity - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  it('[TENANT-ACT-017] should return only P1 data (event types, IDs)', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    const event = body.events[0];

    // Should NOT contain any sensitive data
    expect(event.content).toBeUndefined();
    expect(event.prompt).toBeUndefined();
    expect(event.email).toBeUndefined();
    expect(event.password).toBeUndefined();

    // Should contain only P1 data
    expect(event.id).toBeDefined();
    expect(event.type).toBeDefined();
    expect(event.createdAt).toBeDefined();
  });

  it('[TENANT-ACT-018] should NOT include metadata (may contain P2/P3 data)', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_TENANT_ID));
    const body = await response.json();

    // The API intentionally omits metadata to avoid P2/P3 data leakage
    body.events.forEach((event: { metadata?: unknown }) => {
      expect(event.metadata).toBeUndefined();
    });
  });

  it('[TENANT-ACT-019] should enforce tenant isolation in SQL queries', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);
    await GET(req, createParams(TEST_TENANT_ID));

    // All queries should include tenant_id filter
    const queries = mockQuery.mock.calls;

    // Events query should have tenant_id parameter
    const eventsQuery = queries[1];
    expect(eventsQuery[1]).toContain(TEST_TENANT_ID);

    // Count query should have tenant_id parameter
    const countQuery = queries[2];
    expect(countQuery[1]).toContain(TEST_TENANT_ID);
  });
});
