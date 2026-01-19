/**
 * Tenant Stats API Tests
 *
 * Tests for GET /api/tenants/[id]/stats
 *
 * RGPD Compliance:
 * - Tenant admin only OR Platform admin
 * - Tenant isolation enforced (CRITICAL)
 * - Cross-tenant access blocked with 403
 * - Only P1 aggregated data returned
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockPoolQuery = jest.fn();

jest.mock('@/infrastructure/db/pool', () => ({
  getPool: jest.fn().mockImplementation(() => ({
    query: mockPoolQuery,
  })),
}));

jest.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import route handler AFTER mocking
import { GET as GetTenantStats } from '@app/api/tenants/[id]/stats/route';
import { logger } from '@/infrastructure/logging/logger';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const OTHER_TENANT_ID = 'tenant-xyz-456';
const PLATFORM_USER_ID = 'platform-admin-001';
const TENANT_ADMIN_ID = 'tenant-admin-001';

function createTenantAdminRequest(tenantId: string, urlTenantId: string): NextRequest {
  const token = signJwt({
    userId: TENANT_ADMIN_ID,
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });

  const url = new URL(`http://localhost:3000/api/tenants/${urlTenantId}/stats`);
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function createPlatformAdminRequest(urlTenantId: string): NextRequest {
  const token = signJwt({
    userId: PLATFORM_USER_ID,
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.SUPERADMIN,
  });

  const url = new URL(`http://localhost:3000/api/tenants/${urlTenantId}/stats`);
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function createDpoRequest(tenantId: string, urlTenantId: string): NextRequest {
  const token = signJwt({
    userId: 'dpo-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.DPO,
  });

  const url = new URL(`http://localhost:3000/api/tenants/${urlTenantId}/stats`);
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function createMemberRequest(tenantId: string, urlTenantId: string): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });

  const url = new URL(`http://localhost:3000/api/tenants/${urlTenantId}/stats`);
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function setupMockQueries(overrides: Partial<{
  users: { active_users: number; suspended_users: number };
  aiJobs: { pending: number; completed: number; failed: number };
  consents: { granted: number; revoked: number; pending: number };
  purposes: { active: number; inactive: number };
  lastActivity: string | null;
  dpias: { pending: number; approved: number; rejected: number };
}> = {}) {
  // Users query
  mockPoolQuery.mockResolvedValueOnce({
    rows: [{
      active_users: overrides.users?.active_users ?? 10,
      suspended_users: overrides.users?.suspended_users ?? 2,
    }],
  });

  // AI Jobs query
  mockPoolQuery.mockResolvedValueOnce({
    rows: [{
      pending: overrides.aiJobs?.pending ?? 5,
      completed: overrides.aiJobs?.completed ?? 100,
      failed: overrides.aiJobs?.failed ?? 3,
    }],
  });

  // Consents query
  mockPoolQuery.mockResolvedValueOnce({
    rows: [{
      granted: overrides.consents?.granted ?? 50,
      revoked: overrides.consents?.revoked ?? 5,
      pending: overrides.consents?.pending ?? 20,
    }],
  });

  // Purposes query
  mockPoolQuery.mockResolvedValueOnce({
    rows: [{
      active: overrides.purposes?.active ?? 8,
      inactive: overrides.purposes?.inactive ?? 2,
    }],
  });

  // Last activity query
  mockPoolQuery.mockResolvedValueOnce({
    rows: [{ last_activity: overrides.lastActivity ?? '2026-01-18T10:00:00Z' }],
  });

  // DPIAs query
  mockPoolQuery.mockResolvedValueOnce({
    rows: [{
      pending: overrides.dpias?.pending ?? 2,
      approved: overrides.dpias?.approved ?? 5,
      rejected: overrides.dpias?.rejected ?? 1,
    }],
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/tenants/[id]/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Authentication & Authorization Tests
  // ===========================================================================

  describe('Authentication', () => {
    it('should reject unauthenticated request', async () => {
      const url = new URL(`http://localhost:3000/api/tenants/${TEST_TENANT_ID}/stats`);
      const req = new NextRequest(url, { method: 'GET' });

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });

      expect(res.status).toBe(401);
    });
  });

  describe('Authorization - RBAC', () => {
    it('should allow TENANT_ADMIN to access their own tenant stats', async () => {
      setupMockQueries();
      const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });

      expect(res.status).toBe(200);
    });

    it('should allow DPO to access their own tenant stats', async () => {
      setupMockQueries();
      const req = createDpoRequest(TEST_TENANT_ID, TEST_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });

      expect(res.status).toBe(200);
    });

    it('should reject MEMBER from accessing tenant stats', async () => {
      const req = createMemberRequest(TEST_TENANT_ID, TEST_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });

      expect(res.status).toBe(403);
    });

    it('should allow PLATFORM_ADMIN to access any tenant stats', async () => {
      setupMockQueries();
      const req = createPlatformAdminRequest(TEST_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });

      expect(res.status).toBe(200);
    });
  });

  // ===========================================================================
  // RGPD Tenant Isolation Tests (CRITICAL)
  // ===========================================================================

  describe('RGPD: Cross-Tenant Isolation (CRITICAL)', () => {
    it('should reject TENANT_ADMIN accessing different tenant stats', async () => {
      const req = createTenantAdminRequest(TEST_TENANT_ID, OTHER_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: OTHER_TENANT_ID }) });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Access denied');
    });

    it('should log cross-tenant access attempt as security warning', async () => {
      const req = createTenantAdminRequest(TEST_TENANT_ID, OTHER_TENANT_ID);

      await GetTenantStats(req, { params: Promise.resolve({ id: OTHER_TENANT_ID }) });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          requestedTenantId: OTHER_TENANT_ID,
          actualTenantId: TEST_TENANT_ID,
        }),
        expect.stringContaining('Cross-tenant access attempt blocked')
      );
    });

    it('should reject DPO accessing different tenant stats', async () => {
      const req = createDpoRequest(TEST_TENANT_ID, OTHER_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: OTHER_TENANT_ID }) });

      expect(res.status).toBe(403);
    });

    it('should pass tenantId to all database queries', async () => {
      setupMockQueries();
      const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);

      await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });

      // All 6 queries should include tenantId
      expect(mockPoolQuery).toHaveBeenCalledTimes(6);
      mockPoolQuery.mock.calls.forEach((call) => {
        expect(call[1]).toContain(TEST_TENANT_ID);
      });
    });
  });

  // ===========================================================================
  // Response Format Tests
  // ===========================================================================

  describe('Response Format', () => {
    it('should return all stat categories', async () => {
      setupMockQueries();
      const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });
      const body = await res.json();

      expect(body.stats).toBeDefined();
      expect(body.stats.users).toBeDefined();
      expect(body.stats.aiJobs).toBeDefined();
      expect(body.stats.consents).toBeDefined();
      expect(body.stats.purposes).toBeDefined();
      expect(body.stats.lastActivity).toBeDefined();
      expect(body.stats.dpias).toBeDefined();
    });

    it('should return correct user stats', async () => {
      setupMockQueries({ users: { active_users: 15, suspended_users: 3 } });
      const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });
      const body = await res.json();

      expect(body.stats.users.active).toBe(15);
      expect(body.stats.users.suspended).toBe(3);
      expect(body.stats.users.total).toBe(18);
    });

    it('should return correct DPIA stats for DPO dashboard', async () => {
      setupMockQueries({ dpias: { pending: 4, approved: 10, rejected: 2 } });
      const req = createDpoRequest(TEST_TENANT_ID, TEST_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });
      const body = await res.json();

      expect(body.stats.dpias.pending).toBe(4);
      expect(body.stats.dpias.approved).toBe(10);
      expect(body.stats.dpias.rejected).toBe(2);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle tenant with no data gracefully', async () => {
      setupMockQueries({
        users: { active_users: 0, suspended_users: 0 },
        aiJobs: { pending: 0, completed: 0, failed: 0 },
        consents: { granted: 0, revoked: 0, pending: 0 },
        purposes: { active: 0, inactive: 0 },
        lastActivity: null,
        dpias: { pending: 0, approved: 0, rejected: 0 },
      });
      const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.stats.users.total).toBe(0);
      expect(body.stats.lastActivity).toBeNull();
    });

    it('should handle database error gracefully', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('Database connection failed'));
      const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);

      const res = await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });

      expect(res.status).toBe(500);
    });
  });

  // ===========================================================================
  // Logging Tests
  // ===========================================================================

  describe('Logging', () => {
    it('should log successful stats fetch with P1 data only', async () => {
      setupMockQueries();
      const req = createTenantAdminRequest(TEST_TENANT_ID, TEST_TENANT_ID);

      await GetTenantStats(req, { params: Promise.resolve({ id: TEST_TENANT_ID }) });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
        }),
        expect.stringContaining('stats')
      );

      // Verify no PII in logs
      const logCall = (logger.info as jest.Mock).mock.calls[0][0];
      expect(logCall).not.toHaveProperty('email');
      expect(logCall).not.toHaveProperty('displayName');
    });
  });
});
