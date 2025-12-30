/**
 * LOT 5.2 BLOCKER TESTS: RGPD Deletion (soft delete + purge + crypto-shredding)
 *
 * Requirements (from TASKS.md LOT 5.2):
 * - Après delete : aucune donnée n'est accessible via l'app
 * - Après purge : données supprimées/irrécupérables
 * - La stratégie est documentée et testée
 *
 * RGPD_TESTING.md:
 * - Test effacement: suppression logique immédiate
 * - Test purge différée / crypto-shredding
 * - Test irrécupérabilité garantie
 *
 * Classification: P1 (technical tests, no sensitive data)
 * Uses: Real deletion functionality with database
 */

import { pool } from "@/infrastructure/db/pg";
import { withTenantContext } from "@/infrastructure/db/tenantContext";
import { PgConsentRepo } from "@/infrastructure/repositories/PgConsentRepo";
import { PgAiJobRepo } from "@/infrastructure/repositories/PgAiJobRepo";
import { PgRgpdRequestRepo } from "@/infrastructure/repositories/PgRgpdRequestRepo";
import { InMemoryAuditEventWriter } from "@/app/audit/InMemoryAuditEventWriter";
import { deleteUserData } from "@/app/usecases/rgpd/deleteUserData";
import { purgeUserData } from "@/app/usecases/rgpd/purgeUserData";
import { exportUserData } from "@/app/usecases/rgpd/exportUserData";
import { newId } from "@/shared/ids";

// Test fixtures
const TENANT_A_ID = newId();
const TENANT_B_ID = newId();
const USER_A_ID = newId();
const USER_B_ID = newId();

/**
 * Setup: create test tenants and users
 */
async function setupTenants() {
  // Insert tenants (should not conflict after cleanup)
  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_A_ID, "deletion-test-a", "Deletion Test A"]
  );

  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_B_ID, "deletion-test-b", "Deletion Test B"]
  );

  // Create test users (with tenant context for RLS)
  await withTenantContext(pool, TENANT_A_ID, async (client) => {
    await client.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        USER_A_ID,
        TENANT_A_ID,
        "user_a_hash",
        "User A",
        "password_hash",
        "TENANT",
        "user",
      ]
    );
  });

  await withTenantContext(pool, TENANT_B_ID, async (client) => {
    await client.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        USER_B_ID,
        TENANT_B_ID,
        "user_b_hash",
        "User B",
        "password_hash",
        "TENANT",
        "user",
      ]
    );
  });
}

/**
 * Cleanup: delete all test data using SECURITY DEFINER function
 * This bypasses RLS policies for cleanup operations
 */
async function cleanup() {
  await pool.query("SELECT cleanup_test_data($1::uuid[])", [
    [TENANT_A_ID, TENANT_B_ID],
  ]);
}

