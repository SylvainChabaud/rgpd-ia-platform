import type { AuditEvent } from "@/app/audit/AuditEvent";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { BootstrapStateRepo } from "@/app/ports/BootstrapStateRepo";
import type { PlatformUserRepo } from "@/app/ports/PlatformUserRepo";
import type { Tenant, TenantRepo } from "@/app/ports/TenantRepo";
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

  async createSuperAdmin(_: {
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

  async findById(tenantId: string): Promise<Tenant | null> {
    const tenant = Array.from(this.tenants.values()).find(t => t.id === tenantId);
    if (!tenant) return null;

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      createdAt: new Date(),
      deletedAt: null,
    };
  }

  async listAll(limit: number = 20, offset: number = 0): Promise<Tenant[]> {
    return Array.from(this.tenants.values())
      .slice(offset, offset + limit)
      .map(t => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        createdAt: new Date(),
        deletedAt: null,
      }));
  }

  async update(tenantId: string, updates: { name?: string }): Promise<void> {
    const tenant = Array.from(this.tenants.values()).find(t => t.id === tenantId);
    if (tenant && updates.name) {
      tenant.name = updates.name;
      // Update the map with the new name
      this.tenants.set(tenant.slug, tenant);
    }
  }

  async softDelete(tenantId: string): Promise<void> {
    // For memory implementation, just remove
    for (const [slug, tenant] of this.tenants.entries()) {
      if (tenant.id === tenantId) {
        this.tenants.delete(slug);
        break;
      }
    }
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
