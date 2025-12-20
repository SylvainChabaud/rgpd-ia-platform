import { CreatePlatformSuperAdminUseCase } from "../src/app/usecases/bootstrap/CreatePlatformSuperAdminUseCase";

import type { BootstrapStateRepo } from "../src/app/ports/BootstrapStateRepo";
import type { PlatformUserRepo } from "../src/app/ports/PlatformUserRepo";
import type { PasswordHasher } from "../src/app/ports/PasswordHasher";
import type { AuditEventWriter, AuditEvent } from "../src/app/ports/AuditEventWriter";

// --------------------------------------------------
// Stubs mémoire STRICTEMENT typés
// --------------------------------------------------

class MemBootstrapState implements BootstrapStateRepo {
  private boot = false;

  async isBootstrapped(): Promise<boolean> {
    return this.boot;
  }

  async markBootstrapped(): Promise<void> {
    this.boot = true;
  }
}

class MemPlatformUsers implements PlatformUserRepo {
  private exists = false;

  async existsSuperAdmin(): Promise<boolean> {
    return this.exists;
  }

  async createSuperAdmin(_input: {
    id: string;
    emailHash: string;
    displayName: string;
    passwordHash: string;
  }): Promise<void> {
    this.exists = true;
  }
}

class MemHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hash:${password.length}`;
  }
}

class MemAuditWriter implements AuditEventWriter {
  readonly events: AuditEvent[] = [];

  async write(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

// --------------------------------------------------
// TEST
// --------------------------------------------------

test("bootstrap superadmin is non-replayable", async () => {
  const state = new MemBootstrapState();
  const users = new MemPlatformUsers();
  const hasher = new MemHasher();
  const audit = new MemAuditWriter();

  const uc = new CreatePlatformSuperAdminUseCase(
    state,
    users,
    hasher,
    audit
  );

  const res1 = await uc.execute({
    email: "admin@example.com",
    displayName: "Admin",
    password: "123456789012",
  });

  expect(res1.platformUserId).toBeTruthy();
  expect(audit.events).toHaveLength(1);

  const evt = audit.events[0];
  expect(evt.eventName).toBe("platform.superadmin.created");
  expect(evt.actorScope).toBe("SYSTEM");

  await expect(
    uc.execute({
      email: "admin2@example.com",
      displayName: "Admin2",
      password: "123456789012",
    })
  ).rejects.toThrow();
});
