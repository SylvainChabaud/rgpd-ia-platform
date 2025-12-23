import { UnauthorizedError } from "@/shared/errors";
import { toErrorResponse } from "@/app/http/errorResponse";
import { stubAuthProvider } from "@/app/auth/stubAuthProvider";
import type { AuthenticatedActor } from "@/app/auth/stubAuthProvider";

type AuthenticatedHandler = (args: {
  request: Request;
  actor: AuthenticatedActor;
}) => Promise<Response> | Response;

/**
 * Extract auth token from request
 * Supports: Authorization: Bearer <token>
 */
function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  return match?.[1] ?? null;
}

/**
 * requireAuth middleware - Enforce authentication
 *
 * Rejects anonymous requests with 401.
 * Passes authenticated actor to handler.
 */
export function requireAuth(handler: AuthenticatedHandler) {
  return async (request: Request): Promise<Response> => {
    try {
      const token = extractToken(request);
      if (!token) {
        throw new UnauthorizedError("Authentication required");
      }

      const actor = await stubAuthProvider.validateAuth(token);
      if (!actor) {
        throw new UnauthorizedError("Invalid or expired token");
      }

      // IMPORTANT: No logging of token value (RGPD-safe)

      return await handler(Object.freeze({ request, actor }));
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
