import type { AuditEvent } from "@/app/audit/AuditEvent";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { BootstrapStateRepo } from "@/app/ports/BootstrapStateRepo";
import type { PlatformUserRepo } from "@/app/ports/PlatformUserRepo";
import type { TenantRepo } from "@/app/ports/TenantRepo";
import type { TenantUserRepo } from "@/app/ports/TenantUserRepo";

export class MemBootstrapState implements BootstrapStateRepo {
  private boot = false;

  async isBootstrapped(): Promise<boolean> {
    return this.boot;
  }

  async markBootstrapped(): Promise<void> {
    this.boot = true;
  }
}

export class MemPlatformUsers implements PlatformUserRepo {
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

export class MemTenantRepo implements TenantRepo {
  private readonly tenants = new Map<string, { id: string; slug: string; name: string }>();

  async findBySlug(
    slug: string
  ): Promise<{ id: string; slug: string; name: string } | null> {
    return this.tenants.get(slug) ?? null;
  }

  async create(input: { id: string; slug: string; name: string }): Promise<void> {
    this.tenants.set(input.slug, { ...input });
  }
}

export class MemTenantUserRepo implements TenantUserRepo {
  readonly admins: Array<{
    id: string;
    tenantId: string;
    emailHash: string;
    displayName: string;
    passwordHash: string;
  }> = [];

  async createTenantAdmin(input: {
    id: string;
    tenantId: string;
    emailHash: string;
    displayName: string;
    passwordHash: string;
  }): Promise<void> {
    this.admins.push({ ...input });
  }
}

export class MemAuditWriter implements AuditEventWriter {
  readonly events: AuditEvent[] = [];

  async write(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}
