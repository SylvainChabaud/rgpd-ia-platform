import { ACTOR_SCOPE, type ActorScope } from "@/shared/actorScope";
import { InvalidTenantError } from "@/shared/errors";

export type RequestContext = Readonly<{
  actorScope: ActorScope;
  actorId?: string;
  tenantId?: string;
  bootstrapMode?: boolean;
}>;

function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

export function assertTenantContext(
  ctx: RequestContext
): asserts ctx is RequestContext & { tenantId: string } {
  if (ctx.actorScope === ACTOR_SCOPE.TENANT && !ctx.tenantId) {
    throw new InvalidTenantError("Tenant context requires tenantId");
  }
}

export const systemContext = (
  options?: Readonly<{ bootstrapMode?: boolean }>
): RequestContext =>
  freeze({
    actorScope: ACTOR_SCOPE.SYSTEM,
    bootstrapMode: options?.bootstrapMode === true,
  });

export const platformContext = (actorId: string): RequestContext =>
  freeze({
    actorScope: ACTOR_SCOPE.PLATFORM,
    actorId,
  });

export const tenantContext = (
  tenantId: string,
  actorId?: string
): RequestContext =>
  freeze({
    actorScope: ACTOR_SCOPE.TENANT,
    tenantId,
    actorId,
  });
