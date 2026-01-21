/**
 * Re-export auth middleware for API routes
 * EPIC 10 - LOT 10.6
 */

import { NextRequest } from 'next/server';
import { stubAuthProvider } from '@/app/auth/stubAuthProvider';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { AUTH_COOKIES } from '@/shared/auth/constants';

export interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    tenantId: string | null;
    scope: string;
    role: string;
  };
}

/**
 * Parse cookies from Cookie header (safe, no regex - anti-ReDoS)
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = rest.join('=');
    }
  }
  return cookies;
}

/**
 * Extract auth token from request
 *
 * Priority:
 * 1. httpOnly cookie (AUTH_COOKIES.ACCESS_TOKEN) - XSS-safe, preferred
 * 2. Authorization: Bearer <token> - API clients, backwards compatibility
 */
function extractToken(request: NextRequest): string | null {
  // 1. Try httpOnly cookie first (preferred - XSS-safe)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const accessToken = cookies[AUTH_COOKIES.ACCESS_TOKEN];
    if (accessToken) {
      return accessToken;
    }
  }

  // 2. Fallback to Authorization header (API clients, backwards compatibility)
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    return match?.[1] ?? null;
  }

  return null;
}

/**
 * Simple authentication helper for API routes
 * Validates JWT token and returns authenticated user
 *
 * SECURITY:
 * - Reads JWT from httpOnly cookie (primary) or Authorization header (fallback)
 * - Cookie-based auth prevents XSS token theft
 * - Header fallback maintained for API clients
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  const token = extractToken(request);

  if (!token) {
    return { authenticated: false };
  }

  const actor = await stubAuthProvider.validateAuth(token);

  if (!actor) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    user: {
      id: actor.actorId,
      tenantId: actor.tenantId || null,
      scope: actor.actorScope,
      role: actor.roles[0] || ACTOR_ROLE.MEMBER, // Take first role, default to MEMBER
    },
  };
}
