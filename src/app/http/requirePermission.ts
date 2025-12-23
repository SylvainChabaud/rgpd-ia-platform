import { ForbiddenError } from "@/shared/errors";
import { toErrorResponse } from "@/app/http/errorResponse";
import { requireAuth } from "@/app/http/requireAuth";
import { policyEngine } from "@/app/auth/policyEngine";
import type { Permission } from "@/app/auth/policyEngine";
import type { RequestContext } from "@/app/context/RequestContext";
import type { AuthenticatedActor } from "@/app/auth/stubAuthProvider";

type PermissionGuardedHandler = (args: {
  request: Request;
  actor: AuthenticatedActor;
  ctx: RequestContext;
}) => Promise<Response> | Response;

/**
 * Build RequestContext from authenticated actor
 */
function buildContext(actor: AuthenticatedActor): RequestContext {
  return Object.freeze({
    actorScope: actor.actorScope,
    actorId: actor.actorId,
    tenantId: actor.tenantId,
    bootstrapMode: false, // HTTP requests never in bootstrap mode
  });
}

/**
 * requirePermission middleware - Enforce authorization
 *
 * Combines requireAuth + policy check.
 * Rejects requests without required permission with 403.
 */
export function requirePermission(
  permission: Permission,
  extractResource?: (request: Request) => { tenantId?: string } | undefined
): (
  handler: PermissionGuardedHandler
) => (request: Request) => Promise<Response> {
  return (handler: PermissionGuardedHandler) => {
    return requireAuth(async ({ request, actor }) => {
      try {
        const ctx = buildContext(actor);
        const resource = extractResource?.(request);

        const decision = await policyEngine.check(ctx, permission, resource);

        if (!decision.allowed) {
          throw new ForbiddenError(decision.reason ?? "Permission denied");
        }

        return await handler(Object.freeze({ request, actor, ctx }));
      } catch (error) {
        return toErrorResponse(error);
      }
    });
  };
}
