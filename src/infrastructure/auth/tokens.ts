/**
 * Token Verification Utilities
 *
 * Wrapper around JWT functions for use in Server Components.
 * LOT 13.0 - CGU Acceptance
 *
 * RGPD: Token contains only P1 data (userId, tenantId, scope, role)
 */

import { verifyJwt, type JwtPayload } from '@/lib/jwt';

/**
 * Verify access token and return payload if valid
 *
 * @param token - Access token from cookie
 * @returns JWT payload or null if invalid/expired
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    return verifyJwt(token);
  } catch {
    return null;
  }
}

/**
 * Re-export JwtPayload for convenience
 */
export type { JwtPayload } from '@/lib/jwt';
