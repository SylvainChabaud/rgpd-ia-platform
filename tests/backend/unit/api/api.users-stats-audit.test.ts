/**
 * User Stats & Audit API Tests - LOT 12.1
 *
 * Tests for GET /api/users/:id/stats and GET /api/users/:id/audit
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Only P1 aggregated data (counts)
 * - No P2/P3 content exposed
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindById = jest.fn();
const mockPoolQuery = jest.fn();

jest.mock('@/infrastructure/db/pg', () => ({
  pool: {
    query: (...args: unknown[]) => mockPoolQuery(...args),
  },
}));

jest.mock('@/infrastructure/repositories/PgUserRepo', () => ({
  PgUserRepo: jest.fn().mockImplementation(() => ({
    findById: (...args: unknown[]) => mockFindById(...args),
  })),
}));

// Import route handlers AFTER mocking
import { GET as GetUserStats } from '@app/api/users/[id]/stats/route';
import { GET as GetUserAudit } from '@app/api/users/[id]/audit/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const OTHER_TENANT_ID = 'tenant-xyz-456';
const TEST_USER_ID = 'user-001';

function createTenantAdminRequest(path: string, tenantId: string): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(`http://localhost${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createMemberRequest(path: string, tenantId: string): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(`http://localhost${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createUnauthenticatedRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// Sample user data
const sampleUser = {
  id: TEST_USER_ID,
  displayName: 'Jean Dupont',
  email: 'jean@example.com',
  tenantId: TEST_TENANT_ID,
};

// =============================================================================
// TESTS - USER STATS (GET /api/users/:id/stats)
// =============================================================================

describe('GET /api/users/:id/stats - User Statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleUser);
    // Setup mock responses for stats queries (includes pending/running for accurate totals)
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ success: '10', failed: '2', pending: '3', running: '1', total: '16' }] }) // jobs
      .mockResolvedValueOnce({ rows: [{ granted: '3', revoked: '1', total: '4' }] }) // consents
      .mockResolvedValueOnce({ rows: [{ total: '25' }] }); // audit events
  });

  it('[STATS-001] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest(`/api/users/${TEST_USER_ID}/stats`);
    const response = await GetUserStats(req, createParams(TEST_USER_ID));
    expect(response.status).toBe(401);
  });

  it('[STATS-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`/api/users/${TEST_USER_ID}/stats`, TEST_TENANT_ID);
    const response = await GetUserStats(req, createParams(TEST_USER_ID));
    expect(response.status).toBe(403);
  });

  it('[STATS-003] should return user stats for TENANT_ADMIN', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/stats`, TEST_TENANT_ID);
    const response = await GetUserStats(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats).toBeDefined();
    expect(body.stats.jobs).toBeDefined();
    expect(body.stats.consents).toBeDefined();
    expect(body.stats.auditEvents).toBeDefined();
  });

  it('[STATS-004] should return correct job statistics with all statuses', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/stats`, TEST_TENANT_ID);
    const response = await GetUserStats(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.stats.jobs.success).toBe(10);
    expect(body.stats.jobs.failed).toBe(2);
    expect(body.stats.jobs.pending).toBe(3);
    expect(body.stats.jobs.running).toBe(1);
    expect(body.stats.jobs.total).toBe(16);
    // Verify total = success + failed + pending + running
    expect(body.stats.jobs.total).toBe(
      body.stats.jobs.success + body.stats.jobs.failed + body.stats.jobs.pending + body.stats.jobs.running
    );
  });

  it('[STATS-005] should return correct consent statistics', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/stats`, TEST_TENANT_ID);
    const response = await GetUserStats(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.stats.consents.granted).toBe(3);
    expect(body.stats.consents.revoked).toBe(1);
    expect(body.stats.consents.total).toBe(4);
  });

  it('[STATS-006] should return 404 for non-existent user', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createTenantAdminRequest(`/api/users/non-existent/stats`, TEST_TENANT_ID);
    const response = await GetUserStats(req, createParams('non-existent'));

    expect(response.status).toBe(404);
  });

  it('[STATS-007] should return 403 for cross-tenant access', async () => {
    mockFindById.mockResolvedValue({
      ...sampleUser,
      tenantId: OTHER_TENANT_ID,
    });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/stats`, TEST_TENANT_ID);
    const response = await GetUserStats(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(403);
  });

  it('[STATS-008] should handle empty stats gracefully', async () => {
    mockPoolQuery.mockReset();
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ success: '0', failed: '0', pending: '0', running: '0', total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ granted: '0', revoked: '0', total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/stats`, TEST_TENANT_ID);
    const response = await GetUserStats(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.jobs.total).toBe(0);
    expect(body.stats.jobs.pending).toBe(0);
    expect(body.stats.jobs.running).toBe(0);
    expect(body.stats.consents.total).toBe(0);
    expect(body.stats.auditEvents.total).toBe(0);
  });

  it('[STATS-009] should handle database errors', async () => {
    // Reset and configure mock to throw on first pool query
    mockPoolQuery.mockReset();
    mockPoolQuery.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/stats`, TEST_TENANT_ID);
    const response = await GetUserStats(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(500);
  });
});

// =============================================================================
// TESTS - USER AUDIT (GET /api/users/:id/audit)
// =============================================================================

describe('GET /api/users/:id/audit - User Audit Events', () => {
  const sampleAuditEvents = [
    {
      id: 'event-001',
      event_type: 'user.login',
      actor_id: TEST_USER_ID,
      target_id: null,
      created_at: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: 'event-002',
      event_type: 'consent.granted',
      actor_id: TEST_USER_ID,
      target_id: 'purpose-001',
      created_at: new Date('2024-01-16T11:00:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleUser);
    mockPoolQuery
      .mockResolvedValueOnce({ rows: sampleAuditEvents })
      .mockResolvedValueOnce({ rows: [{ total: '2' }] });
  });

  it('[AUDIT-001] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest(`/api/users/${TEST_USER_ID}/audit`);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));
    expect(response.status).toBe(401);
  });

  it('[AUDIT-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`/api/users/${TEST_USER_ID}/audit`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));
    expect(response.status).toBe(403);
  });

  it('[AUDIT-003] should return audit events for TENANT_ADMIN', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/audit`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('[AUDIT-004] should return correct event structure', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/audit`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));
    const body = await response.json();

    const event = body.events[0];
    expect(event.id).toBeDefined();
    expect(event.type).toBeDefined();
    expect(event.actorId).toBeDefined();
    expect(event.createdAt).toBeDefined();
    expect(event.isActor).toBeDefined();
    expect(event.isTarget).toBeDefined();
  });

  it('[AUDIT-005] should respect limit parameter', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/audit?limit=10`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.limit).toBe(10);
  });

  it('[AUDIT-006] should respect offset parameter', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/audit?offset=5`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.offset).toBe(5);
  });

  it('[AUDIT-007] should cap limit at 100', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/audit?limit=200`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.limit).toBe(100);
  });

  it('[AUDIT-008] should return 404 for non-existent user', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createTenantAdminRequest(`/api/users/non-existent/audit`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams('non-existent'));

    expect(response.status).toBe(404);
  });

  it('[AUDIT-009] should return 403 for cross-tenant access', async () => {
    mockFindById.mockResolvedValue({
      ...sampleUser,
      tenantId: OTHER_TENANT_ID,
    });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/audit`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(403);
  });

  it('[AUDIT-010] should return empty events when none exist', async () => {
    mockPoolQuery.mockReset();
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/audit`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('[AUDIT-011] should handle database errors', async () => {
    // Reset and configure mock to throw on first pool query
    mockPoolQuery.mockReset();
    mockPoolQuery.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/audit`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(500);
  });

  it('[AUDIT-012] should NOT expose metadata (RGPD compliance)', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/audit`, TEST_TENANT_ID);
    const response = await GetUserAudit(req, createParams(TEST_USER_ID));
    const body = await response.json();

    for (const event of body.events) {
      expect(event.metadata).toBeUndefined();
      expect(event.payload).toBeUndefined();
      expect(event.content).toBeUndefined();
    }
  });
});

// =============================================================================
// TESTS - RGPD COMPLIANCE
// =============================================================================

describe('User Stats & Audit - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleUser);
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ success: '10', failed: '2', pending: '3', running: '1', total: '16' }] })
      .mockResolvedValueOnce({ rows: [{ granted: '3', revoked: '1', total: '4' }] })
      .mockResolvedValueOnce({ rows: [{ total: '25' }] });
  });

  it('[RGPD-001] should enforce tenant isolation in stats queries', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/stats`, TEST_TENANT_ID);
    await GetUserStats(req, createParams(TEST_USER_ID));

    // All queries should include tenant_id
    for (const call of mockPoolQuery.mock.calls) {
      const params = call[1];
      expect(params).toContain(TEST_TENANT_ID);
    }
  });

  it('[RGPD-002] should only return aggregated P1 data in stats', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/stats`, TEST_TENANT_ID);
    const response = await GetUserStats(req, createParams(TEST_USER_ID));
    const body = await response.json();

    // Stats should only contain counts (P1 aggregated data)
    expect(typeof body.stats.jobs.total).toBe('number');
    expect(typeof body.stats.consents.total).toBe('number');
    expect(typeof body.stats.auditEvents.total).toBe('number');

    // Should NOT contain any P2/P3 data
    expect(body.stats.email).toBeUndefined();
    expect(body.stats.content).toBeUndefined();
    expect(body.stats.prompts).toBeUndefined();
  });

  it('[RGPD-003] should enforce tenant isolation in audit queries', async () => {
    mockPoolQuery.mockReset();
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/audit`, TEST_TENANT_ID);
    await GetUserAudit(req, createParams(TEST_USER_ID));

    // All queries should include tenant_id
    for (const call of mockPoolQuery.mock.calls) {
      const params = call[1];
      expect(params).toContain(TEST_TENANT_ID);
    }
  });
});
