/**
 * STUB AUTH PROVIDER - LOT 1.2
 *
 * TO BE REPLACED IN EPIC5 with real session/JWT implementation.
 *
 * This stub uses a fixed in-memory map for testing.
 * DO NOT use in production.
 */

import { ACTOR_SCOPE, type ActorScope } from "@/shared/actorScope";
import { verifyJwt } from "@/lib/jwt";

export interface AuthenticatedActor {
  actorId: string;
  actorScope: ActorScope;
  tenantId?: string;
  roles: string[];
}

export interface AuthProvider {
  /**
   * Validate a token/session and return authenticated actor.
   * Returns null if invalid/expired.
   *
   * @stub This is a STUB implementation for LOT 1.2.
   *       Will be replaced with real JWT/session in EPIC5.
   */
  validateAuth(token: string): Promise<AuthenticatedActor | null>;
}

/**
 * STUB AUTH PROVIDER - LOT 1.2
 *
 * TO BE REPLACED IN EPIC5 with real session/JWT implementation.
 *
 * This stub uses a fixed in-memory map for testing.
 * DO NOT use in production.
 */
export class StubAuthProvider implements AuthProvider {
  private readonly validTokens = new Map<string, AuthenticatedActor>();

  constructor() {
    // Predefined test tokens for development/testing
    // Format: "stub-{scope}-{id}"
    this.validTokens.set("stub-platform-super1", {
      actorId: "platform-super-1",
      actorScope: ACTOR_SCOPE.PLATFORM,
      roles: ["SUPERADMIN"],
    });

    this.validTokens.set("stub-tenant-admin1", {
      actorId: "tenant-admin-1",
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: "11111111-1111-4111-8111-111111111111",
      roles: ["TENANT_ADMIN"],
    });
  }

  async validateAuth(token: string): Promise<AuthenticatedActor | null> {
    // Try JWT validation first (real auth from login)
    try {
      const payload = verifyJwt(token);
      return {
        actorId: payload.userId,
        actorScope: payload.scope as ActorScope,
        tenantId: payload.tenantId || undefined,
        roles: [payload.role],
      };
    } catch {
      // JWT validation failed, fallback to stub tokens (for tests)
      const actor = this.validTokens.get(token);
      if (actor) {
        return actor;
      }
    }

    return null;
  }

  /**
   * FOR TESTING ONLY: Register a temporary token
   */
  registerTestToken(token: string, actor: AuthenticatedActor): void {
    this.validTokens.set(token, actor);
  }
}

// Singleton instance for LOT 1.2
export const stubAuthProvider = new StubAuthProvider();
