/**
 * User Reactivate API Tests - LOT 12.1
 *
 * Tests for POST /api/users/:id/reactivate
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Audit event logged
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindById = jest.fn();
const mockUpdateDataSuspension = jest.fn();
const mockAuditWrite = jest.fn();

jest.mock('@/infrastructure/repositories/PgUserRepo', () => ({
  PgUserRepo: jest.fn().mockImplementation(() => ({
    findById: (...args: unknown[]) => mockFindById(...args),
    updateDataSuspension: (...args: unknown[]) => mockUpdateDataSuspension(...args),
  })),
}));

jest.mock('@/infrastructure/audit/PgAuditEventWriter', () => ({
  PgAuditEventWriter: jest.fn().mockImplementation(() => ({
    write: (...args: unknown[]) => mockAuditWrite(...args),
  })),
}));

// Import route handler AFTER mocking
import { POST } from '@app/api/users/[id]/reactivate/route';

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
  return new NextRequest(`http://localhost/api/users/${userId}/reactivate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function createMemberRequest(userId: string, userTenantId: string = TEST_TENANT_ID): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: userTenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(`http://localhost/api/users/${userId}/reactivate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function createUnauthenticatedRequest(userId: string): NextRequest {
  return new NextRequest(`http://localhost/api/users/${userId}/reactivate`, {
    method: 'POST',
  });
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const mockActiveUser = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  displayName: 'Test User',
  role: ACTOR_ROLE.MEMBER,
  dataSuspended: false,
  dataSuspendedAt: null,
  dataSuspendedReason: null,
};

const mockSuspendedUser = {
  ...mockActiveUser,
  dataSuspended: true,
  dataSuspendedAt: new Date(),
  dataSuspendedReason: 'Previous suspension reason',
};

// =============================================================================
// TESTS
// =============================================================================

describe('POST /api/users/:id/reactivate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // Authentication Tests
  // =====================
  describe('Authentication', () => {
    it('[REACT-001] should return 401 for unauthenticated requests', async () => {
      const req = createUnauthenticatedRequest(TEST_USER_ID);
      const res = await POST(req, createParams(TEST_USER_ID));
      expect(res.status).toBe(401);
    });

    it('[REACT-002] should return 403 for MEMBER role', async () => {
      const req = createMemberRequest(TEST_USER_ID);
      const res = await POST(req, createParams(TEST_USER_ID));
      expect(res.status).toBe(403);
    });

    it('[REACT-003] should allow TENANT_ADMIN role', async () => {
      mockFindById.mockResolvedValueOnce(mockSuspendedUser);
      mockUpdateDataSuspension.mockResolvedValueOnce(mockActiveUser);
      mockAuditWrite.mockResolvedValueOnce(undefined);

      const req = createTenantAdminRequest(TEST_USER_ID);
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
    });
  });

  // =====================
  // Tenant Isolation Tests
  // =====================
  describe('Tenant Isolation', () => {
    it('[REACT-010] should return 403 for cross-tenant reactivate attempt', async () => {
      mockFindById.mockResolvedValueOnce({
        ...mockSuspendedUser,
        tenantId: OTHER_TENANT_ID,
      });

      const req = createTenantAdminRequest(TEST_USER_ID, TEST_TENANT_ID);
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(403);
      const data = await res.json();
      // Error message could be generic "Forbidden" or "Cross-tenant access denied"
      expect(data.error).toBeDefined();
    });

    it('[REACT-011] should allow reactivate for user in same tenant', async () => {
      mockFindById.mockResolvedValueOnce(mockSuspendedUser);
      mockUpdateDataSuspension.mockResolvedValueOnce(mockActiveUser);
      mockAuditWrite.mockResolvedValueOnce(undefined);

      const req = createTenantAdminRequest(TEST_USER_ID, TEST_TENANT_ID);
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(mockUpdateDataSuspension).toHaveBeenCalledWith(TEST_USER_ID, false);
    });
  });

  // =====================
  // Validation Tests
  // =====================
  describe('Validation', () => {
    it('[REACT-020] should return 404 when user not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const req = createTenantAdminRequest(TEST_USER_ID);
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(404);
    });
  });

  // =====================
  // Behavior Tests
  // =====================
  describe('Reactivate Behavior', () => {
    it('[REACT-030] should return success for already active user', async () => {
      mockFindById.mockResolvedValueOnce(mockActiveUser);

      const req = createTenantAdminRequest(TEST_USER_ID);
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain('not suspended');
      expect(mockUpdateDataSuspension).not.toHaveBeenCalled();
    });

    it('[REACT-031] should log audit event on successful reactivate', async () => {
      mockFindById.mockResolvedValueOnce(mockSuspendedUser);
      mockUpdateDataSuspension.mockResolvedValueOnce(mockActiveUser);
      mockAuditWrite.mockResolvedValueOnce(undefined);

      const req = createTenantAdminRequest(TEST_USER_ID);
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(mockAuditWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'user.reactivated',
          targetId: TEST_USER_ID,
          actorScope: 'TENANT',
          tenantId: TEST_TENANT_ID,
        })
      );
    });

    it('[REACT-032] should return updated user data on success', async () => {
      mockFindById.mockResolvedValueOnce(mockSuspendedUser);
      mockUpdateDataSuspension.mockResolvedValueOnce(mockActiveUser);
      mockAuditWrite.mockResolvedValueOnce(undefined);

      const req = createTenantAdminRequest(TEST_USER_ID);
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.dataSuspended).toBe(false);
      expect(data.message).toContain('successfully');
    });
  });
});
