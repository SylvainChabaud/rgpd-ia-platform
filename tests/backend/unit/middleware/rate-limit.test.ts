/**
 * Rate Limiting Middleware Tests - LOT 5.3
 *
 * Tests for:
 * - withRateLimit middleware factory
 * - userKeyGenerator, tenantKeyGenerator
 * - cleanupRateLimitStore
 *
 * SECURITY (Art. 32):
 * - Protection against DoS attacks
 * - Per-IP, per-user, per-tenant limits
 * - Proper rate limit headers
 *
 * Test Pattern:
 * - [RL-XXX] for rate limit tests
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withRateLimit,
  userKeyGenerator,
  tenantKeyGenerator,
  cleanupRateLimitStore,
} from '@/middleware/rateLimit';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE, type UserScope } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';
import type { RequestContext } from '@/lib/requestContext';

// =============================================================================
// HELPERS
// =============================================================================

function createMockHandler() {
  return jest.fn().mockImplementation(async () => {
    return NextResponse.json({ success: true });
  });
}

function createRequest(options: {
  ip?: string;
  userId?: string;
  tenantId?: string | null;
  scope?: UserScope;
  role?: string;
}): NextRequest {
  const headers: Record<string, string> = {};

  if (options.ip) {
    headers['x-forwarded-for'] = options.ip;
  }

  const req = new NextRequest('http://localhost/api/test', {
    method: 'GET',
    headers,
  }) as NextRequest & { user?: RequestContext };

  // If authenticated, attach user context directly to request
  // This mimics what the auth middleware does
  if (options.userId) {
    const token = signJwt({
      userId: options.userId,
      tenantId: options.tenantId ?? null,
      scope: options.scope ?? ACTOR_SCOPE.TENANT,
      role: options.role ?? ACTOR_ROLE.MEMBER,
    });

    // Set auth header for token extraction
    (req.headers as Headers).set('Authorization', `Bearer ${token}`);

    // Attach user context to request (like auth middleware does)
    req.user = {
      userId: options.userId,
      tenantId: options.tenantId ?? null,
      scope: options.scope ?? ACTOR_SCOPE.TENANT,
      role: options.role ?? ACTOR_ROLE.MEMBER,
    };
  }

  return req;
}

// =============================================================================
// TESTS
// =============================================================================

describe('withRateLimit - Rate Limiting Middleware', () => {
  beforeEach(() => {
    // Clean up rate limit store between tests
    cleanupRateLimitStore();
    jest.clearAllMocks();
  });

  describe('Basic Rate Limiting', () => {
    it('[RL-001] should allow requests under the limit', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 5, windowMs: 60000 })(handler);

      const req = createRequest({ ip: '192.168.1.1' });
      const response = await rateLimitedHandler(req);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('[RL-002] should return 429 when limit is exceeded', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 2, windowMs: 60000 })(handler);

      const ip = '192.168.1.2';

      // First 2 requests should pass
      await rateLimitedHandler(createRequest({ ip }));
      await rateLimitedHandler(createRequest({ ip }));

      // Third request should be rate limited
      const response = await rateLimitedHandler(createRequest({ ip }));

      expect(response.status).toBe(429);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('[RL-003] should include Retry-After header on 429', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 1, windowMs: 60000 })(handler);

      const ip = '192.168.1.3';
      await rateLimitedHandler(createRequest({ ip }));

      const response = await rateLimitedHandler(createRequest({ ip }));

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();
      expect(parseInt(response.headers.get('Retry-After') || '0')).toBeGreaterThan(0);
    });

    it('[RL-004] should include X-RateLimit headers on success', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 10, windowMs: 60000 })(handler);

      const req = createRequest({ ip: '192.168.1.4' });
      const response = await rateLimitedHandler(req);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('[RL-005] should decrement remaining count correctly', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 5, windowMs: 60000 })(handler);

      const ip = '192.168.1.5';

      const response1 = await rateLimitedHandler(createRequest({ ip }));
      expect(response1.headers.get('X-RateLimit-Remaining')).toBe('4');

      const response2 = await rateLimitedHandler(createRequest({ ip }));
      expect(response2.headers.get('X-RateLimit-Remaining')).toBe('3');

      const response3 = await rateLimitedHandler(createRequest({ ip }));
      expect(response3.headers.get('X-RateLimit-Remaining')).toBe('2');
    });

    it('[RL-006] should show 0 remaining on 429 response', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 1, windowMs: 60000 })(handler);

      const ip = '192.168.1.6';
      await rateLimitedHandler(createRequest({ ip }));

      const response = await rateLimitedHandler(createRequest({ ip }));

      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });

  describe('IP-Based Rate Limiting', () => {
    it('[RL-007] should rate limit by IP address', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 2, windowMs: 60000 })(handler);

      // IP 1 should have its own limit
      await rateLimitedHandler(createRequest({ ip: '10.0.0.1' }));
      await rateLimitedHandler(createRequest({ ip: '10.0.0.1' }));

      // IP 2 should have its own limit
      const responseIp2 = await rateLimitedHandler(createRequest({ ip: '10.0.0.2' }));
      expect(responseIp2.status).toBe(200);

      // IP 1 should be rate limited
      const responseIp1 = await rateLimitedHandler(createRequest({ ip: '10.0.0.1' }));
      expect(responseIp1.status).toBe(429);
    });

    it('[RL-008] should use x-forwarded-for header for IP detection', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 1, windowMs: 60000 })(handler);

      const req1 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' },
      });
      await rateLimitedHandler(req1);

      // Same IP (first in chain) should be rate limited
      const req2 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '203.0.113.1, 192.168.1.2' },
      });
      const response = await rateLimitedHandler(req2);

      expect(response.status).toBe(429);
    });

    it('[RL-009] should use x-real-ip as fallback', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 1, windowMs: 60000 })(handler);

      const req1 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': '203.0.113.2' },
      });
      await rateLimitedHandler(req1);

      const req2 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': '203.0.113.2' },
      });
      const response = await rateLimitedHandler(req2);

      expect(response.status).toBe(429);
    });
  });

  describe('Custom Key Generators', () => {
    it('[RL-010] should support custom key generator', async () => {
      const handler = createMockHandler();
      const customKeyGenerator = jest.fn().mockReturnValue('custom-key-1');

      const rateLimitedHandler = withRateLimit({
        maxRequests: 1,
        windowMs: 60000,
        keyGenerator: customKeyGenerator,
      })(handler);

      await rateLimitedHandler(createRequest({ ip: '10.0.0.1' }));

      expect(customKeyGenerator).toHaveBeenCalled();

      // Second request with same custom key should be rate limited
      const response = await rateLimitedHandler(createRequest({ ip: '10.0.0.2' }));
      expect(response.status).toBe(429);
    });

    it('[RL-011] userKeyGenerator should use userId when authenticated', () => {
      const req = createRequest({
        ip: '10.0.0.1',
        userId: 'user-123',
        tenantId: 'tenant-456',
      });

      const key = userKeyGenerator(req);

      expect(key).toBe('user:user-123');
    });

    it('[RL-012] userKeyGenerator should fallback to IP when not authenticated', () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '203.0.113.3' },
      });

      const key = userKeyGenerator(req);

      expect(key).toBe('ip:203.0.113.3');
    });

    it('[RL-013] tenantKeyGenerator should use tenantId when available', () => {
      const req = createRequest({
        ip: '10.0.0.1',
        userId: 'user-123',
        tenantId: 'tenant-789',
      });

      const key = tenantKeyGenerator(req);

      expect(key).toBe('tenant:tenant-789');
    });

    it('[RL-014] tenantKeyGenerator should fallback to user when no tenantId', () => {
      const req = createRequest({
        ip: '10.0.0.1',
        userId: 'user-123',
        tenantId: null,
      });

      const key = tenantKeyGenerator(req);

      expect(key).toBe('user:user-123');
    });
  });

  describe('Window Reset', () => {
    it('[RL-015] should reset count after window expires', async () => {
      jest.useFakeTimers();

      const handler = createMockHandler();
      const windowMs = 1000; // 1 second window
      const rateLimitedHandler = withRateLimit({ maxRequests: 2, windowMs })(handler);

      const ip = '192.168.1.100';

      // Use up the limit
      await rateLimitedHandler(createRequest({ ip }));
      await rateLimitedHandler(createRequest({ ip }));

      // Should be rate limited
      let response = await rateLimitedHandler(createRequest({ ip }));
      expect(response.status).toBe(429);

      // Advance time past the window
      jest.advanceTimersByTime(windowMs + 100);

      // Should work again
      response = await rateLimitedHandler(createRequest({ ip }));
      expect(response.status).toBe(200);

      jest.useRealTimers();
    });
  });

  describe('Default Configuration', () => {
    it('[RL-016] should use default limits when no config provided', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit()(handler);

      const req = createRequest({ ip: '192.168.1.200' });
      const response = await rateLimitedHandler(req);

      // Default is 100 requests per minute
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('99');
    });
  });

  describe('Cleanup Function', () => {
    it('[RL-017] should remove expired entries on cleanup', async () => {
      jest.useFakeTimers();

      const handler = createMockHandler();
      const windowMs = 1000;
      const rateLimitedHandler = withRateLimit({ maxRequests: 5, windowMs })(handler);

      // Create some rate limit entries
      await rateLimitedHandler(createRequest({ ip: '10.0.0.10' }));
      await rateLimitedHandler(createRequest({ ip: '10.0.0.11' }));

      // Advance time past the window
      jest.advanceTimersByTime(windowMs + 100);

      // Run cleanup
      cleanupRateLimitStore();

      // Entries should be cleaned, new requests should have fresh limit
      const response = await rateLimitedHandler(createRequest({ ip: '10.0.0.10' }));
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');

      jest.useRealTimers();
    });
  });

  describe('Security - Art. 32', () => {
    it('[RL-SEC-001] should protect against DoS by enforcing limits', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 10, windowMs: 60000 })(handler);

      const ip = '10.0.0.50';

      // Simulate DoS attack - many requests
      const responses: NextResponse[] = [];
      for (let i = 0; i < 15; i++) {
        const response = await rateLimitedHandler(createRequest({ ip }));
        responses.push(response);
      }

      // First 10 should pass, rest should be blocked
      const successCount = responses.filter(r => r.status === 200).length;
      const blockedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBe(10);
      expect(blockedCount).toBe(5);
    });

    it('[RL-SEC-002] should include proper error response on 429', async () => {
      const handler = createMockHandler();
      const rateLimitedHandler = withRateLimit({ maxRequests: 1, windowMs: 60000 })(handler);

      const ip = '10.0.0.51';
      await rateLimitedHandler(createRequest({ ip }));

      const response = await rateLimitedHandler(createRequest({ ip }));
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBeDefined();
    });
  });
});
