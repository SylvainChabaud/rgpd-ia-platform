import { AssertTenantScopeUseCase } from "@/app/usecases/tenant/AssertTenantScopeUseCase";
import { platformContext, systemContext, tenantContext } from "@/app/context/RequestContext";
import { ForbiddenError, InvalidTenantError } from "@/shared/errors";

test("tenant-scoped use case rejects missing tenant id", async () => {
  const uc = new AssertTenantScopeUseCase();
  const ctx = { actorScope: "TENANT" } as const;

  await expect(uc.execute(ctx, "tenant-1")).rejects.toBeInstanceOf(
    InvalidTenantError
  );
});

test("tenant-scoped use case rejects incompatible actor scope", async () => {
  const uc = new AssertTenantScopeUseCase();

  await expect(
    uc.execute(platformContext("platform-1"), "tenant-1")
  ).rejects.toBeInstanceOf(ForbiddenError);

  await expect(
    uc.execute(systemContext(), "tenant-1")
  ).rejects.toBeInstanceOf(ForbiddenError);
});

test("tenant-scoped use case rejects cross-tenant access", async () => {
  const uc = new AssertTenantScopeUseCase();
  const ctx = tenantContext("tenant-1", "actor-1");

  await expect(uc.execute(ctx, "tenant-2")).rejects.toBeInstanceOf(
    InvalidTenantError
  );
});
