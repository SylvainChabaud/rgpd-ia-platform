/**
 * BLOCKER test: prove tenant isolation at DB layer
 *
 * This test uses in-memory repos (acceptable for LOT 1.5 if DB not yet setup).
 * For production readiness, this MUST be replaced with real Postgres test
 * using testcontainers or dedicated test DB to prove SQL-level isolation.
 *
 * See BLOCKER 2 in code review report.
 */

import { CreateTenantUseCase } from "@/app/usecases/bootstrap/CreateTenantUseCase";
import { CreateTenantAdminUseCase } from "@/app/usecases/bootstrap/CreateTenantAdminUseCase";
import { AssertTenantScopeUseCase } from "@/app/usecases/tenant/AssertTenantScopeUseCase";
import { platformContext, tenantContext } from "@/app/context/RequestContext";
import { InvalidTenantError } from "@/shared/errors";
import {
  MemAuditWriter,
  MemTenantRepo,
  MemTenantUserRepo,
  MemPasswordHasher,
} from '@tests/helpers/memoryRepos';
import { policyEngine } from "@/app/auth/policyEngine";

test("RGPD BLOCKER: tenant A cannot access tenant B data (use-case level)", async () => {
  const tenants = new MemTenantRepo();
  const tenantUsers = new MemTenantUserRepo();
  const audit = new MemAuditWriter();

  const createTenant = new CreateTenantUseCase(tenants, audit, policyEngine);
  const passwordHasher = new MemPasswordHasher();
  const createTenantAdmin = new CreateTenantAdminUseCase(
    tenants,
    tenantUsers,
    audit,
    policyEngine,
    passwordHasher
  );
  const assertTenantScope = new AssertTenantScopeUseCase();

  // Create tenant A
  const tenantA = await createTenant.execute(platformContext("platform-1"), {
    name: "Tenant A",
    slug: "tenant-a",
  });

  // Create tenant B
  const tenantB = await createTenant.execute(platformContext("platform-1"), {
    name: "Tenant B",
    slug: "tenant-b",
  });

  // Create admin in tenant A
  await createTenantAdmin.execute(platformContext("platform-1"), {
    tenantSlug: "tenant-a",
    email: "admin-a@test.com",
    displayName: "Admin A",
  });

  // Create admin in tenant B
  await createTenantAdmin.execute(platformContext("platform-1"), {
    tenantSlug: "tenant-b",
    email: "admin-b@test.com",
    displayName: "Admin B",
  });

  // Assert: tenant A context cannot access tenant B resources
  const ctxA = tenantContext(tenantA.tenantId, "actor-a");

  await expect(
    assertTenantScope.execute(ctxA, tenantB.tenantId)
  ).rejects.toBeInstanceOf(InvalidTenantError);

  // Assert: tenant B context cannot access tenant A resources
  const ctxB = tenantContext(tenantB.tenantId, "actor-b");

  await expect(
    assertTenantScope.execute(ctxB, tenantA.tenantId)
  ).rejects.toBeInstanceOf(InvalidTenantError);
});

test("RGPD BLOCKER: tenant context can only access own tenant", async () => {
  const tenants = new MemTenantRepo();
  const audit = new MemAuditWriter();
  const assertTenantScope = new AssertTenantScopeUseCase();

  const createTenant = new CreateTenantUseCase(tenants, audit, policyEngine);
  const tenant = await createTenant.execute(platformContext("platform-1"), {
    name: "Tenant X",
    slug: "tenant-x",
  });

  const ctx = tenantContext(tenant.tenantId, "actor-x");

  // Should succeed: accessing own tenant
  await expect(
    assertTenantScope.execute(ctx, tenant.tenantId)
  ).resolves.toBeUndefined();

  // Should fail: accessing different tenant
  await expect(
    assertTenantScope.execute(ctx, "other-tenant-id")
  ).rejects.toBeInstanceOf(InvalidTenantError);
});

// TODO BLOCKER 2: Replace with real Postgres integration test
// Example real test (uncomment when DB setup ready):
/*
import { Pool } from "pg";

test("RGPD BLOCKER: DB-level tenant isolation (Postgres)", async () => {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

  // Setup: create tenants in DB
  const tenantA = await pool.query("INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) RETURNING id", [
    "tenant-a-id",
    "tenant-a",
    "Tenant A"
  ]);

  const tenantB = await pool.query("INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) RETURNING id", [
    "tenant-b-id",
    "tenant-b",
    "Tenant B"
  ]);

  // Insert user in tenant A
  await pool.query("INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role) VALUES ($1, $2, $3, $4, $5, $6, $7)", [
    "user-a",
    tenantA.rows[0].id,
    "hash-a",
    "User A",
    "__DISABLED__",
    "TENANT",
    "TENANT_ADMIN"
  ]);

  // Try to read tenant A user with tenant B context
  const crossTenantRead = await pool.query(
    "SELECT * FROM users WHERE tenant_id = $1 AND id = $2",
    [tenantB.rows[0].id, "user-a"]  // tenant B trying to read user-a
  );

  // Assert: should return 0 rows (tenant isolation)
  expect(crossTenantRead.rowCount).toBe(0);

  await pool.end();
});
*/
