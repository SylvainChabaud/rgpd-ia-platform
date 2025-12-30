/**
 * infrastructure.repositories.rgpd.test.ts — RGPD Request Repository tests
 *
 * Coverage target: All branches for RGPD request operations
 *
 * RGPD Compliance:
 * - Tenant isolation on all queries
 * - Deletion request tracking
 */

import { pool } from "@/infrastructure/db/pg";
import { PgRgpdRequestRepo } from "@/infrastructure/repositories/PgRgpdRequestRepo";
import { withTenantContext } from "@/infrastructure/db/tenantContext";
import { newId } from "@/shared/ids";

describe("PgRgpdRequestRepo", () => {
  const repo = new PgRgpdRequestRepo();
  const TENANT_ID = newId();
  const USER_ID = newId();

  beforeAll(async () => {
    // Create test tenant
    await pool.query(
      "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
      [TENANT_ID, "rgpd-repo-test-" + Date.now(), "RGPD Repo Test"]
    );

    // Create test user
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, 'TENANT', 'USER')
         ON CONFLICT (id) DO NOTHING`,
        [USER_ID, TENANT_ID, "test@rgpd-repo.com", "Test User", "$2a$10$hash"]
      );
    });
  });

  afterAll(async () => {
    // Cleanup using SECURITY DEFINER function
    await pool.query("SELECT cleanup_test_data($1::UUID[])", [[TENANT_ID]]);
    await pool.end();
  });

  describe("create", () => {
    it("creates RGPD request with tenant context", async () => {
      const request = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: "EXPORT",
        status: "PENDING",
      });

      expect(request.id).toBeDefined();
      expect(request.tenantId).toBe(TENANT_ID);
      expect(request.userId).toBe(USER_ID);
      expect(request.type).toBe("EXPORT");
      expect(request.status).toBe("PENDING");
    });

    it("throws error without tenantId", async () => {
      await expect(
        repo.create("", {
          userId: USER_ID,
          type: "DELETE",
          status: "PENDING",
        })
      ).rejects.toThrow("RGPD VIOLATION: tenantId required");
    });

    it("creates request with scheduled purge date", async () => {
      const scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const request = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: "DELETE",
        status: "PENDING",
        scheduledPurgeAt: scheduledDate,
      });

      expect(request.scheduledPurgeAt).toBeDefined();
      expect(request.scheduledPurgeAt?.getTime()).toBeCloseTo(
        scheduledDate.getTime(),
        -3
      );
    });
  });

  describe("findById", () => {
    it("finds request by id with tenant context", async () => {
      const created = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: "EXPORT",
        status: "PENDING",
      });

      const found = await repo.findById(TENANT_ID, created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.tenantId).toBe(TENANT_ID);
    });

    it("returns null for non-existent request", async () => {
      const found = await repo.findById(TENANT_ID, newId());
      expect(found).toBeNull();
    });

    it("throws error without tenantId", async () => {
      await expect(repo.findById("", "some-id")).rejects.toThrow(
        "RGPD VIOLATION: tenantId required"
      );
    });
  });

  describe("findDeletionRequest", () => {
    it("finds deletion request for user", async () => {
      const testUserId = newId();

      // Create user for this test
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, 'TENANT', 'USER')`,
          [testUserId, TENANT_ID, "deletion@test.com", "Deletion User", "$2a$10$hash"]
        );
      });

      await repo.create(TENANT_ID, {
        userId: testUserId,
        type: "DELETE",
        status: "PENDING",
      });

      const found = await repo.findDeletionRequest(TENANT_ID, testUserId);

      expect(found).not.toBeNull();
      expect(found?.type).toBe("DELETE");
      expect(found?.userId).toBe(testUserId);
    });

    it("returns null for user without deletion request", async () => {
      const found = await repo.findDeletionRequest(TENANT_ID, newId());
      expect(found).toBeNull();
    });

    it("throws error without tenantId", async () => {
      await expect(
        repo.findDeletionRequest("", "user-id")
      ).rejects.toThrow("RGPD VIOLATION: tenantId required");
    });
  });

  describe("updateStatus", () => {
    it("updates request status", async () => {
      const created = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: "EXPORT",
        status: "PENDING",
      });

      await repo.updateStatus(created.id, "COMPLETED", new Date());

      const updated = await repo.findById(TENANT_ID, created.id);
      expect(updated?.status).toBe("COMPLETED");
      expect(updated?.completedAt).toBeDefined();
    });

    it("updates status without completedAt", async () => {
      const created = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: "DELETE",
        status: "PENDING",
      });

      await repo.updateStatus(created.id, "PROCESSING");

      const updated = await repo.findById(TENANT_ID, created.id);
      expect(updated?.status).toBe("PROCESSING");
    });
  });

  describe("findPendingPurges", () => {
    it("finds pending purges scheduled for now or past", async () => {
      const testUserId = newId();

      // Create user
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, 'TENANT', 'USER')`,
          [testUserId, TENANT_ID, "purge@test.com", "Purge User", "$2a$10$hash"]
        );
      });

      // Create pending purge scheduled for past
      await repo.create(TENANT_ID, {
        userId: testUserId,
        type: "DELETE",
        status: "PENDING",
        scheduledPurgeAt: new Date(Date.now() - 1000), // 1 second ago
      });

      const pendingPurges = await repo.findPendingPurges();

      expect(pendingPurges.length).toBeGreaterThanOrEqual(1);
      expect(pendingPurges.some((p) => p.userId === testUserId)).toBe(true);
    });
  });
});
