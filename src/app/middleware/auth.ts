/**
 * Re-export auth middleware for API routes
 * EPIC 10 - LOT 10.6
 */

import { NextRequest } from 'next/server';
import { stubAuthProvider } from '@/app/auth/stubAuthProvider';
import { ACTOR_ROLE } from '@/shared/actorRole';

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
 * Simple authentication helper for API routes
 * Validates Bearer token and returns authenticated user
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return { authenticated: false };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) {
    return { authenticated: false };
  }

  const token = match[1];
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