beforeAll(async () => {
  // Clean up any previous test data by slug using SECURITY DEFINER function
  const existingTenants = await pool.query(
    "SELECT id FROM tenants WHERE slug IN ('deletion-test-a', 'deletion-test-b')"
  );

  if (existingTenants.rows.length > 0) {
    const tenantIds = existingTenants.rows.map((row) => row.id);
    await pool.query("SELECT cleanup_test_data($1::uuid[])", [tenantIds]);
  }

  // Create fresh test data
  await setupTenants();
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe("LOT 5.2 - RGPD Deletion (BLOCKER)", () => {
  const consentRepo = new PgConsentRepo();
  const aiJobRepo = new PgAiJobRepo();
  const rgpdRequestRepo = new PgRgpdRequestRepo();
  const auditWriter = new InMemoryAuditEventWriter();

  test("BLOCKER: Soft delete makes data immediately inaccessible", async () => {
    // GIVEN: User A has consents and jobs
    await consentRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "deletion_test",
      granted: true,
      grantedAt: new Date(),
    });

    await aiJobRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "deletion_test",
    });

    // WHEN: User A requests deletion
    const result = await deleteUserData(rgpdRequestRepo, auditWriter, {
      tenantId: TENANT_A_ID,
      userId: USER_A_ID,
    });

    // THEN: Deletion request created
    expect(result.requestId).toBeDefined();
    expect(result.deletedAt).toBeInstanceOf(Date);
    expect(result.scheduledPurgeAt).toBeInstanceOf(Date);

    // CRITICAL: User record marked as deleted (deleted_at set)
    const userRes = await withTenantContext(pool, TENANT_A_ID, async (client) => {
      return await client.query(
        "SELECT deleted_at FROM users WHERE id = $1",
        [USER_A_ID]
      );
    });
    expect(userRes.rows[0].deleted_at).not.toBeNull();

    // CRITICAL: Consents marked as deleted
    const consentsRes = await withTenantContext(pool, TENANT_A_ID, async (client) => {
      return await client.query(
        "SELECT deleted_at FROM consents WHERE user_id = $1",
        [USER_A_ID]
      );
    });
    expect(consentsRes.rows.length).toBeGreaterThan(0);
    expect(consentsRes.rows[0].deleted_at).not.toBeNull();

    // CRITICAL: Jobs marked as deleted
    const jobsRes = await withTenantContext(pool, TENANT_A_ID, async (client) => {
      return await client.query(
        "SELECT deleted_at FROM ai_jobs WHERE user_id = $1",
        [USER_A_ID]
      );
    });
    expect(jobsRes.rows.length).toBeGreaterThan(0);
    expect(jobsRes.rows[0].deleted_at).not.toBeNull();
  });

  test("BLOCKER: Soft delete is tenant-scoped (no cross-tenant deletion)", async () => {
    // GIVEN: User B in Tenant B exists
    const userBBefore = await withTenantContext(pool, TENANT_B_ID, async (client) => {
      return await client.query(
        "SELECT id, deleted_at FROM users WHERE id = $1",
        [USER_B_ID]
      );
    });
    expect(userBBefore.rows.length).toBe(1);
    expect(userBBefore.rows[0].deleted_at).toBeNull();

    // WHEN: Attempt to delete User B with wrong tenant (Tenant A)
    // THEN: Should fail or not affect User B
    await expect(
      deleteUserData(rgpdRequestRepo, auditWriter, {
        tenantId: TENANT_A_ID,
        userId: USER_B_ID,
      })
    ).rejects.toThrow(/not found/i);

    // VERIFY: User B still exists and not deleted
    const userBAfter = await withTenantContext(pool, TENANT_B_ID, async (client) => {
      return await client.query(
        "SELECT id, deleted_at FROM users WHERE id = $1",
        [USER_B_ID]
      );
    });
    expect(userBAfter.rows.length).toBe(1);
    expect(userBAfter.rows[0].deleted_at).toBeNull();
  });

  test("BLOCKER: Purge performs hard delete (data irrecoverable)", async () => {
    // GIVEN: Create a fresh user with data
    const freshUserId = newId();
    await withTenantContext(pool, TENANT_A_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          freshUserId,
          TENANT_A_ID,
          "fresh_hash",
          "Fresh User",
          "password_hash",
          "TENANT",
          "user",
        ]
      );
    });

    await consentRepo.create(TENANT_A_ID, {
      userId: freshUserId,
      purpose: "purge_test",
      granted: true,
      grantedAt: new Date(),
    });

    await aiJobRepo.create(TENANT_A_ID, {
      userId: freshUserId,
      purpose: "purge_test",
    });

    // WHEN: Request deletion (soft delete)
    const deleteResult = await deleteUserData(rgpdRequestRepo, auditWriter, {
      tenantId: TENANT_A_ID,
      userId: freshUserId,
    });

    // HACK: Manually set scheduledPurgeAt to past (simulate retention period passed)
    await withTenantContext(pool, TENANT_A_ID, async (client) => {
      await client.query(
        `UPDATE rgpd_requests
         SET scheduled_purge_at = NOW() - INTERVAL '1 day'
         WHERE id = $1`,
        [deleteResult.requestId]
      );
    });

    // WHEN: Execute purge
    const purgeResult = await purgeUserData(rgpdRequestRepo, auditWriter, {
      requestId: deleteResult.requestId,
    });

    // THEN: Records deleted
    expect(purgeResult.deletedRecords.users).toBe(1);
    expect(purgeResult.deletedRecords.consents).toBeGreaterThan(0);
    expect(purgeResult.deletedRecords.aiJobs).toBeGreaterThan(0);

    // CRITICAL: User completely removed (hard delete)
    const userRes = await withTenantContext(pool, TENANT_A_ID, async (client) => {
      return await client.query("SELECT * FROM users WHERE id = $1", [
        freshUserId,
      ]);
    });
    expect(userRes.rows.length).toBe(0);

    // CRITICAL: Consents completely removed
    const consentsRes = await withTenantContext(pool, TENANT_A_ID, async (client) => {
      return await client.query(
        "SELECT * FROM consents WHERE user_id = $1",
        [freshUserId]
      );
    });
    expect(consentsRes.rows.length).toBe(0);

    // CRITICAL: Jobs completely removed
    const jobsRes = await withTenantContext(pool, TENANT_A_ID, async (client) => {
      return await client.query("SELECT * FROM ai_jobs WHERE user_id = $1", [
        freshUserId,
      ]);
    });
    expect(jobsRes.rows.length).toBe(0);

    // CRITICAL: RGPD request marked as COMPLETED
    const requestRes = await withTenantContext(pool, TENANT_A_ID, async (client) => {
      return await client.query(
        "SELECT status, completed_at FROM rgpd_requests WHERE id = $1",
        [deleteResult.requestId]
      );
    });
    expect(requestRes.rows[0].status).toBe("COMPLETED");
    expect(requestRes.rows[0].completed_at).not.toBeNull();
  });

  test("BLOCKER: Purge includes crypto-shredding (export bundles deleted)", async () => {
    // GIVEN: User with export bundle
    const exportUserId = newId();
    await withTenantContext(pool, TENANT_A_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          exportUserId,
          TENANT_A_ID,
          "export_hash",
          "Export User",
          "password_hash",
          "TENANT",
          "user",
        ]
      );
    });

    await consentRepo.create(TENANT_A_ID, {
      userId: exportUserId,
      purpose: "crypto_shredding_test",
      granted: true,
      grantedAt: new Date(),
    });

    // Create export
    const exportResult = await exportUserData(
      consentRepo,
      aiJobRepo,
      auditWriter,
      {
        tenantId: TENANT_A_ID,
        userId: exportUserId,
      }
    );

    // Verify export exists
    const { existsSync } = await import("fs");
    const { join } = await import("path");
    const exportDir = process.env.EXPORT_DIR || "./data/exports";
    const exportFile = join(exportDir, `${exportResult.exportId}.enc`);
    expect(existsSync(exportFile)).toBe(true);

    // WHEN: Request deletion
    const deleteResult = await deleteUserData(rgpdRequestRepo, auditWriter, {
      tenantId: TENANT_A_ID,
      userId: exportUserId,
    });

    // Simulate retention period passed
    await withTenantContext(pool, TENANT_A_ID, async (client) => {
      await client.query(
        `UPDATE rgpd_requests
         SET scheduled_purge_at = NOW() - INTERVAL '1 day'
         WHERE id = $1`,
        [deleteResult.requestId]
      );
    });

    // WHEN: Execute purge
    const purgeResult = await purgeUserData(rgpdRequestRepo, auditWriter, {
      requestId: deleteResult.requestId,
    });

    // THEN: Export file deleted (crypto-shredding)
    expect(purgeResult.deletedRecords.exports).toBeGreaterThan(0);

    // CRITICAL: Export file no longer exists
    expect(existsSync(exportFile)).toBe(false);
  });

  test("BLOCKER: Audit events created (P1 only)", async () => {
    // GIVEN: Fresh audit writer
    const freshAuditWriter = new InMemoryAuditEventWriter();

    // Create user
    const auditUserId = newId();
    await withTenantContext(pool, TENANT_A_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          auditUserId,
          TENANT_A_ID,
          "audit_hash",
          "Audit User",
          "password_hash",
          "TENANT",
          "user",
        ]
      );
    });

    // WHEN: Request deletion
    const deleteResult = await deleteUserData(
      rgpdRequestRepo,
      freshAuditWriter,
      {
        tenantId: TENANT_A_ID,
        userId: auditUserId,
      }
    );

    // THEN: Deletion requested event created
    const events = freshAuditWriter.events;
    expect(events.length).toBe(1);
    expect(events[0].eventName).toBe("rgpd.deletion.requested");
    expect(events[0].tenantId).toBe(TENANT_A_ID);
    expect(events[0].actorId).toBe(auditUserId);
    expect(events[0].metadata?.requestId).toBe(deleteResult.requestId);

    // CRITICAL: No sensitive data in audit event
    expect(events[0]).not.toHaveProperty("password");
    expect(events[0]).not.toHaveProperty("email");
    expect(events[0]).not.toHaveProperty("user");

    // WHEN: Execute purge
    await withTenantContext(pool, TENANT_A_ID, async (client) => {
      await client.query(
        `UPDATE rgpd_requests
         SET scheduled_purge_at = NOW() - INTERVAL '1 day'
         WHERE id = $1`,
        [deleteResult.requestId]
      );
    });

    const freshAuditWriter2 = new InMemoryAuditEventWriter();
    await purgeUserData(rgpdRequestRepo, freshAuditWriter2, {
      requestId: deleteResult.requestId,
    });

    // THEN: Deletion completed event created
    const purgeEvents = freshAuditWriter2.events;
    expect(purgeEvents.length).toBe(1);
    expect(purgeEvents[0].eventName).toBe("rgpd.deletion.completed");
    expect(purgeEvents[0].tenantId).toBe(TENANT_A_ID);
    expect(purgeEvents[0].metadata?.requestId).toBe(deleteResult.requestId);
  });

  test("BLOCKER: Idempotent deletion (duplicate request handled)", async () => {
    // GIVEN: User
    const idempotentUserId = newId();
    await withTenantContext(pool, TENANT_A_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          idempotentUserId,
          TENANT_A_ID,
          "idempotent_hash",
          "Idempotent User",
          "password_hash",
          "TENANT",
          "user",
        ]
      );
    });

    // WHEN: Request deletion twice
    const result1 = await deleteUserData(rgpdRequestRepo, auditWriter, {
      tenantId: TENANT_A_ID,
      userId: idempotentUserId,
    });

    const result2 = await deleteUserData(rgpdRequestRepo, auditWriter, {
      tenantId: TENANT_A_ID,
      userId: idempotentUserId,
    });

    // THEN: Same request returned (idempotent)
    expect(result1.requestId).toBe(result2.requestId);
    expect(result1.scheduledPurgeAt.toISOString()).toBe(
      result2.scheduledPurgeAt.toISOString()
    );

    // VERIFY: Only one RGPD request created
    const requestsRes = await withTenantContext(pool, TENANT_A_ID, async (client) => {
      return await client.query(
        `SELECT COUNT(*) FROM rgpd_requests
         WHERE tenant_id = $1 AND user_id = $2 AND type = 'DELETE'`,
        [TENANT_A_ID, idempotentUserId]
      );
    });
    expect(parseInt(requestsRes.rows[0].count)).toBe(1);
  });

  test("BLOCKER: Purge validates retention period", async () => {
    // GIVEN: User with recent deletion (retention period NOT passed)
    const recentUserId = newId();
    await withTenantContext(pool, TENANT_A_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          recentUserId,
          TENANT_A_ID,
          "recent_hash",
          "Recent User",
          "password_hash",
          "TENANT",
          "user",
        ]
      );
    });

    const deleteResult = await deleteUserData(rgpdRequestRepo, auditWriter, {
      tenantId: TENANT_A_ID,
      userId: recentUserId,
    });

    // WHEN: Attempt to purge IMMEDIATELY (retention period not passed)
    // THEN: Should fail
    await expect(
      purgeUserData(rgpdRequestRepo, auditWriter, {
        requestId: deleteResult.requestId,
      })
    ).rejects.toThrow(/not ready for purge/i);

    // VERIFY: User still exists (soft deleted but not purged)
    const userRes = await withTenantContext(pool, TENANT_A_ID, async (client) => {
      return await client.query("SELECT * FROM users WHERE id = $1", [
        recentUserId,
      ]);
    });
    expect(userRes.rows.length).toBe(1);
    expect(userRes.rows[0].deleted_at).not.toBeNull();
  });
});
