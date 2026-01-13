/**
 * User Suspend API Tests - LOT 12.1
 *
 * Tests for POST /api/users/:id/suspend
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced (user must belong to same tenant)
 * - Reason required (Art. 5 Accountability)
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
import { POST } from '@app/api/users/[id]/suspend/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const OTHER_TENANT_ID = 'tenant-xyz-456';
const TEST_USER_ID = 'user-123-abc';

function createTenantAdminRequest(userId: string, body: object, userTenantId: string = TEST_TENANT_ID): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: userTenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(`http://localhost/api/users/${userId}/suspend`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function createMemberRequest(userId: string, body: object, userTenantId: string = TEST_TENANT_ID): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: userTenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(`http://localhost/api/users/${userId}/suspend`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function createUnauthenticatedRequest(userId: string, body: object): NextRequest {
  return new NextRequest(`http://localhost/api/users/${userId}/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const mockUser = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  displayName: 'Test User',
  role: ACTOR_ROLE.MEMBER,
  dataSuspended: false,
  dataSuspendedAt: null,
};

const mockSuspendedUser = {
  ...mockUser,
  dataSuspended: true,
  dataSuspendedAt: new Date(),
};

// =============================================================================
// TESTS
// =============================================================================

describe('POST /api/users/:id/suspend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // Authentication Tests
  // =====================
  describe('Authentication', () => {
    it('[SUSPEND-001] should return 401 for unauthenticated requests', async () => {
      const req = createUnauthenticatedRequest(TEST_USER_ID, { reason: 'Test reason' });
      const res = await POST(req, createParams(TEST_USER_ID));
      expect(res.status).toBe(401);
    });

    it('[SUSPEND-002] should return 403 for MEMBER role', async () => {
      const req = createMemberRequest(TEST_USER_ID, { reason: 'Test reason' });
      const res = await POST(req, createParams(TEST_USER_ID));
      expect(res.status).toBe(403);
    });

    it('[SUSPEND-003] should allow TENANT_ADMIN role', async () => {
      mockFindById.mockResolvedValueOnce(mockUser);
      mockUpdateDataSuspension.mockResolvedValueOnce(mockSuspendedUser);
      mockAuditWrite.mockResolvedValueOnce(undefined);

      const req = createTenantAdminRequest(TEST_USER_ID, { reason: 'Test reason' });
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
    });
  });

  // =====================
  // Tenant Isolation Tests
  // =====================
  describe('Tenant Isolation', () => {
    it('[SUSPEND-010] should return 403 for cross-tenant suspend attempt', async () => {
      // User belongs to different tenant
      mockFindById.mockResolvedValueOnce({
        ...mockUser,
        tenantId: OTHER_TENANT_ID,
      });

      const req = createTenantAdminRequest(TEST_USER_ID, { reason: 'Test reason' }, TEST_TENANT_ID);
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(403);
      const data = await res.json();
      // Error message could be generic "Forbidden" or "Cross-tenant access denied"
      expect(data.error).toBeDefined();
    });

    it('[SUSPEND-011] should allow suspend for user in same tenant', async () => {
      mockFindById.mockResolvedValueOnce(mockUser);
      mockUpdateDataSuspension.mockResolvedValueOnce(mockSuspendedUser);
      mockAuditWrite.mockResolvedValueOnce(undefined);

      const req = createTenantAdminRequest(TEST_USER_ID, { reason: 'Valid reason' }, TEST_TENANT_ID);
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(mockUpdateDataSuspension).toHaveBeenCalledWith(TEST_USER_ID, true, 'Valid reason');
    });
  });

  // =====================
  // Validation Tests
  // =====================
  describe('Validation', () => {
    it('[SUSPEND-020] should return 400 when reason is missing', async () => {
      const req = createTenantAdminRequest(TEST_USER_ID, {});
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(400);
    });

    it('[SUSPEND-021] should return 400 when reason is empty string', async () => {
      const req = createTenantAdminRequest(TEST_USER_ID, { reason: '' });
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(400);
    });

    it('[SUSPEND-022] should return 400 when reason is too long', async () => {
      const req = createTenantAdminRequest(TEST_USER_ID, { reason: 'a'.repeat(501) });
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(400);
    });

    it('[SUSPEND-023] should return 404 when user not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const req = createTenantAdminRequest(TEST_USER_ID, { reason: 'Test reason' });
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(404);
    });
  });

  // =====================
  // Behavior Tests
  // =====================
  describe('Suspend Behavior', () => {
    it('[SUSPEND-030] should return success for already suspended user', async () => {
      mockFindById.mockResolvedValueOnce(mockSuspendedUser);

      const req = createTenantAdminRequest(TEST_USER_ID, { reason: 'Test reason' });
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain('already suspended');
      // Should not call updateDataSuspension since already suspended
      expect(mockUpdateDataSuspension).not.toHaveBeenCalled();
    });

    it('[SUSPEND-031] should log audit event on successful suspend', async () => {
      mockFindById.mockResolvedValueOnce(mockUser);
      mockUpdateDataSuspension.mockResolvedValueOnce(mockSuspendedUser);
      mockAuditWrite.mockResolvedValueOnce(undefined);

      const req = createTenantAdminRequest(TEST_USER_ID, { reason: 'Security incident' });
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(mockAuditWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'user.suspended',
          targetId: TEST_USER_ID,
          actorScope: ACTOR_SCOPE.TENANT,
          tenantId: TEST_TENANT_ID,
        })
      );
    });

    it('[SUSPEND-032] should return updated user data on success', async () => {
      mockFindById.mockResolvedValueOnce(mockUser);
      mockUpdateDataSuspension.mockResolvedValueOnce(mockSuspendedUser);
      mockAuditWrite.mockResolvedValueOnce(undefined);

      const req = createTenantAdminRequest(TEST_USER_ID, { reason: 'Test reason' });
      const res = await POST(req, createParams(TEST_USER_ID));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.dataSuspended).toBe(true);
      expect(data.message).toContain('successfully');
    });
  });
});
