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
import { GetBootstrapStatusUseCase } from "@/app/usecases/bootstrap/GetBootstrapStatusUseCase";
import { logInfo } from "@/shared/logger";
import { platformContext, systemContext } from "@/app/context/RequestContext";
import { ACTOR_SCOPE } from "@/shared/actorScope";
import { policyEngine } from "@/app/auth/policyEngine";

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
     
    console.log(JSON.stringify(res));
  });

program
  .command("superadmin")
  .requiredOption("--email <email>")
  .requiredOption("--displayName <name>")
  .option("--password <password>", "Password for development (optional)")
  .description("Create the platform superadmin (non-replayable)")
  .action(async (opts) => {
    await runMigrations();
    const state = new PgBootstrapStateRepo();
    const users = new PgPlatformUserRepo();
    const audit = new PgAuditEventWriter();
    const uc = new CreatePlatformSuperAdminUseCase(state, users, audit);
    const res = await uc.execute(opts);
     
    console.log(JSON.stringify(res));
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
     
    console.log(JSON.stringify(res));
  });

program
  .command("tenant-admin")
  .requiredOption("--tenantSlug <slug>")
  .requiredOption("--email <email>")
  .requiredOption("--displayName <name>")
  .option("--password <password>", "Password for development (optional)")
  .option("--platformActorId <id>")
  .description(
    "Create a tenant admin (requires PLATFORM context or SYSTEM in bootstrap mode)"
  )
  .action(async (opts) => {
    await runMigrations();
    const tenants = new PgTenantRepo();
    const tenantUsers = new PgTenantUserRepo();
    const audit = new PgAuditEventWriter();
    const uc = new CreateTenantAdminUseCase(
      tenants,
      tenantUsers,
      audit,
      policyEngine
    );
    const ctx = resolveBootstrapContext(opts.platformActorId);
    const res = await uc.execute(ctx, opts);

    console.log(JSON.stringify(res));
  });

program
  .command("tenant-user")
  .requiredOption("--tenantSlug <slug>")
  .requiredOption("--email <email>")
  .requiredOption("--displayName <name>")
  .option("--password <password>", "Password for development (optional)")
  .option("--platformActorId <id>")
  .description(
    "Create a tenant user (requires PLATFORM context or SYSTEM in bootstrap mode)"
  )
  .action(async (opts) => {
    await runMigrations();
    const tenants = new PgTenantRepo();
    const tenantUsers = new PgTenantUserRepo();
    const audit = new PgAuditEventWriter();
    const uc = new CreateTenantUserUseCase(
      tenants,
      tenantUsers,
      audit,
      policyEngine
    );
    const ctx = resolveBootstrapContext(opts.platformActorId);
    const res = await uc.execute(ctx, opts);

    console.log(JSON.stringify(res));
  });

program.parseAsync(process.argv);
