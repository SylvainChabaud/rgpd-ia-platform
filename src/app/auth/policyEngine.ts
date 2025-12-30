import type { RequestContext } from "@/app/context/RequestContext";
import { ACTOR_SCOPE } from "@/shared/actorScope";

/**
 * Permission definition
 */
export type Permission =
  | "tenant:create"
  | "tenant:read"
  | "tenant-admin:create"
  | "tenant:users:read"
  | "tenant:users:write"
  | "platform:manage";

/**
 * Policy decision result
 */
export interface PolicyDecision {
  allowed: boolean;
  reason?: string; // For debugging/audit (no sensitive data)
}

/**
 * Policy Engine - Centralized authorization
 *
 * All permission checks MUST go through this engine.
 * NO hardcoded authorization in handlers/use-cases.
 */
export interface PolicyEngine {
  /**
   * Check if actor in context has permission
   */
  check(
    ctx: RequestContext,
    permission: Permission,
    resource?: { tenantId?: string }
  ): Promise<PolicyDecision>;
}

/**
 * Default Policy Engine - RBAC/ABAC implementation
 */
export class DefaultPolicyEngine implements PolicyEngine {
  async check(
    ctx: RequestContext,
    permission: Permission,
    resource?: { tenantId?: string }
  ): Promise<PolicyDecision> {
    // SYSTEM scope (bootstrap mode only)
    if (ctx.actorScope === ACTOR_SCOPE.SYSTEM) {
      if (ctx.bootstrapMode) {
        if (
          permission === "tenant:create" ||
          permission === "tenant-admin:create"
        ) {
          return { allowed: true, reason: "SYSTEM bootstrap mode" };
        }
      }
      return { allowed: false, reason: "SYSTEM scope requires bootstrap mode" };
    }

    // PLATFORM scope
    if (ctx.actorScope === ACTOR_SCOPE.PLATFORM) {
      if (permission === "platform:manage") {
        return { allowed: true, reason: "PLATFORM scope" };
      }
      if (
        permission === "tenant:create" ||
        permission === "tenant-admin:create"
      ) {
        return { allowed: true, reason: "PLATFORM can create tenants" };
      }
      return { allowed: false, reason: "Permission not granted to PLATFORM" };
    }

    // TENANT scope
    if (ctx.actorScope === ACTOR_SCOPE.TENANT) {
      // Tenant isolation check (ABAC)
      if (resource?.tenantId && resource.tenantId !== ctx.tenantId) {
        return {
          allowed: false,
          reason: "Cross-tenant access denied (tenant isolation)",
        };
      }

      // Tenant-scoped permissions
      if (permission === "tenant:read" || permission === "tenant:users:read") {
        return { allowed: true, reason: "TENANT scope owns resource" };
      }

      if (permission === "tenant:users:write") {
        return { allowed: true, reason: "TENANT_ADMIN role" };
      }

      return { allowed: false, reason: "Permission not granted to TENANT" };
    }

    return { allowed: false, reason: "Unknown actor scope" };
  }
}

// Singleton instance
export const policyEngine = new DefaultPolicyEngine();
