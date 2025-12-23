import { InvalidTenantError, UnauthorizedError } from "@/shared/errors";
import { toErrorResponse } from "@/app/http/errorResponse";

type GuardedHandler = (args: {
  request: Request;
  tenantId: string;
}) => Promise<Response> | Response;

const TENANT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readTenantId(request: Request): string {
  const raw = request.headers.get("x-tenant-id");
  if (!raw) {
    throw new UnauthorizedError("Tenant header required");
  }
  const tenantId = raw.trim();
  if (!tenantId) {
    throw new UnauthorizedError("Tenant header required");
  }
  if (!TENANT_ID_PATTERN.test(tenantId)) {
    throw new InvalidTenantError("Invalid tenant id");
  }
  return tenantId;
}

export function tenantGuard(handler: GuardedHandler) {
  return async (request: Request): Promise<Response> => {
    try {
      const tenantId = readTenantId(request);
      return await handler(Object.freeze({ request, tenantId }));
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
