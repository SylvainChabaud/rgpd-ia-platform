/**
 * Tests for memory repository implementations
 * 
 * These tests improve branch coverage for the memory-based
 * test helpers used in integration tests.
 */

import {
  MemBootstrapState,
  MemPlatformUsers,
  MemTenantRepo,
  MemTenantUserRepo,
  MemAuditWriter,
} from '@tests/helpers/memoryRepos';
import { ACTOR_SCOPE } from "@/shared/actorScope";

describe("MemBootstrapState", () => {
  it("should return false initially", async () => {
    const state = new MemBootstrapState();
    expect(await state.isBootstrapped()).toBe(false);
  });

  it("should return true after markBootstrapped", async () => {
    const state = new MemBootstrapState();
    await state.markBootstrapped();
    expect(await state.isBootstrapped()).toBe(true);
  });
});

describe("MemPlatformUsers", () => {
  it("should return false for existsSuperAdmin initially", async () => {
    const repo = new MemPlatformUsers();
    expect(await repo.existsSuperAdmin()).toBe(false);
  });

  it("should return true after createSuperAdmin", async () => {
    const repo = new MemPlatformUsers();
    await repo.createSuperAdmin({
      id: "user-1",
      emailHash: "hash123",
      displayName: "Admin",
      passwordHash: "pwd123",
    });
    expect(await repo.existsSuperAdmin()).toBe(true);
  });
});

describe("MemTenantRepo", () => {
  let repo: MemTenantRepo;

  beforeEach(() => {
    repo = new MemTenantRepo();
  });

  describe("findBySlug", () => {
    it("should return null for non-existent tenant", async () => {
      const result = await repo.findBySlug("non-existent");
      expect(result).toBeNull();
    });

    it("should return tenant after create", async () => {
      await repo.create({ id: "t1", slug: "acme", name: "Acme Corp" });
      const result = await repo.findBySlug("acme");
      expect(result).toEqual({ id: "t1", slug: "acme", name: "Acme Corp" });
    });
  });

  describe("findById", () => {
    it("should return null for non-existent tenant", async () => {
      const result = await repo.findById("non-existent-id");
      expect(result).toBeNull();
    });

    it("should return tenant with all fields after create", async () => {
      await repo.create({ id: "t1", slug: "acme", name: "Acme Corp" });
      const result = await repo.findById("t1");
      
      expect(result).not.toBeNull();
      expect(result!.id).toBe("t1");
      expect(result!.slug).toBe("acme");
      expect(result!.name).toBe("Acme Corp");
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.deletedAt).toBeNull();
    });
  });

  describe("listAll", () => {
    it("should return empty array when no tenants", async () => {
      const result = await repo.listAll();
      expect(result).toEqual([]);
    });

    it("should return all tenants with default pagination", async () => {
      await repo.create({ id: "t1", slug: "acme", name: "Acme" });
      await repo.create({ id: "t2", slug: "beta", name: "Beta" });
      
      const result = await repo.listAll();
      expect(result).toHaveLength(2);
    });

    it("should respect limit parameter", async () => {
      await repo.create({ id: "t1", slug: "acme", name: "Acme" });
      await repo.create({ id: "t2", slug: "beta", name: "Beta" });
      await repo.create({ id: "t3", slug: "gamma", name: "Gamma" });
      
      const result = await repo.listAll(2);
      expect(result).toHaveLength(2);
    });

    it("should respect offset parameter", async () => {
      await repo.create({ id: "t1", slug: "acme", name: "Acme" });
      await repo.create({ id: "t2", slug: "beta", name: "Beta" });
      await repo.create({ id: "t3", slug: "gamma", name: "Gamma" });
      
      const result = await repo.listAll(20, 1);
      expect(result).toHaveLength(2);
    });
  });

  describe("update", () => {
    it("should update tenant name", async () => {
      await repo.create({ id: "t1", slug: "acme", name: "Acme" });
      await repo.update("t1", { name: "Acme Corp" });
      
      const result = await repo.findBySlug("acme");
      expect(result!.name).toBe("Acme Corp");
    });

    it("should do nothing for non-existent tenant", async () => {
      // Should not throw
      await repo.update("non-existent", { name: "New Name" });
    });

    it("should do nothing when name is not provided", async () => {
      await repo.create({ id: "t1", slug: "acme", name: "Acme" });
      await repo.update("t1", {});
      
      const result = await repo.findBySlug("acme");
      expect(result!.name).toBe("Acme");
    });
  });

  describe("softDelete", () => {
    it("should remove tenant from storage", async () => {
      await repo.create({ id: "t1", slug: "acme", name: "Acme" });
      await repo.softDelete("t1");
      
      const result = await repo.findById("t1");
      expect(result).toBeNull();
    });

    it("should do nothing for non-existent tenant", async () => {
      // Should not throw
      await repo.softDelete("non-existent");
    });
  });
});

describe("MemTenantUserRepo", () => {
  it("should store tenant admin", async () => {
    const repo = new MemTenantUserRepo();
    await repo.createTenantAdmin({
      id: "u1",
      tenantId: "t1",
      emailHash: "hash",
      displayName: "Admin",
      passwordHash: "pwd",
    });
    
    expect(repo.admins).toHaveLength(1);
    expect(repo.admins[0].id).toBe("u1");
    expect(repo.admins[0].tenantId).toBe("t1");
  });
});

describe("MemAuditWriter", () => {
  it("should store audit events", async () => {
    const writer = new MemAuditWriter();
    const event: import("@/app/audit/AuditEvent").AuditEvent = {
      id: "e1",
      eventName: "user.login",
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: "u1",
      tenantId: "t1",
      targetId: "u1",
      metadata: {},
      occurredAt: new Date(),
    };
    
    await writer.write(event);
    
    expect(writer.events).toHaveLength(1);
    expect(writer.events[0]).toEqual(event);
  });

  it("should accumulate multiple events", async () => {
    const writer = new MemAuditWriter();
    
    await writer.write({
      id: "e1",
      eventName: "login",
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: "u1",
      tenantId: "t1",
      targetId: "u1",
      metadata: {},
      occurredAt: new Date(),
    });
    
    await writer.write({
      id: "e2",
      eventName: "logout",
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: "u1",
      tenantId: "t1",
      targetId: "u1",
      metadata: {},
      occurredAt: new Date(),
    });
    
    expect(writer.events).toHaveLength(2);
  });
});
