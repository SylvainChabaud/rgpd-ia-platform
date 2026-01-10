/**
 * Tests for RBAC Middleware
 * LOT 5.3 - API Layer
 *
 * Coverage targets for middleware/rbac.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRBAC, withPlatformAdmin, withTenantAdmin } from '@/middleware/rbac';
import type { RequestContext } from '@/lib/requestContext';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

/**
 * Helper to create an authenticated request with user context
 */
function createAuthenticatedRequest(user: RequestContext): NextRequest {
  const req = new NextRequest('http://localhost/api/test');
  (req as NextRequest & { user?: RequestContext }).user = user;
  return req;
}

describe('withRBAC middleware', () => {
  const mockHandler = jest.fn(async (_req: NextRequest) => 
    NextResponse.json({ success: true })
  );

  beforeEach(() => {
    mockHandler.mockClear();
  });

  test('rejects request without user context', async () => {
    const req = new NextRequest('http://localhost/api/test');
    const wrappedHandler = withRBAC([ACTOR_ROLE.TENANT_ADMIN])(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('rejects when requirePlatformScope is true but user is TENANT scope', async () => {
    const req = createAuthenticatedRequest({
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    });
    const wrappedHandler = withRBAC([ACTOR_ROLE.TENANT_ADMIN], true)(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Platform admin');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('rejects when user role is not in allowed roles', async () => {
    const req = createAuthenticatedRequest({
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    });
    const wrappedHandler = withRBAC([ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.DPO])(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Insufficient permissions');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('allows when user role is in allowed roles', async () => {
    const req = createAuthenticatedRequest({
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    });
    const wrappedHandler = withRBAC([ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.DPO])(mockHandler);

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });

  test('allows platform user when requirePlatformScope is true', async () => {
    const req = createAuthenticatedRequest({
      userId: 'user-1',
      tenantId: null,
      scope: ACTOR_SCOPE.PLATFORM,
      role: ACTOR_ROLE.SUPERADMIN,
    });
    const wrappedHandler = withRBAC([ACTOR_ROLE.SUPERADMIN], true)(mockHandler);

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });
});

describe('withPlatformAdmin middleware', () => {
  const mockHandler = jest.fn(async (_req: NextRequest) => 
    NextResponse.json({ success: true })
  );

  beforeEach(() => {
    mockHandler.mockClear();
  });

  test('rejects request without user context', async () => {
    const req = new NextRequest('http://localhost/api/test');
    const wrappedHandler = withPlatformAdmin(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Authentication required');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('rejects TENANT scope user', async () => {
    const req = createAuthenticatedRequest({
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    });
    const wrappedHandler = withPlatformAdmin(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Platform admin');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('allows PLATFORM scope user', async () => {
    const req = createAuthenticatedRequest({
      userId: 'user-1',
      tenantId: null,
      scope: ACTOR_SCOPE.PLATFORM,
      role: ACTOR_ROLE.SUPERADMIN,
    });
    const wrappedHandler = withPlatformAdmin(mockHandler);

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });
});

describe('withTenantAdmin middleware', () => {
  const mockHandler = jest.fn(async (_req: NextRequest) => 
    NextResponse.json({ success: true })
  );

  beforeEach(() => {
    mockHandler.mockClear();
  });

  test('rejects request without user context', async () => {
    const req = new NextRequest('http://localhost/api/test');
    const wrappedHandler = withTenantAdmin(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Authentication required');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('rejects PLATFORM scope user', async () => {
    const req = createAuthenticatedRequest({
      userId: 'user-1',
      tenantId: null,
      scope: ACTOR_SCOPE.PLATFORM,
      role: ACTOR_ROLE.SUPERADMIN,
    });
    const wrappedHandler = withTenantAdmin(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Tenant scope required');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('rejects tenant user without ADMIN role', async () => {
    const req = createAuthenticatedRequest({
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    });
    const wrappedHandler = withTenantAdmin(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Tenant admin');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('allows tenant admin with admin role', async () => {
    const req = createAuthenticatedRequest({
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    });
    const wrappedHandler = withTenantAdmin(mockHandler);

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });

  test('allows tenant admin with any role containing ADMIN', async () => {
    const req = createAuthenticatedRequest({
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.SUPERADMIN,
    });
    const wrappedHandler = withTenantAdmin(mockHandler);

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });
});
