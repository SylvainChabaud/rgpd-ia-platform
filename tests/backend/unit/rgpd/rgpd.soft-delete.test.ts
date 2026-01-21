/**
 * RGPD Art. 17 TESTS: Right to Erasure (Soft Delete)
 *
 * CRITICAL REQUIREMENTS:
 * - Soft delete MUST mark data as deleted immediately
 * - Soft deleted data MUST be inaccessible via normal queries
 * - Hard delete (purge) MUST occur after retention period (30 days)
 * - Deletion MUST be scoped to tenant (isolation)
 * - Deletion MUST generate audit event
 * - Deletion MUST NOT affect other tenants' data
 *
 * Reference: RGPD_TESTING.md, DATA_CLASSIFICATION.md
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { MemUserRepo, MemAuditWriter } from "@tests/helpers/memoryRepos";
import type { User } from "@/app/ports/UserRepo";
import { ACTOR_ROLE } from "@/shared/actorRole";
import { ACTOR_SCOPE } from "@/shared/actorScope";

// Constants for tests
const TENANT_A_ID = randomUUID();
const TENANT_B_ID = randomUUID();
const USER_A_ID = randomUUID();
const USER_B_ID = randomUUID();
const USER_C_ID = randomUUID();

// Retention policy constants (from RGPD rules)
const SOFT_DELETE_RETENTION_DAYS = 30;

// Soft delete use case simulation
async function softDeleteUser(
  userId: string,
  tenantId: string,
  deps: {
    userRepo: MemUserRepo;
    auditWriter: MemAuditWriter;
  },
  actorId: string
): Promise<{ success: boolean; deletedAt: Date }> {
  // Validate tenant isolation
  if (!tenantId) {
    throw new Error("RGPD VIOLATION: tenantId required");
  }

  // Get user to verify tenant ownership
  const user = await deps.userRepo.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Validate user belongs to tenant (isolation)
  if (user.tenantId !== tenantId) {
    throw new Error("RGPD VIOLATION: cross-tenant access denied");
  }

  // Perform soft delete
  await deps.userRepo.softDeleteUser(userId);

  const deletedAt = new Date();

  // Write audit event (RGPD-safe: no PII)
  await deps.auditWriter.write({
    id: randomUUID(),
    eventName: "user.soft_deleted",
    actorScope: ACTOR_SCOPE.TENANT,
    actorId,
    tenantId,
    targetId: userId,
    metadata: {
      retentionDays: SOFT_DELETE_RETENTION_DAYS,
      hardDeleteScheduledAt: new Date(
        deletedAt.getTime() + SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString(),
    },
    occurredAt: deletedAt,
  });

  return { success: true, deletedAt };
}

// Hard delete (purge) simulation
async function hardDeleteUser(
  userId: string,
  tenantId: string,
  deps: {
    userRepo: MemUserRepo;
    auditWriter: MemAuditWriter;
  }
): Promise<{ deleted: number }> {
  if (!tenantId) {
    throw new Error("RGPD VIOLATION: tenantId required");
  }

  const deleted = await deps.userRepo.hardDeleteUserByTenant(tenantId, userId);

  if (deleted > 0) {
    await deps.auditWriter.write({
      id: randomUUID(),
      eventName: "user.hard_deleted",
      actorScope: ACTOR_SCOPE.SYSTEM,
      actorId: "system",
      tenantId,
      targetId: userId,
      metadata: { purged: true },
      occurredAt: new Date(),
    });
  }

  return { deleted };
}

// Create test user helper
function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: randomUUID(),
    tenantId: TENANT_A_ID,
    emailHash: `hash-${randomUUID().substring(0, 8)}`,
    displayName: "Test User",
    passwordHash: "pwdhash",
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
    dataSuspended: false,
    dataSuspendedAt: null,
    dataSuspendedReason: null,
    createdAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("RGPD Art. 17: Right to Erasure (Soft Delete)", () => {
  let userRepo: MemUserRepo;
  let auditWriter: MemAuditWriter;

  beforeEach(() => {
    userRepo = new MemUserRepo();
    auditWriter = new MemAuditWriter();
  });

  describe("Soft delete immediacy", () => {
    it("should mark user as deleted immediately", async () => {
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      userRepo.users.push(user);

      const result = await softDeleteUser(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, auditWriter },
        "actor-123"
      );

      expect(result.success).toBe(true);
      expect(result.deletedAt).toBeInstanceOf(Date);

      // Verify user is marked as deleted
      const deletedUser = userRepo.users.find((u) => u.id === USER_A_ID);
      expect(deletedUser?.deletedAt).not.toBeNull();
    });

    it("should set deletedAt timestamp on soft delete", async () => {
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      userRepo.users.push(user);

      const before = new Date();
      await softDeleteUser(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, auditWriter },
        "actor-123"
      );
      const after = new Date();

      const deletedUser = userRepo.users.find((u) => u.id === USER_A_ID);
      expect(deletedUser?.deletedAt).not.toBeNull();
      expect(deletedUser!.deletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(deletedUser!.deletedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("Data inaccessibility after soft delete", () => {
    it("should not return soft-deleted user via findById", async () => {
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      userRepo.users.push(user);

      // Soft delete
      await softDeleteUser(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, auditWriter },
        "actor-123"
      );

      // Try to find user - should return null (deleted)
      const found = await userRepo.findById(USER_A_ID);
      expect(found).toBeNull();
    });

    it("should not return soft-deleted user via listByTenant", async () => {
      const user1 = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID, displayName: "Active User" });
      const user2 = createTestUser({ id: USER_B_ID, tenantId: TENANT_A_ID, displayName: "To Delete" });
      userRepo.users.push(user1, user2);

      // Soft delete user2
      await softDeleteUser(
        USER_B_ID,
        TENANT_A_ID,
        { userRepo, auditWriter },
        "actor-123"
      );

      // List users - should only return active user
      const users = await userRepo.listByTenant(TENANT_A_ID);
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(USER_A_ID);
      expect(users[0].displayName).toBe("Active User");
    });

    it("should not return soft-deleted user via findByEmailHash", async () => {
      const emailHash = "unique-email-hash-123";
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID, emailHash });
      userRepo.users.push(user);

      // Soft delete
      await softDeleteUser(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, auditWriter },
        "actor-123"
      );

      // Try to find by email hash - should return null
      const found = await userRepo.findByEmailHash(emailHash);
      expect(found).toBeNull();
    });
  });

  describe("Tenant isolation (CRITICAL)", () => {
    it("should reject soft delete without tenantId", async () => {
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      userRepo.users.push(user);

      await expect(
        softDeleteUser(
          USER_A_ID,
          "", // Empty tenant
          { userRepo, auditWriter },
          "actor-123"
        )
      ).rejects.toThrow("RGPD VIOLATION: tenantId required");
    });

    it("should reject cross-tenant soft delete attempt", async () => {
      // User belongs to Tenant A
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      userRepo.users.push(user);

      // Attempt delete with Tenant B context
      await expect(
        softDeleteUser(
          USER_A_ID,
          TENANT_B_ID, // Wrong tenant!
          { userRepo, auditWriter },
          "actor-123"
        )
      ).rejects.toThrow("RGPD VIOLATION: cross-tenant access denied");

      // Verify user was NOT deleted
      const found = await userRepo.findById(USER_A_ID);
      expect(found).not.toBeNull();
      expect(found?.deletedAt).toBeNull();
    });

    it("should NOT affect other tenants' users", async () => {
      // Create users in both tenants
      const userA = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID, displayName: "Tenant A User" });
      const userB = createTestUser({ id: USER_B_ID, tenantId: TENANT_B_ID, displayName: "Tenant B User" });
      userRepo.users.push(userA, userB);

      // Delete user in Tenant A
      await softDeleteUser(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, auditWriter },
        "actor-123"
      );

      // Verify Tenant A user is deleted
      const foundA = await userRepo.findById(USER_A_ID);
      expect(foundA).toBeNull();

      // Verify Tenant B user is NOT affected
      const foundB = await userRepo.findById(USER_B_ID);
      expect(foundB).not.toBeNull();
      expect(foundB?.displayName).toBe("Tenant B User");
      expect(foundB?.deletedAt).toBeNull();
    });
  });

  describe("Hard delete (purge after retention)", () => {
    it("should hard delete user by tenant", async () => {
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      user.deletedAt = new Date("2020-01-01"); // Already soft-deleted
      userRepo.users.push(user);

      const result = await hardDeleteUser(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, auditWriter }
      );

      expect(result.deleted).toBe(1);

      // Verify user is completely removed
      const found = userRepo.users.find((u) => u.id === USER_A_ID);
      expect(found).toBeUndefined();
    });

    it("should reject hard delete without tenantId", async () => {
      await expect(
        hardDeleteUser(
          USER_A_ID,
          "",
          { userRepo, auditWriter }
        )
      ).rejects.toThrow("RGPD VIOLATION: tenantId required");
    });

    it("should not hard delete user from different tenant", async () => {
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      user.deletedAt = new Date();
      userRepo.users.push(user);

      // Attempt hard delete with wrong tenant
      const result = await hardDeleteUser(
        USER_A_ID,
        TENANT_B_ID, // Wrong tenant
        { userRepo, auditWriter }
      );

      expect(result.deleted).toBe(0);

      // Verify user still exists
      const found = userRepo.users.find((u) => u.id === USER_A_ID);
      expect(found).toBeDefined();
    });
  });

  describe("Audit trail (RGPD compliance)", () => {
    it("should generate audit event on soft delete", async () => {
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      userRepo.users.push(user);

      await softDeleteUser(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, auditWriter },
        "actor-123"
      );

      expect(auditWriter.events).toHaveLength(1);
      expect(auditWriter.events[0].eventName).toBe("user.soft_deleted");
      expect(auditWriter.events[0].targetId).toBe(USER_A_ID);
      expect(auditWriter.events[0].tenantId).toBe(TENANT_A_ID);
      expect(auditWriter.events[0].actorId).toBe("actor-123");
    });

    it("should include retention info in audit metadata", async () => {
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      userRepo.users.push(user);

      await softDeleteUser(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, auditWriter },
        "actor-123"
      );

      const event = auditWriter.events[0];
      expect(event.metadata).toHaveProperty("retentionDays", SOFT_DELETE_RETENTION_DAYS);
      expect(event.metadata).toHaveProperty("hardDeleteScheduledAt");
    });

    it("should generate audit event on hard delete", async () => {
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      user.deletedAt = new Date();
      userRepo.users.push(user);

      await hardDeleteUser(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, auditWriter }
      );

      expect(auditWriter.events).toHaveLength(1);
      expect(auditWriter.events[0].eventName).toBe("user.hard_deleted");
      expect(auditWriter.events[0].metadata).toHaveProperty("purged", true);
    });

    it("should NOT include PII in audit events", async () => {
      const user = createTestUser({
        id: USER_A_ID,
        tenantId: TENANT_A_ID,
        displayName: "Sensitive Name",
        emailHash: "sensitive-hash",
      });
      userRepo.users.push(user);

      await softDeleteUser(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, auditWriter },
        "actor-123"
      );

      const eventStr = JSON.stringify(auditWriter.events[0]);
      expect(eventStr).not.toContain("Sensitive Name");
      expect(eventStr).not.toContain("sensitive-hash");
    });
  });

  describe("Edge cases", () => {
    it("should handle deleting already deleted user gracefully", async () => {
      const user = createTestUser({ id: USER_A_ID, tenantId: TENANT_A_ID });
      user.deletedAt = new Date(); // Already deleted
      userRepo.users.push(user);

      // findById returns null for deleted users, so this should throw "User not found"
      await expect(
        softDeleteUser(
          USER_A_ID,
          TENANT_A_ID,
          { userRepo, auditWriter },
          "actor-123"
        )
      ).rejects.toThrow("User not found");
    });

    it("should handle non-existent user", async () => {
      await expect(
        softDeleteUser(
          "non-existent-id",
          TENANT_A_ID,
          { userRepo, auditWriter },
          "actor-123"
        )
      ).rejects.toThrow("User not found");
    });
  });
});
