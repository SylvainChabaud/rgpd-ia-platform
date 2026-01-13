/**
 * Consent History API Tests - LOT 12.2
 *
 * Tests for GET /api/consents/history/:userId
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced (cross-tenant blocked)
 * - P1/P2 data only (dates, status, purpose)
 * - Full audit trail for accountability
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

// Import route handler AFTER mocking
import { GET } from '@app/api/consents/history/[userId]/route';

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

function createParams(userId: string): { params: Promise<{ userId: string }> } {
  return { params: Promise.resolve({ userId }) };
}

// Sample data
const sampleUser = {
  id: TEST_USER_ID,
  displayName: 'Jean Dupont',
  email: 'jean@example.com',
  tenantId: TEST_TENANT_ID,
};

const sampleHistoryEvents = [
  {
    id: 'consent-001',
    purpose_label: 'analytics',
    purpose_id: 'purpose-001',
    action: 'granted',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    purpose_name: 'Analytics',
  },
  {
    id: 'consent-001',
    purpose_label: 'analytics',
    purpose_id: 'purpose-001',
    action: 'revoked',
    timestamp: new Date('2024-02-20T14:30:00Z'),
    purpose_name: 'Analytics',
  },
  {
    id: 'consent-002',
    purpose_label: 'marketing',
    purpose_id: 'purpose-002',
    action: 'granted',
    timestamp: new Date('2024-01-10T09:00:00Z'),
    purpose_name: 'Marketing',
  },
];

// =============================================================================
// TESTS - AUTHENTICATION & AUTHORIZATION
// =============================================================================

describe('GET /api/consents/history/:userId - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[HISTORY-001] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest(`/api/consents/history/${TEST_USER_ID}`);
    const response = await GET(req, createParams(TEST_USER_ID));
    expect(response.status).toBe(401);
  });

  it('[HISTORY-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    expect(response.status).toBe(403);
  });

  it('[HISTORY-003] should allow TENANT_ADMIN access', async () => {
    mockFindById.mockResolvedValue(sampleUser);
    mockPoolQuery.mockResolvedValueOnce({ rows: sampleHistoryEvents });
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ total: '3' }] });

    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(200);
  });
});

// =============================================================================
// TESTS - TENANT ISOLATION (RGPD Critical)
// =============================================================================

describe('GET /api/consents/history/:userId - Tenant Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[HISTORY-010] should return 404 for non-existent user', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createTenantAdminRequest(`/api/consents/history/non-existent`, TEST_TENANT_ID);
    const response = await GET(req, createParams('non-existent'));

    expect(response.status).toBe(404);
  });

  it('[HISTORY-011] should return 403 for cross-tenant access attempt', async () => {
    // User belongs to different tenant
    mockFindById.mockResolvedValue({
      ...sampleUser,
      tenantId: OTHER_TENANT_ID,
    });

    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toContain('Cross-tenant');
  });

  it('[HISTORY-012] should NOT query database for cross-tenant user', async () => {
    mockFindById.mockResolvedValue({
      ...sampleUser,
      tenantId: OTHER_TENANT_ID,
    });

    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    await GET(req, createParams(TEST_USER_ID));

    // Pool query should NOT be called (blocked before)
    expect(mockPoolQuery).not.toHaveBeenCalled();
  });
});

// =============================================================================
// TESTS - RESPONSE STRUCTURE
// =============================================================================

describe('GET /api/consents/history/:userId - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleUser);
    mockPoolQuery.mockResolvedValueOnce({ rows: sampleHistoryEvents });
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ total: '3' }] });
  });

  it('[HISTORY-020] should return user info (displayName only, not email)', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.user.id).toBe(TEST_USER_ID);
    expect(body.user.displayName).toBe('Jean Dupont');
    expect(body.user.email).toBeUndefined();
  });

  it('[HISTORY-021] should return history array with correct structure', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.history).toHaveLength(3);
    expect(body.history[0]).toHaveProperty('id');
    expect(body.history[0]).toHaveProperty('purposeId');
    expect(body.history[0]).toHaveProperty('purposeLabel');
    expect(body.history[0]).toHaveProperty('action');
    expect(body.history[0]).toHaveProperty('timestamp');
    expect(body.history[0]).toHaveProperty('source');
  });

  it('[HISTORY-022] should include correct action types', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    const actions = body.history.map((h: { action: string }) => h.action);
    expect(actions).toContain('granted');
    expect(actions).toContain('revoked');
  });

  it('[HISTORY-023] should return pagination info', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.total).toBe(3);
    expect(body.limit).toBe(100);
    expect(body.offset).toBe(0);
  });

  it('[HISTORY-024] should format timestamps as ISO strings', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    // Timestamps should be ISO formatted
    for (const entry of body.history) {
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
  });
});

// =============================================================================
// TESTS - QUERY PARAMETERS
// =============================================================================

describe('GET /api/consents/history/:userId - Query Parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleUser);
    mockPoolQuery.mockResolvedValueOnce({ rows: sampleHistoryEvents });
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ total: '3' }] });
  });

  it('[HISTORY-030] should respect limit parameter', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}?limit=10`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.limit).toBe(10);
  });

  it('[HISTORY-031] should respect offset parameter', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}?offset=5`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.offset).toBe(5);
  });

  it('[HISTORY-032] should filter by purposeId', async () => {
    mockPoolQuery.mockReset();
    mockPoolQuery.mockResolvedValueOnce({ rows: [sampleHistoryEvents[0]] });
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] });

    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}?purposeId=purpose-001`, TEST_TENANT_ID);
    await GET(req, createParams(TEST_USER_ID));

    // Check that purposeId filter is in query
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('purpose_id'),
      expect.arrayContaining(['purpose-001'])
    );
  });

  it('[HISTORY-033] should validate limit max value', async () => {
    mockPoolQuery.mockReset();

    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}?limit=500`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(400);
  });

  it('[HISTORY-034] should validate limit min value', async () => {
    mockPoolQuery.mockReset();

    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}?limit=0`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(400);
  });
});

// =============================================================================
// TESTS - EDGE CASES
// =============================================================================

describe('GET /api/consents/history/:userId - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleUser);
  });

  it('[HISTORY-040] should return empty history when no consent events', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.history).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('[HISTORY-041] should handle database errors gracefully', async () => {
    mockPoolQuery.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(500);
  });

  it('[HISTORY-042] should use purpose label fallback when purpose_name missing', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{
        id: 'consent-001',
        purpose_label: 'custom_purpose',
        purpose_id: null,
        action: 'granted',
        timestamp: new Date(),
        purpose_name: null, // No configured purpose
      }],
    });
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] });

    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.history[0].purposeLabel).toBe('custom_purpose');
  });
});

// =============================================================================
// TESTS - RGPD COMPLIANCE
// =============================================================================

describe('GET /api/consents/history/:userId - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleUser);
    mockPoolQuery.mockResolvedValueOnce({ rows: sampleHistoryEvents });
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ total: '3' }] });
  });

  it('[HISTORY-050] should NOT expose user email (P2 minimization)', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.user.email).toBeUndefined();
  });

  it('[HISTORY-051] should only expose P1/P2 data', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    // User should only have id and displayName
    expect(Object.keys(body.user)).toEqual(['id', 'displayName']);

    // History entries should only have expected fields
    for (const entry of body.history) {
      expect(entry.content).toBeUndefined();
      expect(entry.prompt).toBeUndefined();
      expect(entry.ipAddress).toBeUndefined();
    }
  });

  it('[HISTORY-052] should enforce tenant isolation in SQL queries', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    await GET(req, createParams(TEST_USER_ID));

    // All queries should include tenant_id filter
    for (const call of mockPoolQuery.mock.calls) {
      const params = call[1];
      expect(params).toContain(TEST_TENANT_ID);
    }
  });

  it('[HISTORY-053] should provide full audit trail for RGPD accountability', async () => {
    const req = createTenantAdminRequest(`/api/consents/history/${TEST_USER_ID}`, TEST_TENANT_ID);
    const response = await GET(req, createParams(TEST_USER_ID));
    const body = await response.json();

    // Each entry should have timestamp and action for accountability
    for (const entry of body.history) {
      expect(entry.timestamp).toBeDefined();
      expect(entry.action).toMatch(/^(granted|revoked|created)$/);
      expect(entry.source).toBeDefined();
    }
  });
});
