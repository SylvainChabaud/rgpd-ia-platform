import type { AuditEvent } from "@/app/audit/AuditEvent";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { BootstrapStateRepo } from "@/app/ports/BootstrapStateRepo";
import type { PlatformUserRepo } from "@/app/ports/PlatformUserRepo";
import type { Tenant, TenantRepo } from "@/app/ports/TenantRepo";
import type { TenantUserRepo } from "@/app/ports/TenantUserRepo";
import type { PasswordHasher } from "@/app/ports/PasswordHasher";
import type { User, UserRepo, UserDataStatus } from "@/app/ports/UserRepo";
import { createHash, randomBytes } from "crypto";

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
      suspendedAt: null,
      suspensionReason: null,
      suspendedBy: null,
    };
  }

  async getById(tenantId: string): Promise<Tenant | null> {
    return this.findById(tenantId);
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
        suspendedAt: null,
        suspensionReason: null,
        suspendedBy: null,
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

  async suspend(_tenantId: string, _data: { reason: string; suspendedBy: string }): Promise<void> {
    // Memory implementation: stub (not used in tests currently)
  }

  async unsuspend(_tenantId: string): Promise<void> {
    // Memory implementation: stub (not used in tests currently)
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

  readonly users: Array<{
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

  async createTenantUser(input: {
    id: string;
    tenantId: string;
    emailHash: string;
    displayName: string;
    passwordHash: string;
  }): Promise<void> {
    this.users.push({ ...input });
  }

  async createTenantDpo(input: {
    id: string;
    tenantId: string;
    emailHash: string;
    displayName: string;
    passwordHash: string;
  }): Promise<void> {
    // DPO is stored same as admin for memory testing
    this.admins.push({ ...input });
  }
}

export class MemAuditWriter implements AuditEventWriter {
  readonly events: AuditEvent[] = [];

  async write(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

export class MemPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256").update(salt + password).digest("hex");
    return `${salt}:${hash}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const [salt, storedHash] = hash.split(":");
    const computedHash = createHash("sha256").update(salt + password).digest("hex");
    return computedHash === storedHash;
  }
}

/**
 * In-memory UserRepo implementation for unit tests
 * Implements all required methods from UserRepo interface
 */
export class MemUserRepo implements UserRepo {
  readonly users: User[] = [];

  async findByEmailHash(emailHash: string): Promise<User | null> {
    return this.users.find(u => u.emailHash === emailHash && !u.deletedAt) ?? null;
  }

  async findById(userId: string): Promise<User | null> {
    return this.users.find(u => u.id === userId && !u.deletedAt) ?? null;
  }

  async listByTenant(tenantId: string, limit = 20, offset = 0): Promise<User[]> {
    return this.users
      .filter(u => u.tenantId === tenantId && !u.deletedAt)
      .slice(offset, offset + limit);
  }

  async listSuspendedByTenant(tenantId: string): Promise<User[]> {
    if (!tenantId) throw new Error("RGPD VIOLATION: tenantId required");
    return this.users.filter(
      u => u.tenantId === tenantId && u.dataSuspended && !u.deletedAt
    );
  }

  async createUser(user: Omit<User, "createdAt" | "deletedAt">): Promise<void> {
    this.users.push({
      ...user,
      createdAt: new Date(),
      deletedAt: null,
    });
  }

  async createUserWithEmail(
    user: Omit<User, "createdAt" | "deletedAt">,
    _email: string
  ): Promise<void> {
    await this.createUser(user);
  }

  async getDecryptedEmail(_userId: string): Promise<string | null> {
    return null; // Not implemented for memory repo
  }

  async updateUser(
    userId: string,
    updates: { displayName?: string; role?: string }
  ): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      if (updates.displayName) user.displayName = updates.displayName;
      if (updates.role) user.role = updates.role;
    }
  }

  async softDeleteUser(userId: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) user.deletedAt = new Date();
  }

  async softDeleteUserByTenant(tenantId: string, userId: string): Promise<number> {
    const user = this.users.find(
      u => u.id === userId && u.tenantId === tenantId && !u.deletedAt
    );
    if (user) {
      user.deletedAt = new Date();
      return 1;
    }
    return 0;
  }

  async hardDeleteUserByTenant(tenantId: string, userId: string): Promise<number> {
    const idx = this.users.findIndex(
      u => u.id === userId && u.tenantId === tenantId
    );
    if (idx >= 0) {
      this.users.splice(idx, 1);
      return 1;
    }
    return 0;
  }

  async updateDataSuspension(
    userId: string,
    suspended: boolean,
    reason?: string
  ): Promise<User> {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error("User not found");
    user.dataSuspended = suspended;
    user.dataSuspendedAt = suspended ? new Date() : null;
    user.dataSuspendedReason = suspended ? (reason ?? null) : null;
    return user;
  }

  async listFiltered(options: {
    limit?: number;
    offset?: number;
    tenantId?: string;
    role?: string;
    status?: UserDataStatus;
  }): Promise<User[]> {
    let filtered = this.users.filter(u => !u.deletedAt);

    if (options.tenantId) {
      filtered = filtered.filter(u => u.tenantId === options.tenantId);
    }
    if (options.role) {
      filtered = filtered.filter(u => u.role === options.role);
    }
    if (options.status === "suspended") {
      filtered = filtered.filter(u => u.dataSuspended);
    } else if (options.status === "active") {
      filtered = filtered.filter(u => !u.dataSuspended);
    }

    const offset = options.offset ?? 0;
    const limit = options.limit ?? 20;
    return filtered.slice(offset, offset + limit);
  }

  async listFilteredByTenant(options: {
    tenantId: string;
    limit?: number;
    offset?: number;
    role?: string;
    status?: UserDataStatus;
    search?: string;
    sortBy?: "name" | "createdAt" | "role";
    sortOrder?: "asc" | "desc";
  }): Promise<User[]> {
    let filtered = this.users.filter(
      u => u.tenantId === options.tenantId && !u.deletedAt
    );

    if (options.role) {
      filtered = filtered.filter(u => u.role === options.role);
    }
    if (options.status === "suspended") {
      filtered = filtered.filter(u => u.dataSuspended);
    } else if (options.status === "active") {
      filtered = filtered.filter(u => !u.dataSuspended);
    }
    if (options.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(u =>
        u.displayName.toLowerCase().includes(search)
      );
    }

    // Sort
    const sortBy = options.sortBy ?? "createdAt";
    const sortOrder = options.sortOrder ?? "desc";
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.displayName.localeCompare(b.displayName);
      } else if (sortBy === "role") {
        cmp = a.role.localeCompare(b.role);
      } else {
        cmp = a.createdAt.getTime() - b.createdAt.getTime();
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    return filtered.slice(offset, offset + limit);
  }

  async countByTenant(options: {
    tenantId: string;
    role?: string;
    status?: UserDataStatus;
    search?: string;
  }): Promise<number> {
    let filtered = this.users.filter(
      u => u.tenantId === options.tenantId && !u.deletedAt
    );

    if (options.role) {
      filtered = filtered.filter(u => u.role === options.role);
    }
    if (options.status === "suspended") {
      filtered = filtered.filter(u => u.dataSuspended);
    } else if (options.status === "active") {
      filtered = filtered.filter(u => !u.dataSuspended);
    }
    if (options.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(u =>
        u.displayName.toLowerCase().includes(search)
      );
    }

    return filtered.length;
  }
}
