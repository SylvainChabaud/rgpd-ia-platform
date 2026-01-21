import { Command } from "commander";
import { runMigrations } from "@/infrastructure/db/migrate";
import { PgBootstrapStateRepo } from "@/infrastructure/repositories/PgBootstrapStateRepo";
import { PgPlatformUserRepo } from "@/infrastructure/repositories/PgPlatformUserRepo";
import { PgTenantRepo } from "@/infrastructure/repositories/PgTenantRepo";
import { PgTenantUserRepo } from "@/infrastructure/repositories/PgTenantUserRepo";
import { PgAuditEventWriter } from "@/infrastructure/audit/PgAuditEventWriter";
import { env } from "@/infrastructure/config/env";
import { CreatePlatformSuperAdminUseCase } from "@/app/usecases/bootstrap/CreatePlatformSuperAdminUseCase";
import { CreateTenantUseCase } from "@/app/usecases/bootstrap/CreateTenantUseCase";
import { CreateTenantAdminUseCase } from "@/app/usecases/bootstrap/CreateTenantAdminUseCase";
import { CreateTenantUserUseCase } from "@/app/usecases/bootstrap/CreateTenantUserUseCase";
import { CreateTenantDpoUseCase } from "@/app/usecases/bootstrap/CreateTenantDpoUseCase";
import { GetBootstrapStatusUseCase } from "@/app/usecases/bootstrap/GetBootstrapStatusUseCase";
import { logInfo } from "@/shared/logger";
import { platformContext, systemContext } from "@/app/context/RequestContext";
import { ACTOR_SCOPE } from "@/shared/actorScope";
import { policyEngine } from "@/app/auth/policyEngine";
import { BcryptPasswordHasher } from "@/infrastructure/security/BcryptPasswordHasher";

const program = new Command();

const resolveBootstrapContext = (platformActorId?: string) => {
  if (env.BOOTSTRAP_MODE) {
    return systemContext({ bootstrapMode: true });
  }
  if (!platformActorId) {
    throw new Error(
      "platformActorId is required when BOOTSTRAP_MODE is disabled"
    );
  }
  return platformContext(platformActorId);
};

program.name("bootstrap").description("Platform bootstrap (CLI only)");

program
  .command("migrate")
  .description("Run SQL migrations")
  .action(async () => {
    await runMigrations();
    logInfo({ event: "db.migrations.completed", actorScope: ACTOR_SCOPE.SYSTEM });
  });

program
  .command("status")
  .description("Show bootstrap status")
  .action(async () => {
    await runMigrations();
    const state = new PgBootstrapStateRepo();
    const uc = new GetBootstrapStatusUseCase(state);
    const res = await uc.execute();
    // RGPD-safe: status contains only P1 data (booleans)
    logInfo({ event: "bootstrap.status", actorScope: ACTOR_SCOPE.SYSTEM, meta: { bootstrapped: res.bootstrapped } });
  });

program
  .command("superadmin")
  .requiredOption("--email <email>")
  .requiredOption("--displayName <name>")
  .description("Create the platform superadmin (non-replayable). Set BOOTSTRAP_PASSWORD env var for password.")
  .action(async (opts) => {
    await runMigrations();
    const state = new PgBootstrapStateRepo();
    const users = new PgPlatformUserRepo();
    const audit = new PgAuditEventWriter();
    const passwordHasher = new BcryptPasswordHasher();
    const uc = new CreatePlatformSuperAdminUseCase(state, users, audit, passwordHasher);
    // SECURITY: Read password from env var, never from CLI args (shell history exposure)
    const password = process.env.BOOTSTRAP_PASSWORD;
    const res = await uc.execute({ ...opts, password });
    // RGPD-safe: log only P1 data (userId), never P2 (displayName, email)
    logInfo({ event: "bootstrap.superadmin.created", actorScope: ACTOR_SCOPE.SYSTEM, meta: { userId: res.platformUserId } });
  });

program
  .command("tenant")
  .requiredOption("--name <name>")
  .requiredOption("--slug <slug>")
  .option("--platformActorId <id>")
  .description(
    "Create a tenant (requires PLATFORM context or SYSTEM in bootstrap mode)"
  )
  .action(async (opts) => {
    await runMigrations();
    const tenants = new PgTenantRepo();
    const audit = new PgAuditEventWriter();
    const uc = new CreateTenantUseCase(tenants, audit, policyEngine);
    const ctx = resolveBootstrapContext(opts.platformActorId);
    const res = await uc.execute(ctx, opts);
    // RGPD-safe: log only P1 data (tenantId), never P2 (name)
    logInfo({ event: "bootstrap.tenant.created", actorScope: ACTOR_SCOPE.SYSTEM, meta: { tenantId: res.tenantId } });
  });

