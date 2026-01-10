/**
 * Tests for Request Context Extraction
 * LOT 5.3 - API Layer
 *
 * Coverage targets for lib/requestContext.ts
 */

import { NextRequest } from 'next/server';
import {
  extractContext,
  requireContext,
  isPlatformAdmin,
  hasRole,
  isTenantMember,
  isTenantAdmin,
  type RequestContext,
} from '@/lib/requestContext';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

describe('extractContext', () => {
  test('returns null when no user attached', () => {
    const req = new NextRequest('http://localhost/api/test');
    expect(extractContext(req)).toBeNull();
  });

  test('returns context when user is attached', () => {
    const req = new NextRequest('http://localhost/api/test');
    (req as NextRequest & { user?: RequestContext }).user = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    };

    const context = extractContext(req);
    expect(context).not.toBeNull();
    expect(context?.userId).toBe('user-1');
    expect(context?.tenantId).toBe('tenant-1');
    expect(context?.scope).toBe(ACTOR_SCOPE.TENANT);
    expect(context?.role).toBe(ACTOR_ROLE.TENANT_ADMIN);
  });

  test('returns null tenantId when not provided', () => {
    const req = new NextRequest('http://localhost/api/test');
    (req as NextRequest & { user?: RequestContext }).user = {
      userId: 'user-1',
      tenantId: null,
      scope: ACTOR_SCOPE.PLATFORM,
      role: ACTOR_ROLE.SUPERADMIN,
    };

    const context = extractContext(req);
    expect(context?.tenantId).toBeNull();
  });
});

describe('requireContext', () => {
  test('returns context when user is attached', () => {
    const req = new NextRequest('http://localhost/api/test');
    (req as NextRequest & { user?: RequestContext }).user = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    };

    const context = requireContext(req);
    expect(context.userId).toBe('user-1');
  });

  test('throws error when no user attached', () => {
    const req = new NextRequest('http://localhost/api/test');
    expect(() => requireContext(req)).toThrow('Authentication required');
  });
});

describe('isPlatformAdmin', () => {
  test('returns true for PLATFORM scope', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: null,
      scope: ACTOR_SCOPE.PLATFORM,
      role: ACTOR_ROLE.SUPERADMIN,
    };
    expect(isPlatformAdmin(context)).toBe(true);
  });

  test('returns false for TENANT scope', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    };
    expect(isPlatformAdmin(context)).toBe(false);
  });
});

describe('hasRole', () => {
  test('returns true when user has matching role', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    };
    expect(hasRole(context, ACTOR_ROLE.TENANT_ADMIN)).toBe(true);
  });

  test('returns false when user does not have matching role', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    };
    expect(hasRole(context, ACTOR_ROLE.TENANT_ADMIN)).toBe(false);
  });

  test('returns true when role matches one in array', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    };
    expect(hasRole(context, [ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.DPO])).toBe(true);
  });

  test('returns false when role does not match any in array', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    };
    expect(hasRole(context, [ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.DPO])).toBe(false);
  });
});

describe('isTenantMember', () => {
  test('returns true when tenant member matches', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    };
    expect(isTenantMember(context, 'tenant-1')).toBe(true);
  });

  test('returns false when tenant does not match', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    };
    expect(isTenantMember(context, 'tenant-2')).toBe(false);
  });

  test('returns false for PLATFORM scope users', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: null,
      scope: ACTOR_SCOPE.PLATFORM,
      role: ACTOR_ROLE.SUPERADMIN,
    };
    expect(isTenantMember(context, 'tenant-1')).toBe(false);
  });
});

describe('isTenantAdmin', () => {
  test('returns true for tenant admin role', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    };
    expect(isTenantAdmin(context)).toBe(true);
  });

  test('returns true for TENANT_ADMIN role', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    };
    expect(isTenantAdmin(context)).toBe(true);
  });

  test('returns false for regular user role', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    };
    expect(isTenantAdmin(context)).toBe(false);
  });

  test('returns false for PLATFORM scope', () => {
    const context: RequestContext = {
      userId: 'user-1',
      tenantId: null,
      scope: ACTOR_SCOPE.PLATFORM,
      role: ACTOR_ROLE.SUPERADMIN,
    };
    expect(isTenantAdmin(context)).toBe(false);
  });
});
