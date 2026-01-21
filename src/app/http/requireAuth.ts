import { UnauthorizedError } from "@/shared/errors";
import { toErrorResponse } from "@/app/http/errorResponse";
import { stubAuthProvider } from "@/app/auth/stubAuthProvider";
import type { AuthenticatedActor } from "@/app/auth/stubAuthProvider";
import { AUTH_COOKIES, AUTH_ERROR_MESSAGES } from "@/shared/auth/constants";

type AuthenticatedHandler = (args: {
  request: Request;
  actor: AuthenticatedActor;
}) => Promise<Response> | Response;

/**
 * Extract auth token from request
 *
 * Priority:
 * 1. httpOnly cookie (AUTH_COOKIES.ACCESS_TOKEN) - XSS-safe, preferred
 * 2. Authorization: Bearer <token> - API clients, backwards compatibility
 */
function extractToken(request: Request): string | null {
  // 1. Try httpOnly cookie first (preferred - XSS-safe)
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const accessToken = cookies[AUTH_COOKIES.ACCESS_TOKEN];
    if (accessToken) {
      return accessToken;
    }
  }

  // 2. Fallback to Authorization header (API clients, backwards compatibility)
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    return match?.[1] ?? null;
  }

  return null;
}

/**
 * Parse cookies from Cookie header
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) {
      cookies[name] = rest.join("=");
    }
  });
  return cookies;
}

/**
 * requireAuth middleware - Enforce authentication
 *
 * SECURITY:
 * - Reads JWT from httpOnly cookie (primary) or Authorization header (fallback)
 * - Cookie-based auth prevents XSS token theft
 * - Header fallback maintained for API clients
 *
 * Rejects anonymous requests with 401.
 * Passes authenticated actor to handler.
 */
export function requireAuth(handler: AuthenticatedHandler) {
  return async (request: Request): Promise<Response> => {
    try {
      const token = extractToken(request);
      if (!token) {
        throw new UnauthorizedError(AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      }

      const actor = await stubAuthProvider.validateAuth(token);
      if (!actor) {
        throw new UnauthorizedError(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
      }

      // IMPORTANT: No logging of token value (RGPD-safe)

      return await handler(Object.freeze({ request, actor }));
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
