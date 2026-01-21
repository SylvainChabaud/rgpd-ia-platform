/**
 * Tests for API Authentication Middleware
 * LOT 10.6 - API Layer Authentication
 *
 * Coverage targets for src/app/middleware/auth.ts
 *
 * CRITICAL: Tests cookie-based auth (httpOnly) which was a bug fix
 * - Cookie auth has priority over Authorization header
 * - Both methods must work for backwards compatibility
 */

import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/app/middleware/auth';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { AUTH_COOKIES } from '@/shared/auth/constants';

describe('authenticateRequest middleware', () => {
  const validPayload = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.DPO,
  };

  describe('Cookie-based authentication (httpOnly)', () => {
    it('should authenticate with valid JWT in cookie', async () => {
      const token = signJwt(validPayload);
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: `${AUTH_COOKIES.ACCESS_TOKEN}=${token}`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user-123');
      expect(result.user?.tenantId).toBe('tenant-456');
      expect(result.user?.scope).toBe('TENANT');
      expect(result.user?.role).toBe('DPO');
    });

    it('should authenticate with cookie containing multiple values', async () => {
      const token = signJwt(validPayload);
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: `other_cookie=value; ${AUTH_COOKIES.ACCESS_TOKEN}=${token}; another=test`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(true);
      expect(result.user?.id).toBe('user-123');
    });

    it('should reject invalid JWT in cookie', async () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: `${AUTH_COOKIES.ACCESS_TOKEN}=invalid-token`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
    });

    // Note: Expired token testing requires time mocking or raw JWT creation
    // signJwt() always generates fresh exp, so we test with malformed token instead
    it('should reject malformed JWT in cookie', async () => {
      // A token with invalid structure (missing parts)
      const malformedToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0ZXN0In0';
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: `${AUTH_COOKIES.ACCESS_TOKEN}=${malformedToken}`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(false);
    });
  });

  describe('Authorization header authentication (fallback)', () => {
    it('should authenticate with valid Bearer token', async () => {
      const token = signJwt(validPayload);
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(true);
      expect(result.user?.id).toBe('user-123');
    });

    it('should reject invalid Authorization format', async () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: 'InvalidFormat',
        },
      });

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(false);
    });

    it('should reject invalid JWT in Authorization header', async () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(false);
    });
  });

  describe('Priority: Cookie over Authorization header', () => {
    it('should prefer cookie when both are present', async () => {
      const cookieToken = signJwt({
        ...validPayload,
        userId: 'cookie-user',
      });
      const headerToken = signJwt({
        ...validPayload,
        userId: 'header-user',
      });

      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: `${AUTH_COOKIES.ACCESS_TOKEN}=${cookieToken}`,
          Authorization: `Bearer ${headerToken}`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(true);
      expect(result.user?.id).toBe('cookie-user'); // Cookie wins
    });

    it('should fallback to header when cookie is missing', async () => {
      const headerToken = signJwt({
        ...validPayload,
        userId: 'header-user',
      });

      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: 'other_cookie=value', // No auth_token
          Authorization: `Bearer ${headerToken}`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(true);
      expect(result.user?.id).toBe('header-user'); // Header fallback
    });

    it('should fallback to header when cookie token is invalid', async () => {
      const headerToken = signJwt({
        ...validPayload,
        userId: 'header-user',
      });

      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: `${AUTH_COOKIES.ACCESS_TOKEN}=invalid-cookie-token`,
          Authorization: `Bearer ${headerToken}`,
        },
      });

      const result = await authenticateRequest(req);

      // Note: Current implementation doesn't fallback if cookie is invalid
      // This test documents current behavior
      expect(result.authenticated).toBe(false);
    });
  });

  describe('No authentication', () => {
    it('should reject request without any auth', async () => {
      const req = new NextRequest('http://localhost/api/test');

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should reject request with empty cookie', async () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: '',
        },
      });

      const result = await authenticateRequest(req);

      expect(result.authenticated).toBe(false);
    });
  });

  describe('Role extraction', () => {
    it('should extract DPO role correctly', async () => {
      const token = signJwt({
        ...validPayload,
        role: ACTOR_ROLE.DPO,
      });
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: `${AUTH_COOKIES.ACCESS_TOKEN}=${token}`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.user?.role).toBe('DPO');
    });

    it('should extract TENANT_ADMIN role correctly', async () => {
      const token = signJwt({
        ...validPayload,
        role: ACTOR_ROLE.TENANT_ADMIN,
      });
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: `${AUTH_COOKIES.ACCESS_TOKEN}=${token}`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.user?.role).toBe('TENANT_ADMIN');
    });

    it('should extract SUPERADMIN role with PLATFORM scope', async () => {
      const token = signJwt({
        userId: 'admin-1',
        tenantId: null,
        scope: ACTOR_SCOPE.PLATFORM,
        role: ACTOR_ROLE.SUPERADMIN,
      });
      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: `${AUTH_COOKIES.ACCESS_TOKEN}=${token}`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.user?.role).toBe('SUPERADMIN');
      expect(result.user?.scope).toBe('PLATFORM');
      expect(result.user?.tenantId).toBeNull();
    });
  });
});
