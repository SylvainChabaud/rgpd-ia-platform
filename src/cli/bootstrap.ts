import { Command } from "commander";
import { runMigrations } from "@/infrastructure/db/migrate";
import { PgBootstrapStateRepo } from "@/infrastructure/repositories/PgBootstrapStateRepo";
import { PgPlatformUserRepo } from "@/infrastructure/repositories/PgPlatformUserRepo";
import { PgTenantRepo } from "@/infrastructure/repositories/PgTenantRepo";
import { PgTenantUserRepo } from "@/infrastructure/repositories/PgTenantUserRepo";
import { PgAuditEventWriter } from "@/infrastructure/audit/PgAuditEventWriter";
import { Sha256PasswordHasher } from "@/infrastructure/security/Sha256PasswordHasher";
import { env } from "@/infrastructure/config/env";
import { CreatePlatformSuperAdminUseCase } from "@/app/usecases/bootstrap/CreatePlatformSuperAdminUseCase";
import { CreateTenantUseCase } from "@/app/usecases/bootstrap/CreateTenantUseCase";
import { CreateTenantAdminUseCase } from "@/app/usecases/bootstrap/CreateTenantAdminUseCase";
import { GetBootstrapStatusUseCase } from "@/app/usecases/bootstrap/GetBootstrapStatusUseCase";
import { logInfo } from "@/shared/logger";
import { platformContext, systemContext } from "@/app/context/RequestContext";

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
    logInfo({ event: "db.migrations.completed", actorScope: "SYSTEM" });
  });

program
  .command("status")
  .description("Show bootstrap status")
  .action(async () => {
    await runMigrations();
    const state = new PgBootstrapStateRepo();
    const uc = new GetBootstrapStatusUseCase(state);
    const res = await uc.execute();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(res));
  });

program
  .command("superadmin")
  .requiredOption("--email <email>")
  .requiredOption("--displayName <name>")
  .requiredOption("--password <password>")
  .description("Create the platform superadmin (non-replayable)")
  .action(async (opts) => {
    await runMigrations();
    const state = new PgBootstrapStateRepo();
    const users = new PgPlatformUserRepo();
    const hasher = new Sha256PasswordHasher();
    const audit = new PgAuditEventWriter();
    const uc = new CreatePlatformSuperAdminUseCase(state, users, hasher, audit);
    const res = await uc.execute(opts);
    // eslint-disable-next-line no-console
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
    const uc = new CreateTenantUseCase(tenants, audit);
    const ctx = resolveBootstrapContext(opts.platformActorId);
    const res = await uc.execute(ctx, opts);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(res));
  });

program
  .command("tenant-admin")
  .requiredOption("--tenantSlug <slug>")
  .requiredOption("--email <email>")
  .requiredOption("--displayName <name>")
  .requiredOption("--password <password>")
  .option("--platformActorId <id>")
  .description(
    "Create a tenant admin (requires PLATFORM context or SYSTEM in bootstrap mode)"
  )
  .action(async (opts) => {
    await runMigrations();
    const tenants = new PgTenantRepo();
    const tenantUsers = new PgTenantUserRepo();
    const hasher = new Sha256PasswordHasher();
    const audit = new PgAuditEventWriter();
    const uc = new CreateTenantAdminUseCase(
      tenants,
      tenantUsers,
      hasher,
      audit
    );
    const ctx = resolveBootstrapContext(opts.platformActorId);
    const res = await uc.execute(ctx, opts);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(res));
  });

program.parseAsync(process.argv);
