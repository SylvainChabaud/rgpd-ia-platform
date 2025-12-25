/**
 * Rate Limiting Middleware
 * LOT 5.3 - API Layer
 *
 * Simple in-memory rate limiting (MVP)
 * For production: use Redis-based rate limiting
 *
 * SECURITY:
 * - Protects against DoS attacks
 * - Per-IP, per-user, and per-tenant limits
 *
 * LIMITATIONS:
 * - In-memory only (single instance)
 * - Resets on server restart
 * - NOT suitable for multi-instance deployments
 *
 * USAGE:
 *   export const POST = withLogging(
 *     withRateLimit({ maxRequests: 10, windowMs: 60000 })(
 *       withAuth(async (req) => { ... })
 *     )
 *   );
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractContext } from '@/lib/requestContext';
import { rateLimitError } from '@/lib/errorResponse';

interface RateLimitConfig {
  maxRequests: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
}

interface RateLimitEntry {
  count: number;
  resetAt: number; // Timestamp when window resets
}

// In-memory rate limit store
// Key: identifier (IP, userId, tenantId)
// Value: { count, resetAt }
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Default rate limits
 */
const DEFAULT_LIMITS = {
  perIP: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min per IP
  perUser: { maxRequests: 500, windowMs: 60 * 1000 }, // 500 req/min per user
  perTenant: { maxRequests: 1000, windowMs: 60 * 1000 }, // 1000 req/min per tenant
};

/**
 * Rate limiting middleware factory
 */
export function withRateLimit(config?: Partial<RateLimitConfig>) {
  const {
    maxRequests = DEFAULT_LIMITS.perIP.maxRequests,
    windowMs = DEFAULT_LIMITS.perIP.windowMs,
    keyGenerator = defaultKeyGenerator,
  } = config || {};

  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (...args: any[]) => {
      const req = args[0] as NextRequest;

      const key = keyGenerator(req);
      const now = Date.now();

      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);

      if (!entry || now > entry.resetAt) {
        // Create new window
        entry = {
          count: 1,
          resetAt: now + windowMs,
        };
        rateLimitStore.set(key, entry);
      } else {
        // Increment count
        entry.count++;

        // Check limit
        if (entry.count > maxRequests) {
          const resetIn = Math.ceil((entry.resetAt - now) / 1000);

          const response = NextResponse.json(rateLimitError(), { status: 429 });
          response.headers.set('Retry-After', resetIn.toString());
          response.headers.set('X-RateLimit-Limit', maxRequests.toString());
          response.headers.set('X-RateLimit-Remaining', '0');
          response.headers.set('X-RateLimit-Reset', entry.resetAt.toString());

          return response;
        }
      }

      // Add rate limit headers to response
      const response = await handler(...args);
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
      response.headers.set('X-RateLimit-Reset', entry.resetAt.toString());

      return response;
    }) as T;
  };
}

/**
 * Default key generator (IP-based)
 */
function defaultKeyGenerator(req: NextRequest): string {
  // Try to get real IP from headers (behind proxy/load balancer)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');

  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

  return `ip:${ip}`;
}

/**
 * User-based rate limit key generator
 */
export function userKeyGenerator(req: NextRequest): string {
  const context = extractContext(req);

  if (context) {
    return `user:${context.userId}`;
  }

  // Fall back to IP if not authenticated
  return defaultKeyGenerator(req);
}

/**
 * Tenant-based rate limit key generator
 */
export function tenantKeyGenerator(req: NextRequest): string {
  const context = extractContext(req);

  if (context?.tenantId) {
    return `tenant:${context.tenantId}`;
  }

  // Fall back to user or IP
  return userKeyGenerator(req);
}

/**
 * Cleanup expired entries (run periodically)
 * Call this from a background job or cron
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
