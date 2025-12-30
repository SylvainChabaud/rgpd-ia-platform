/**
 * app.http.handlers.test.ts — HTTP handler tests
 *
 * Coverage target: All branches for HTTP error handling and guards
 *
 * RGPD Compliance:
 * - Error responses don't leak sensitive data
 * - Tenant guard enforcement
 */

import { toErrorResponse } from "@/app/http/errorResponse";
import { requirePermission } from "@/app/http/requirePermission";
import { tenantGuard } from "@/app/http/tenantGuard";
import {
  AppError,
  ForbiddenError,
  UnauthorizedError,
  InvalidTenantError,
} from "@/shared/errors";

describe("toErrorResponse", () => {
  it("converts AppError to JSON response with correct status", async () => {
    const error = new AppError("Test error", "TEST_CODE", 422);
    const response = toErrorResponse(error);

    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error).toBe("TEST_CODE");
  });

  it("converts ForbiddenError to 403 response", async () => {
    const error = new ForbiddenError("Access denied");
    const response = toErrorResponse(error);

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe("FORBIDDEN");
  });

  it("converts UnauthorizedError to 401 response", async () => {
    const error = new UnauthorizedError("Not logged in");
    const response = toErrorResponse(error);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("converts InvalidTenantError to 400 response", async () => {
    const error = new InvalidTenantError("Bad tenant");
    const response = toErrorResponse(error);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("INVALID_TENANT");
  });

  it("converts unknown error to 500 INTERNAL_ERROR", async () => {
    const error = new Error("Unknown error");
    const response = toErrorResponse(error);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("INTERNAL_ERROR");
  });

  it("converts string error to 500 INTERNAL_ERROR", async () => {
    const response = toErrorResponse("string error");

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("INTERNAL_ERROR");
  });

  it("converts null error to 500 INTERNAL_ERROR", async () => {
    const response = toErrorResponse(null);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});

describe("Tenant Guard", () => {
  const validTenantId = "550e8400-e29b-41d4-a716-446655440000";

  it("extracts valid tenant from X-Tenant-Id header", async () => {
    const handler = tenantGuard(async ({ tenantId }) => {
      return new Response(JSON.stringify({ tenantId }), { status: 200 });
    });

    const request = new Request("http://localhost/api/test", {
      method: "GET",
      headers: {
        "X-Tenant-Id": validTenantId,
      },
    });

    const response = await handler(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tenantId).toBe(validTenantId);
  });

  it("rejects request without tenant header", async () => {
    const handler = tenantGuard(async () => new Response("OK"));

    const request = new Request("http://localhost/api/test", {
      method: "GET",
    });

    const response = await handler(request);

    // Returns UnauthorizedError -> 401
    expect(response.status).toBe(401);
  });

  it("rejects request with empty tenant header", async () => {
    const handler = tenantGuard(async () => new Response("OK"));

    const request = new Request("http://localhost/api/test", {
      method: "GET",
      headers: {
        "X-Tenant-Id": "   ",
      },
    });

    const response = await handler(request);

    // Returns UnauthorizedError -> 401
    expect(response.status).toBe(401);
  });

  it("rejects request with invalid tenant id format", async () => {
    const handler = tenantGuard(async () => new Response("OK"));

    const request = new Request("http://localhost/api/test", {
      method: "GET",
      headers: {
        "X-Tenant-Id": "invalid-not-uuid",
      },
    });

    const response = await handler(request);

    // Returns InvalidTenantError -> 400
    expect(response.status).toBe(400);
  });

  it("accepts valid UUID v1", async () => {
    const handler = tenantGuard(async ({ tenantId }) => {
      return new Response(JSON.stringify({ tenantId }), { status: 200 });
    });

    const request = new Request("http://localhost/api/test", {
      method: "GET",
      headers: {
        "X-Tenant-Id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      },
    });

    const response = await handler(request);
    expect(response.status).toBe(200);
  });

  it("accepts valid UUID v4", async () => {
    const handler = tenantGuard(async ({ tenantId }) => {
      return new Response(JSON.stringify({ tenantId }), { status: 200 });
    });

    const request = new Request("http://localhost/api/test", {
      method: "GET",
      headers: {
        "X-Tenant-Id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      },
    });

    const response = await handler(request);
    expect(response.status).toBe(200);
  });
});

describe("requirePermission", () => {
  it("returns a function that wraps handler", () => {
    const withPermission = requirePermission("tenant:read");

    expect(typeof withPermission).toBe("function");

    const handler = withPermission(async () => new Response("OK"));
    expect(typeof handler).toBe("function");
  });

  it("accepts resource extractor parameter", () => {
    const withPermission = requirePermission(
      "tenant:read",
      (request) => ({ tenantId: request.headers.get("X-Tenant-Id") ?? undefined })
    );

    expect(typeof withPermission).toBe("function");
  });
});
