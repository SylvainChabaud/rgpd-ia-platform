import { CreatePlatformSuperAdminUseCase } from "@/app/usecases/bootstrap/CreatePlatformSuperAdminUseCase";
import { CreateTenantUseCase } from "@/app/usecases/bootstrap/CreateTenantUseCase";
import { CreateTenantAdminUseCase } from "@/app/usecases/bootstrap/CreateTenantAdminUseCase";
import { systemContext } from "@/app/context/RequestContext";
import { logEvent } from "@/shared/logger";
import { withLogCapture } from "@/testing/logCapture";
import {
  MemAuditWriter,
  MemBootstrapState,
  MemPlatformUsers,
  MemTenantRepo,
  MemTenantUserRepo,
} from "./helpers/memoryRepos";

const forbiddenPatterns = [
  /@/i,
  /token/i,
  /password/i,
  /prompt/i,
  /content/i,
  /payload/i,
  /body/i,
  /input/i,
  /output/i,
  /message/i,
  /text/i,
  /document/i,
];

function expectLogsSafe(logs: Array<{ entry: unknown }>) {
  for (const log of logs) {
    const dump = JSON.stringify(log.entry);
    for (const pattern of forbiddenPatterns) {
      expect(dump).not.toMatch(pattern);
    }
  }
}

test("bootstrap flow logs are event-only and contain no sensitive data", async () => {
  const state = new MemBootstrapState();
  const platformUsers = new MemPlatformUsers();
  const tenants = new MemTenantRepo();
  const tenantUsers = new MemTenantUserRepo();
  const audit = new MemAuditWriter();

  const createSuperAdmin = new CreatePlatformSuperAdminUseCase(
    state,
    platformUsers,
    audit
  );
  const createTenant = new CreateTenantUseCase(tenants, audit);
  const createTenantAdmin = new CreateTenantAdminUseCase(
    tenants,
    tenantUsers,
    audit
  );

  const { logs } = await withLogCapture(async () => {
    await createSuperAdmin.execute({
      email: "admin@example.com",
      displayName: "Admin",
    });

    const ctx = systemContext({ bootstrapMode: true });
    await createTenant.execute(ctx, { name: "Tenant A", slug: "tenant-a" });
    await createTenantAdmin.execute(ctx, {
      tenantSlug: "tenant-a",
      email: "admin@tenant.test",
      displayName: "Tenant Admin",
    });
  });

  expect(logs.length).toBeGreaterThan(0);
  expectLogsSafe(logs);
});

test("logger rejects nested meta objects", () => {
  const unsafeMeta = { nested: { value: "nope" } } as unknown as Record<
    string,
    string
  >;
  expect(() => logEvent("test.event", unsafeMeta)).toThrow();
});
