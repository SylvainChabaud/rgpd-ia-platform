/**
 * User Stats API Tests - LOT 12.1
 *
 * Tests for GET /api/users/:id/stats
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Only P1 aggregated data (counts, no content)
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindById = jest.fn();
const mockQuery = jest.fn();

jest.mock('@/infrastructure/repositories/PgUserRepo', () => ({
  PgUserRepo: jest.fn().mockImplementation(() => ({
    findById: (...args: unknown[]) => mockFindById(...args),
  })),
}));

jest.mock('@/infrastructure/db/pg', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

// Import route handler AFTER mocking
import { GET } from '@app/api/users/[id]/stats/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const OTHER_TENANT_ID = 'tenant-xyz-456';
const TEST_USER_ID = 'user-123-abc';

function createTenantAdminRequest(userId: string, userTenantId: string = TEST_TENANT_ID): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: userTenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(`http://localhost/api/users/${userId}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createMemberRequest(userId: string, userTenantId: string = TEST_TENANT_ID): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: userTenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(`http://localhost/api/users/${userId}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createUnauthenticatedRequest(userId: string): NextRequest {
  return new NextRequest(`http://localhost/api/users/${userId}/stats`);
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const mockUser = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  displayName: 'Test User',
  role: ACTOR_ROLE.MEMBER,
};

function setupMockStats() {
  mockQuery
    // Jobs stats
    .mockResolvedValueOnce({
      rows: [{ success: '25', failed: '3', total: '28' }],
    })
    // Consents stats
    .mockResolvedValueOnce({
      rows: [{ granted: '5', revoked: '1', total: '6' }],
    })
    // Audit events count
    .mockResolvedValueOnce({
      rows: [{ total: '150' }],
    });
}

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/users/:id/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // Authentication Tests
  // =====================
  describe('Authentication', () => {
    it('[STATS-001] should return 401 for unauthenticated requests', async () => {
      const req = createUnauthenticatedRequest(TEST_USER_ID);
      const res = await GET(req, createParams(TEST_USER_ID));
      expect(res.status).toBe(401);
    });

    it('[STATS-002] should return 403 for MEMBER role', async () => {
      const req = createMemberRequest(TEST_USER_ID);
      const res = await GET(req, createParams(TEST_USER_ID));
      expect(res.status).toBe(403);
    });

    it('[STATS-003] should allow TENANT_ADMIN role', async () => {
      mockFindById.mockResolvedValueOnce(mockUser);
      setupMockStats();

      const req = createTenantAdminRequest(TEST_USER_ID);
      const res = await GET(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
    });
  });

  // =====================
  // Tenant Isolation Tests
  // =====================
  describe('Tenant Isolation', () => {
    it('[STATS-010] should return 403 for cross-tenant access', async () => {
      mockFindById.mockResolvedValueOnce({
        ...mockUser,
        tenantId: OTHER_TENANT_ID,
      });

      const req = createTenantAdminRequest(TEST_USER_ID, TEST_TENANT_ID);
      const res = await GET(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(403);
      const data = await res.json();
      // Error message could be generic "Forbidden" or specific
      expect(data.error).toBeDefined();
    });

    it('[STATS-011] should allow access for user in same tenant', async () => {
      mockFindById.mockResolvedValueOnce(mockUser);
      setupMockStats();

      const req = createTenantAdminRequest(TEST_USER_ID, TEST_TENANT_ID);
      const res = await GET(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
    });
  });

  // =====================
  // Response Format Tests
  // =====================
  describe('Response Format', () => {
    it('[STATS-020] should return correct stats structure', async () => {
      mockFindById.mockResolvedValueOnce(mockUser);
      setupMockStats();

      const req = createTenantAdminRequest(TEST_USER_ID);
      const res = await GET(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.stats).toBeDefined();
      expect(data.stats.jobs).toBeDefined();
      expect(data.stats.jobs.success).toBe(25);
      expect(data.stats.jobs.failed).toBe(3);
      expect(data.stats.jobs.total).toBe(28);
      expect(data.stats.consents).toBeDefined();
      expect(data.stats.consents.granted).toBe(5);
      expect(data.stats.consents.revoked).toBe(1);
      expect(data.stats.consents.total).toBe(6);
      expect(data.stats.auditEvents).toBeDefined();
      expect(data.stats.auditEvents.total).toBe(150);
    });

    it('[STATS-021] should return P1 aggregates only (no content)', async () => {
      mockFindById.mockResolvedValueOnce(mockUser);
      setupMockStats();

      const req = createTenantAdminRequest(TEST_USER_ID);
      const res = await GET(req, createParams(TEST_USER_ID));

      const data = await res.json();

      // Should NOT contain any content fields
      expect(data.stats.jobs.content).toBeUndefined();
      expect(data.stats.jobs.prompts).toBeUndefined();
      expect(data.stats.consents.details).toBeUndefined();
    });

    it('[STATS-022] should return 404 when user not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const req = createTenantAdminRequest(TEST_USER_ID);
      const res = await GET(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(404);
    });
  });

  // =====================
  // Zero Stats Tests
  // =====================
  describe('Zero Stats', () => {
    it('[STATS-030] should return zeros for user with no activity', async () => {
      mockFindById.mockResolvedValueOnce(mockUser);
      mockQuery
        .mockResolvedValueOnce({ rows: [{ success: '0', failed: '0', total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ granted: '0', revoked: '0', total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const req = createTenantAdminRequest(TEST_USER_ID);
      const res = await GET(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.stats.jobs.total).toBe(0);
      expect(data.stats.consents.total).toBe(0);
      expect(data.stats.auditEvents.total).toBe(0);
    });
  });
});
