import { CreatePlatformSuperAdminUseCase } from "@/app/usecases/bootstrap/CreatePlatformSuperAdminUseCase";
import { CreateTenantUseCase } from "@/app/usecases/bootstrap/CreateTenantUseCase";
import { CreateTenantAdminUseCase } from "@/app/usecases/bootstrap/CreateTenantAdminUseCase";
import {
  BootstrapAlreadyCompletedError,
  ConflictError,
  ForbiddenError,
  InvalidTenantError,
} from "@/shared/errors";
import { platformContext, systemContext } from "@/app/context/RequestContext";
import {
  MemAuditWriter,
  MemBootstrapState,
  MemPlatformUsers,
  MemTenantRepo,
  MemTenantUserRepo,
} from "./helpers/memoryRepos";

test("bootstrap superadmin is non-replayable", async () => {
  const state = new MemBootstrapState();
  const users = new MemPlatformUsers();
  const audit = new MemAuditWriter();

  const uc = new CreatePlatformSuperAdminUseCase(state, users, audit);

  const res1 = await uc.execute({
    email: "admin@example.com",
    displayName: "Admin",
  });

  expect(res1.platformUserId).toBeTruthy();
  expect(audit.events).toHaveLength(1);

  await expect(
    uc.execute({
      email: "admin2@example.com",
      displayName: "Admin2",
    })
  ).rejects.toBeInstanceOf(BootstrapAlreadyCompletedError);
});

test("tenant creation requires platform or bootstrap system", async () => {
  const tenants = new MemTenantRepo();
  const audit = new MemAuditWriter();
  const uc = new CreateTenantUseCase(tenants, audit);

  await expect(
    uc.execute(systemContext(), { name: "Tenant A", slug: "tenant-a" })
  ).rejects.toBeInstanceOf(ForbiddenError);

  const res = await uc.execute(systemContext({ bootstrapMode: true }), {
    name: "Tenant A",
    slug: "tenant-a",
  });

  expect(res.tenantId).toBeTruthy();
});

test("tenant slug duplicate is rejected", async () => {
  const tenants = new MemTenantRepo();
  const audit = new MemAuditWriter();
  const uc = new CreateTenantUseCase(tenants, audit);

  await uc.execute(platformContext("platform-1"), {
    name: "Tenant A",
    slug: "tenant-a",
  });

  await expect(
    uc.execute(platformContext("platform-1"), {
      name: "Tenant B",
      slug: "tenant-a",
    })
  ).rejects.toBeInstanceOf(ConflictError);
});

test("tenant admin requires existing tenant and correct scope", async () => {
  const tenants = new MemTenantRepo();
  const tenantUsers = new MemTenantUserRepo();
  const audit = new MemAuditWriter();
  const uc = new CreateTenantAdminUseCase(tenants, tenantUsers, audit);
  const tenantUc = new CreateTenantUseCase(tenants, audit);

  await expect(
    uc.execute(systemContext({ bootstrapMode: true }), {
      tenantSlug: "missing-tenant",
      email: "admin@tenant.test",
      displayName: "Tenant Admin",
    })
  ).rejects.toBeInstanceOf(InvalidTenantError);

  await tenantUc.execute(systemContext({ bootstrapMode: true }), {
    name: "Tenant A",
    slug: "tenant-a",
  });

  const res = await uc.execute(systemContext({ bootstrapMode: true }), {
    tenantSlug: "tenant-a",
    email: "seed@tenant.test",
    displayName: "Seed Admin",
  });

  expect(res.tenantAdminId).toBeTruthy();

  await expect(
    uc.execute(systemContext(), {
      tenantSlug: "tenant-a",
      email: "admin@tenant.test",
      displayName: "Tenant Admin",
    })
  ).rejects.toBeInstanceOf(ForbiddenError);
});
