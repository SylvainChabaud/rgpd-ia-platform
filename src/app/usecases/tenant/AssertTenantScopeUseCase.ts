import type { RequestContext } from "@/app/context/RequestContext";
import { ACTOR_SCOPE } from "@/shared/actorScope";
import { assertTenantContext } from "@/app/context/RequestContext";
import { ForbiddenError, InvalidTenantError } from "@/shared/errors";

export class AssertTenantScopeUseCase {
  async execute(ctx: RequestContext, targetTenantId: string): Promise<void> {
    if (ctx.actorScope !== ACTOR_SCOPE.TENANT) {
      throw new ForbiddenError("Tenant scope required");
    }
    assertTenantContext(ctx);
    if (ctx.tenantId !== targetTenantId) {
      throw new InvalidTenantError("Cross-tenant access");
    }
  }
}
