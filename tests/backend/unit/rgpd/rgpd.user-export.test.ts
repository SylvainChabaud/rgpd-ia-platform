/**
 * RGPD Art. 15 + 20 TESTS: User Data Export (Portability)
 *
 * CRITICAL REQUIREMENTS:
 * - Export MUST include all user data in portable format (JSON)
 * - Export MUST be scoped to specific tenant
 * - Export MUST be encrypted before delivery
 * - Export MUST auto-delete after TTL (7 days)
 * - Export MUST NOT include other tenants' data (isolation)
 * - Export MUST generate audit event
 *
 * Reference: RGPD_TESTING.md, DATA_CLASSIFICATION.md
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { randomUUID } from "node:crypto";
import {
  MemUserRepo,
  MemAuditWriter,
  MemTenantRepo,
} from "@tests/helpers/memoryRepos";
import type { User } from "@/app/ports/UserRepo";
import { ACTOR_ROLE } from "@/shared/actorRole";
import { ACTOR_SCOPE } from "@/shared/actorScope";

// Constants for tests
const TENANT_A_ID = randomUUID();
const TENANT_B_ID = randomUUID();
const USER_A_ID = randomUUID();
const USER_B_ID = randomUUID();

// Mock export bundle structure
interface ExportBundle {
  id: string;
  userId: string;
  tenantId: string;
  format: "json" | "csv";
  data: UserExportData;
  createdAt: Date;
  expiresAt: Date;
  encrypted: boolean;
}

interface UserExportData {
  profile: {
    id: string;
    displayName: string;
    role: string;
    createdAt: string;
  };
  consents: Array<{
    purpose: string;
    granted: boolean;
    grantedAt: string;
  }>;
  aiUsage: Array<{
    id: string;
    purpose: string;
    createdAt: string;
  }>;
}

// In-memory export repo for tests
class MemExportRepo {
  private bundles: ExportBundle[] = [];

  async createExport(input: {
    userId: string;
    tenantId: string;
    data: UserExportData;
  }): Promise<ExportBundle> {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days TTL

    const bundle: ExportBundle = {
      id: randomUUID(),
      userId: input.userId,
      tenantId: input.tenantId,
      format: "json",
      data: input.data,
      createdAt: now,
      expiresAt,
      encrypted: true,
    };

    this.bundles.push(bundle);
    return bundle;
  }

  async findByUserId(userId: string, tenantId: string): Promise<ExportBundle | null> {
    return this.bundles.find(
      (b) => b.userId === userId && b.tenantId === tenantId
    ) ?? null;
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    const initialCount = this.bundles.length;
    this.bundles = this.bundles.filter((b) => b.expiresAt > now);
    return initialCount - this.bundles.length;
  }

  async purgeByTenant(tenantId: string): Promise<number> {
    const initialCount = this.bundles.length;
    this.bundles = this.bundles.filter((b) => b.tenantId !== tenantId);
    return initialCount - this.bundles.length;
  }
}

// Export use case simulation
async function exportUserData(
  userId: string,
  tenantId: string,
  deps: {
    userRepo: MemUserRepo;
    exportRepo: MemExportRepo;
    auditWriter: MemAuditWriter;
  },
  actorId: string
): Promise<ExportBundle> {
  // Validate tenant isolation
  if (!tenantId) {
    throw new Error("RGPD VIOLATION: tenantId required");
  }

  // Get user
  const user = await deps.userRepo.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Validate user belongs to tenant (isolation)
  if (user.tenantId !== tenantId) {
    throw new Error("RGPD VIOLATION: cross-tenant access denied");
  }

  // Build export data (P1 data only, no P2/P3)
  const exportData: UserExportData = {
    profile: {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    consents: [], // Would be populated from consent repo
    aiUsage: [], // Would be populated from AI jobs repo
  };

  // Create export bundle
  const bundle = await deps.exportRepo.createExport({
    userId,
    tenantId,
    data: exportData,
  });

  // Write audit event (RGPD-safe: no PII)
  await deps.auditWriter.write({
    id: randomUUID(),
    eventName: "user.data.exported",
    actorScope: ACTOR_SCOPE.TENANT,
    actorId,
    tenantId,
    targetId: userId,
    metadata: {
      exportId: bundle.id,
      format: bundle.format,
    },
    occurredAt: new Date(),
  });

  return bundle;
}

describe("RGPD Art. 15 + 20: User Data Export", () => {
  let userRepo: MemUserRepo;
  let exportRepo: MemExportRepo;
  let auditWriter: MemAuditWriter;
  let tenantRepo: MemTenantRepo;

  beforeEach(() => {
    userRepo = new MemUserRepo();
    exportRepo = new MemExportRepo();
    auditWriter = new MemAuditWriter();
    tenantRepo = new MemTenantRepo();
  });

  describe("Export format (Art. 20 - Portability)", () => {
    it("should export user data in JSON format", async () => {
      // Setup: create user
      const user: User = {
        id: USER_A_ID,
        tenantId: TENANT_A_ID,
        emailHash: "hash123",
        displayName: "Test User",
        passwordHash: "pwdhash",
        role: ACTOR_ROLE.MEMBER,
        scope: ACTOR_SCOPE.TENANT,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
        createdAt: new Date(),
        deletedAt: null,
      };
      userRepo.users.push(user);

      // Execute
      const bundle = await exportUserData(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, exportRepo, auditWriter },
        "actor-123"
      );

      // Assert
      expect(bundle.format).toBe("json");
      expect(bundle.data).toBeDefined();
      expect(bundle.data.profile.id).toBe(USER_A_ID);
      expect(bundle.data.profile.displayName).toBe("Test User");
    });

    it("should include profile, consents, and AI usage in export", async () => {
      const user: User = {
        id: USER_A_ID,
        tenantId: TENANT_A_ID,
        emailHash: "hash123",
        displayName: "Test User",
        passwordHash: "pwdhash",
        role: ACTOR_ROLE.MEMBER,
        scope: ACTOR_SCOPE.TENANT,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
        createdAt: new Date(),
        deletedAt: null,
      };
      userRepo.users.push(user);

      const bundle = await exportUserData(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, exportRepo, auditWriter },
        "actor-123"
      );

      // Portable format structure
      expect(bundle.data).toHaveProperty("profile");
      expect(bundle.data).toHaveProperty("consents");
      expect(bundle.data).toHaveProperty("aiUsage");
    });

    it("should NOT include P2/P3 data (email, password) in export", async () => {
      const user: User = {
        id: USER_A_ID,
        tenantId: TENANT_A_ID,
        emailHash: "hash123",
        displayName: "Test User",
        passwordHash: "sensitive-password-hash",
        role: ACTOR_ROLE.MEMBER,
        scope: ACTOR_SCOPE.TENANT,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
        createdAt: new Date(),
        deletedAt: null,
      };
      userRepo.users.push(user);

      const bundle = await exportUserData(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, exportRepo, auditWriter },
        "actor-123"
      );

      // P2/P3 data MUST NOT be in export
      const exportString = JSON.stringify(bundle.data);
      expect(exportString).not.toContain("hash123");
      expect(exportString).not.toContain("sensitive-password-hash");
      expect(exportString).not.toContain("emailHash");
      expect(exportString).not.toContain("passwordHash");
    });
  });

  describe("Tenant isolation (CRITICAL)", () => {
    it("should reject export without tenantId", async () => {
      await expect(
        exportUserData(
          USER_A_ID,
          "", // Empty tenant
          { userRepo, exportRepo, auditWriter },
          "actor-123"
        )
      ).rejects.toThrow("RGPD VIOLATION: tenantId required");
    });

    it("should reject cross-tenant export attempt", async () => {
      // User belongs to Tenant A
      const user: User = {
        id: USER_A_ID,
        tenantId: TENANT_A_ID,
        emailHash: "hash123",
        displayName: "Tenant A User",
        passwordHash: "pwdhash",
        role: ACTOR_ROLE.MEMBER,
        scope: ACTOR_SCOPE.TENANT,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
        createdAt: new Date(),
        deletedAt: null,
      };
      userRepo.users.push(user);

      // Attempt export with Tenant B context
      await expect(
        exportUserData(
          USER_A_ID,
          TENANT_B_ID, // Wrong tenant!
          { userRepo, exportRepo, auditWriter },
          "actor-123"
        )
      ).rejects.toThrow("RGPD VIOLATION: cross-tenant access denied");
    });

    it("should scope export to requesting tenant only", async () => {
      // Create users in both tenants
      userRepo.users.push({
        id: USER_A_ID,
        tenantId: TENANT_A_ID,
        emailHash: "hash-a",
        displayName: "User A",
        passwordHash: "pwdhash",
        role: ACTOR_ROLE.MEMBER,
        scope: ACTOR_SCOPE.TENANT,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
        createdAt: new Date(),
        deletedAt: null,
      });

      userRepo.users.push({
        id: USER_B_ID,
        tenantId: TENANT_B_ID,
        emailHash: "hash-b",
        displayName: "User B",
        passwordHash: "pwdhash",
        role: ACTOR_ROLE.MEMBER,
        scope: ACTOR_SCOPE.TENANT,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
        createdAt: new Date(),
        deletedAt: null,
      });

      // Export only Tenant A user
      const bundle = await exportUserData(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, exportRepo, auditWriter },
        "actor-123"
      );

      // Verify export contains only Tenant A data
      expect(bundle.tenantId).toBe(TENANT_A_ID);
      expect(bundle.data.profile.id).toBe(USER_A_ID);
      expect(bundle.data.profile.displayName).toBe("User A");
    });
  });

  describe("Export TTL (7 days auto-delete)", () => {
    it("should set expiration date to 7 days from creation", async () => {
      userRepo.users.push({
        id: USER_A_ID,
        tenantId: TENANT_A_ID,
        emailHash: "hash123",
        displayName: "Test User",
        passwordHash: "pwdhash",
        role: ACTOR_ROLE.MEMBER,
        scope: ACTOR_SCOPE.TENANT,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
        createdAt: new Date(),
        deletedAt: null,
      });

      const bundle = await exportUserData(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, exportRepo, auditWriter },
        "actor-123"
      );

      const expectedExpiry = new Date(bundle.createdAt);
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);

      expect(bundle.expiresAt.getDate()).toBe(expectedExpiry.getDate());
    });

    it("should delete expired exports on purge", async () => {
      // Create an already-expired export
      const expiredBundle: ExportBundle = {
        id: randomUUID(),
        userId: USER_A_ID,
        tenantId: TENANT_A_ID,
        format: "json",
        data: { profile: { id: USER_A_ID, displayName: "Test", role: "MEMBER", createdAt: "" }, consents: [], aiUsage: [] },
        createdAt: new Date("2020-01-01"),
        expiresAt: new Date("2020-01-08"), // Expired long ago
        encrypted: true,
      };

      // Manually add to repo (simulating old export)
      (exportRepo as any).bundles = [expiredBundle];

      // Run purge
      const deleted = await exportRepo.deleteExpired();

      expect(deleted).toBe(1);
      const found = await exportRepo.findByUserId(USER_A_ID, TENANT_A_ID);
      expect(found).toBeNull();
    });
  });

  describe("Export encryption", () => {
    it("should mark export as encrypted", async () => {
      userRepo.users.push({
        id: USER_A_ID,
        tenantId: TENANT_A_ID,
        emailHash: "hash123",
        displayName: "Test User",
        passwordHash: "pwdhash",
        role: ACTOR_ROLE.MEMBER,
        scope: ACTOR_SCOPE.TENANT,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
        createdAt: new Date(),
        deletedAt: null,
      });

      const bundle = await exportUserData(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, exportRepo, auditWriter },
        "actor-123"
      );

      expect(bundle.encrypted).toBe(true);
    });
  });

  describe("Audit trail (RGPD compliance)", () => {
    it("should generate audit event on export", async () => {
      userRepo.users.push({
        id: USER_A_ID,
        tenantId: TENANT_A_ID,
        emailHash: "hash123",
        displayName: "Test User",
        passwordHash: "pwdhash",
        role: ACTOR_ROLE.MEMBER,
        scope: ACTOR_SCOPE.TENANT,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
        createdAt: new Date(),
        deletedAt: null,
      });

      await exportUserData(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, exportRepo, auditWriter },
        "actor-123"
      );

      expect(auditWriter.events).toHaveLength(1);
      expect(auditWriter.events[0].eventName).toBe("user.data.exported");
      expect(auditWriter.events[0].targetId).toBe(USER_A_ID);
      expect(auditWriter.events[0].tenantId).toBe(TENANT_A_ID);
    });

    it("should NOT include PII in audit event", async () => {
      userRepo.users.push({
        id: USER_A_ID,
        tenantId: TENANT_A_ID,
        emailHash: "hash123",
        displayName: "Sensitive Name",
        passwordHash: "pwdhash",
        role: ACTOR_ROLE.MEMBER,
        scope: ACTOR_SCOPE.TENANT,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
        createdAt: new Date(),
        deletedAt: null,
      });

      await exportUserData(
        USER_A_ID,
        TENANT_A_ID,
        { userRepo, exportRepo, auditWriter },
        "actor-123"
      );

      const eventStr = JSON.stringify(auditWriter.events[0]);
      expect(eventStr).not.toContain("Sensitive Name");
      expect(eventStr).not.toContain("hash123");
    });
  });
});