program
  .command("tenant-admin")
  .requiredOption("--tenantSlug <slug>")
  .requiredOption("--email <email>")
  .requiredOption("--displayName <name>")
  .option("--platformActorId <id>")
  .description(
    "Create a tenant admin (requires PLATFORM context or SYSTEM in bootstrap mode). Set BOOTSTRAP_PASSWORD env var for password."
  )
  .action(async (opts) => {
    await runMigrations();
    const tenants = new PgTenantRepo();
    const tenantUsers = new PgTenantUserRepo();
    const audit = new PgAuditEventWriter();
    const passwordHasher = new BcryptPasswordHasher();
    const uc = new CreateTenantAdminUseCase(
      tenants,
      tenantUsers,
      audit,
      policyEngine,
      passwordHasher
    );
    const ctx = resolveBootstrapContext(opts.platformActorId);
    // SECURITY: Read password from env var, never from CLI args (shell history exposure)
    const password = process.env.BOOTSTRAP_PASSWORD;
    const res = await uc.execute(ctx, { ...opts, password });
    // RGPD-safe: log only P1 data (userId, tenantId), never P2 (displayName, email)
    logInfo({ event: "bootstrap.tenant-admin.created", actorScope: ACTOR_SCOPE.SYSTEM, meta: { userId: res.tenantAdminId, tenantId: res.tenantId } });
  });

program
  .command("tenant-user")
  .requiredOption("--tenantSlug <slug>")
  .requiredOption("--email <email>")
  .requiredOption("--displayName <name>")
  .option("--platformActorId <id>")
  .description(
    "Create a tenant user (requires PLATFORM context or SYSTEM in bootstrap mode). Set BOOTSTRAP_PASSWORD env var for password."
  )
  .action(async (opts) => {
    await runMigrations();
    const tenants = new PgTenantRepo();
    const tenantUsers = new PgTenantUserRepo();
    const audit = new PgAuditEventWriter();
    const passwordHasher = new BcryptPasswordHasher();
    const uc = new CreateTenantUserUseCase(
      tenants,
      tenantUsers,
      audit,
      policyEngine,
      passwordHasher
    );
    const ctx = resolveBootstrapContext(opts.platformActorId);
    // SECURITY: Read password from env var, never from CLI args (shell history exposure)
    const password = process.env.BOOTSTRAP_PASSWORD;
    const res = await uc.execute(ctx, { ...opts, password });
    // RGPD-safe: log only P1 data (userId, tenantId), never P2 (displayName, email)
    logInfo({ event: "bootstrap.tenant-user.created", actorScope: ACTOR_SCOPE.SYSTEM, meta: { userId: res.tenantUserId, tenantId: res.tenantId } });
  });

program
  .command("tenant-dpo")
  .requiredOption("--tenantSlug <slug>")
  .requiredOption("--email <email>")
  .requiredOption("--displayName <name>")
  .option("--platformActorId <id>")
  .description(
    "Create a tenant DPO - LOT 12.4 (requires PLATFORM context or SYSTEM in bootstrap mode). Set BOOTSTRAP_PASSWORD env var for password."
  )
  .action(async (opts) => {
    await runMigrations();
    const tenants = new PgTenantRepo();
    const tenantUsers = new PgTenantUserRepo();
    const audit = new PgAuditEventWriter();
    const passwordHasher = new BcryptPasswordHasher();
    const uc = new CreateTenantDpoUseCase(
      tenants,
      tenantUsers,
      audit,
      policyEngine,
      passwordHasher
    );
    const ctx = resolveBootstrapContext(opts.platformActorId);
    // SECURITY: Read password from env var, never from CLI args (shell history exposure)
    const password = process.env.BOOTSTRAP_PASSWORD;
    const res = await uc.execute(ctx, { ...opts, password });
    // RGPD-safe: log only P1 data (userId, tenantId), never P2 (displayName, email)
    logInfo({ event: "bootstrap.tenant-dpo.created", actorScope: ACTOR_SCOPE.SYSTEM, meta: { userId: res.tenantDpoId, tenantId: res.tenantId } });
  });

program.parseAsync(process.argv);
