/**
 * User Email API Tests - LOT 1.6
 *
 * Tests for:
 * - GET /api/users/me (User's own email - Art. 15)
 * - GET /api/platform/users/:id/email (DPO only - Art. 34, 37-39)
 *
 * RGPD Compliance:
 * - User can ONLY see their own email
 * - DPO can see any user's email (for breach notifications)
 * - Platform Admin: FORBIDDEN
 * - Tenant Admin: FORBIDDEN
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindById = jest.fn();
const mockGetDecryptedEmail = jest.fn();
const mockAuditWrite = jest.fn();

jest.mock('@/infrastructure/repositories/PgUserRepo', () => ({
  PgUserRepo: jest.fn().mockImplementation(() => ({
    findById: mockFindById,
    getDecryptedEmail: mockGetDecryptedEmail,
  })),
}));

jest.mock('@/infrastructure/audit/PgAuditEventWriter', () => ({
  PgAuditEventWriter: jest.fn().mockImplementation(() => ({
    write: mockAuditWrite,
  })),
}));

// Import route handlers AFTER mocking
import { GET as GetCurrentUser } from '@app/api/users/me/route';
import { GET as GetUserEmail } from '@app/api/platform/users/[id]/email/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_USER_ID = 'user-abc-123';
const TEST_TENANT_ID = 'tenant-abc-123';
const TEST_EMAIL = 'user@example.com';

function createUserRequest(userId: string, tenantId: string): NextRequest {
  const token = signJwt({
    userId,
    tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest('http://localhost/api/users/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createDpoRequest(targetUserId: string): NextRequest {
  const token = signJwt({
    userId: 'dpo-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.DPO,
  });
  return new NextRequest(`http://localhost/api/platform/users/${targetUserId}/email`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createPlatformAdminRequest(targetUserId: string): NextRequest {
  const token = signJwt({
    userId: 'admin-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.SUPERADMIN,
  });
  return new NextRequest(`http://localhost/api/platform/users/${targetUserId}/email`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createTenantAdminRequest(targetUserId: string, tenantId: string): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(`http://localhost/api/platform/users/${targetUserId}/email`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// =============================================================================
// TESTS: GET /api/users/me
// =============================================================================

describe('GET /api/users/me - User email access (Art. 15)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user profile with decrypted email', async () => {
    mockFindById.mockResolvedValue({
      id: TEST_USER_ID,
      displayName: 'Test User',
      tenantId: TEST_TENANT_ID,
      role: ACTOR_ROLE.MEMBER,
      scope: ACTOR_SCOPE.TENANT,
      createdAt: new Date(),
    });
    mockGetDecryptedEmail.mockResolvedValue(TEST_EMAIL);

    const req = createUserRequest(TEST_USER_ID, TEST_TENANT_ID);
    const res = await GetCurrentUser(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.email).toBe(TEST_EMAIL);
    expect(body.user.displayName).toBe('Test User');
    expect(mockGetDecryptedEmail).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it('should return null email if not configured', async () => {
    mockFindById.mockResolvedValue({
      id: TEST_USER_ID,
      displayName: 'Test User',
      tenantId: TEST_TENANT_ID,
      role: ACTOR_ROLE.MEMBER,
      scope: ACTOR_SCOPE.TENANT,
      createdAt: new Date(),
    });
    mockGetDecryptedEmail.mockResolvedValue(null);

    const req = createUserRequest(TEST_USER_ID, TEST_TENANT_ID);
    const res = await GetCurrentUser(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.email).toBeNull();
  });

  it('should return 404 if user not found', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createUserRequest(TEST_USER_ID, TEST_TENANT_ID);
    const res = await GetCurrentUser(req);

    expect(res.status).toBe(404);
  });
});

// =============================================================================
// TESTS: GET /api/platform/users/:id/email (DPO ONLY)
// =============================================================================

describe('GET /api/platform/users/:id/email - DPO email access (Art. 34, 37-39)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('should allow DPO to access any user email', async () => {
    mockFindById.mockResolvedValue({
      id: TEST_USER_ID,
      displayName: 'Target User',
      tenantId: TEST_TENANT_ID,
    });
    mockGetDecryptedEmail.mockResolvedValue(TEST_EMAIL);

    const req = createDpoRequest(TEST_USER_ID);
    const res = await GetUserEmail(req, { params: Promise.resolve({ id: TEST_USER_ID }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.email).toBe(TEST_EMAIL);
    expect(body.displayName).toBe('Target User');
    expect(body.userId).toBe(TEST_USER_ID);
  });

  it('should DENY Platform Admin access to user email', async () => {
    mockFindById.mockResolvedValue({
      id: TEST_USER_ID,
      displayName: 'Target User',
      tenantId: TEST_TENANT_ID,
    });

    const req = createPlatformAdminRequest(TEST_USER_ID);
    const res = await GetUserEmail(req, { params: Promise.resolve({ id: TEST_USER_ID }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.message).toContain('DPO');
    expect(mockGetDecryptedEmail).not.toHaveBeenCalled();
  });

  it('should DENY Tenant Admin access to user email', async () => {
    mockFindById.mockResolvedValue({
      id: TEST_USER_ID,
      displayName: 'Target User',
      tenantId: TEST_TENANT_ID,
    });

    const req = createTenantAdminRequest(TEST_USER_ID, TEST_TENANT_ID);
    const res = await GetUserEmail(req, { params: Promise.resolve({ id: TEST_USER_ID }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.message).toContain('DPO');
    expect(mockGetDecryptedEmail).not.toHaveBeenCalled();
  });

  it('should return 404 if target user not found', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createDpoRequest('non-existent-user');
    const res = await GetUserEmail(req, { params: Promise.resolve({ id: 'non-existent-user' }) });

    expect(res.status).toBe(404);
  });

  it('should handle null email gracefully', async () => {
    mockFindById.mockResolvedValue({
      id: TEST_USER_ID,
      displayName: 'Target User',
      tenantId: TEST_TENANT_ID,
    });
    mockGetDecryptedEmail.mockResolvedValue(null);

    const req = createDpoRequest(TEST_USER_ID);
    const res = await GetUserEmail(req, { params: Promise.resolve({ id: TEST_USER_ID }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.email).toBeNull();
  });
});

// =============================================================================
// TESTS: RBAC Matrix Summary
// =============================================================================

describe('Email Access RBAC Matrix (LOT 1.6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue({
      id: TEST_USER_ID,
      displayName: 'Target User',
      tenantId: TEST_TENANT_ID,
    });
    mockGetDecryptedEmail.mockResolvedValue(TEST_EMAIL);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  /**
   * RGPD Email Access Rules:
   *
   * | Role           | Own Email | Other's Email | Via API                |
   * |----------------|-----------|---------------|------------------------|
   * | User/Member    | ✅        | ❌            | /api/users/me          |
   * | Tenant Admin   | ✅        | ❌            | /api/users/me          |
   * | Platform Admin | ✅        | ❌            | /api/users/me          |
   * | DPO            | ✅        | ✅            | /api/platform/users/:id/email |
   * | System         | N/A       | ✅            | Internal calls         |
   */

  it('should enforce: User can only see own email via /api/users/me', async () => {
    const req = createUserRequest(TEST_USER_ID, TEST_TENANT_ID);
    const res = await GetCurrentUser(req);

    expect(res.status).toBe(200);
    // User cannot access /api/platform/users/:id/email at all (RBAC denied)
  });

  it('should enforce: DPO can see any email via /api/platform/users/:id/email', async () => {
    const req = createDpoRequest('any-user-id');
    mockFindById.mockResolvedValue({
      id: 'any-user-id',
      displayName: 'Any User',
      tenantId: 'any-tenant',
    });

    const res = await GetUserEmail(req, { params: Promise.resolve({ id: 'any-user-id' }) });

    expect(res.status).toBe(200);
  });

  it('should enforce: Platform Admin CANNOT access other users email', async () => {
    const req = createPlatformAdminRequest(TEST_USER_ID);
    const res = await GetUserEmail(req, { params: Promise.resolve({ id: TEST_USER_ID }) });

    expect(res.status).toBe(403);
  });

  it('should enforce: Tenant Admin CANNOT access other users email', async () => {
    const req = createTenantAdminRequest(TEST_USER_ID, TEST_TENANT_ID);
    const res = await GetUserEmail(req, { params: Promise.resolve({ id: TEST_USER_ID }) });

    expect(res.status).toBe(403);
  });
});
