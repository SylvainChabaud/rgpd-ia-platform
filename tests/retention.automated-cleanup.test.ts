/**
 * retention.automated-cleanup.test.ts — Test automated retention cleanup
 *
 * RGPD Compliance:
 * - Art. 5(1)(e): Storage limitation - data kept no longer than necessary
 * - Art. 25: Privacy by Design - automated retention enforcement
 * - EPIC 4: Automated data minimization and retention
 *
 * Gap addressed:
 * - Existing test (purge.lot4.test.ts) tests MANUAL purge only
 * - This test validates AUTOMATED scheduled cleanup behavior
 *
 * Reference: .claude/CONTINUATION_PROMPT_TESTS_COVERAGE.md §7
 *
 * Classification: P1 (technical tests, no real data)
 */

import { pool } from "@/infrastructure/db/pg";
import { withTenantContext } from "@/infrastructure/db/tenantContext";
import {
  executeTenantPurgeJob,
  purgeAiJobs,
} from "@/app/jobs/purge";
import {
  getDefaultRetentionPolicy,
  calculateCutoffDate,
} from "@/domain/retention/RetentionPolicy";
import { newId } from "@/shared/ids";

const TENANT_ID = newId();
const USER_ID = newId();

/**
 * Helper: Create AI job with specific age
 */
async function createAiJobWithAge(
  tenantId: string,
  userId: string,
  daysOld: number
): Promise<string> {
  const jobId = newId();
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysOld);

  await withTenantContext(pool, tenantId, async (client) => {
    await client.query(
      `INSERT INTO ai_jobs (id, tenant_id, user_id, purpose, status, created_at)
       VALUES ($1, $2, $3, $4, 'COMPLETED', $5)`,
      [jobId, tenantId, userId, `test_${daysOld}d`, createdAt]
    );
  });

  return jobId;
}

/**
 * Helper: Count AI jobs for tenant
 */
async function countAiJobs(tenantId: string): Promise<number> {
  return await withTenantContext(pool, tenantId, async (client) => {
    const result = await client.query(
      "SELECT COUNT(*) FROM ai_jobs WHERE tenant_id = $1",
      [tenantId]
    );
    return parseInt(result.rows[0].count, 10);
  });
}

/**
 * Setup: create test tenant and user (idempotent)
 */
async function setupTestData() {
  // Create tenant (will use the current TENANT_ID)
  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_ID, "retention-test", "Retention Test"]
  );

  // Create user
  await withTenantContext(pool, TENANT_ID, async (client) => {
    await client.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
       VALUES ($1, $2, $3, $4, $5, 'TENANT', 'USER')`,
      [USER_ID, TENANT_ID, "test@retention.com", "Retention Test User", "$2a$10$hash"]
    );
  });
}

/**
 * Cleanup: delete all test data by slug (handles any previous test runs)
 */
async function cleanup() {
  // Get tenant ID by slug (if exists from previous run)
  const existingTenant = await pool.query(
    "SELECT id FROM tenants WHERE slug = $1",
    ["retention-test"]
  );

  if (existingTenant.rows.length > 0) {
    const tenantId = existingTenant.rows[0].id;
    // Use withTenantContext for RLS-compliant cleanup
    await withTenantContext(pool, tenantId, async (client) => {
      await client.query("DELETE FROM ai_jobs WHERE tenant_id = $1", [tenantId]);
      await client.query("DELETE FROM users WHERE tenant_id = $1", [tenantId]);
    });
    await pool.query("DELETE FROM tenants WHERE id = $1", [tenantId]);
  }
}

beforeAll(async () => {
  // Ensure clean state - delete any previous test data by slug
  await cleanup();
  // Create fresh test data
  await setupTestData();
});

afterEach(async () => {
  // Clean ai_jobs between tests to avoid data accumulation (with RLS context)
  await withTenantContext(pool, TENANT_ID, async (client) => {
    await client.query("DELETE FROM ai_jobs WHERE tenant_id = $1", [TENANT_ID]);
  });
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe("Automated Retention Cleanup (Art. 5(1)(e) RGPD)", () => {
  describe("BLOCKER: Automated purge of expired data", () => {
    test("BLOCKER: Data older than retention period is automatically purged", async () => {
      // GIVEN: Default retention policy (90 days for AI jobs)
      const policy = getDefaultRetentionPolicy();
      expect(policy.aiJobsRetentionDays).toBe(90);

      // GIVEN: AI jobs with different ages
      await createAiJobWithAge(TENANT_ID, USER_ID, 100); // Expired (> 90 days)
      await createAiJobWithAge(TENANT_ID, USER_ID, 95); // Expired
      await createAiJobWithAge(TENANT_ID, USER_ID, 50); // Valid (< 90 days)
      await createAiJobWithAge(TENANT_ID, USER_ID, 30); // Valid

      // WHEN: Running automated purge job
      const purgedCount = await purgeAiJobs(TENANT_ID, policy, false);

      // THEN: Expired data should be purged
      expect(purgedCount).toBe(2); // 2 expired jobs

      // THEN: Valid data should remain
      const remaining = await countAiJobs(TENANT_ID);
      expect(remaining).toBe(2); // 2 valid jobs remain
    });

    test("Recent data within retention period is NOT purged", async () => {
      // GIVEN: Only recent AI jobs (within retention, use existing USER_ID)
      await createAiJobWithAge(TENANT_ID, USER_ID, 10); // 10 days old
      await createAiJobWithAge(TENANT_ID, USER_ID, 30); // 30 days old
      await createAiJobWithAge(TENANT_ID, USER_ID, 60); // 60 days old

      const beforeCount = await countAiJobs(TENANT_ID);

      // WHEN: Running purge
      const policy = getDefaultRetentionPolicy();
      const purgedCount = await purgeAiJobs(TENANT_ID, policy, false);

      // THEN: Nothing should be purged
      expect(purgedCount).toBe(0);

      // THEN: All jobs remain
      const afterCount = await countAiJobs(TENANT_ID);
      expect(afterCount).toBe(beforeCount);
    });

    test("Purge job is idempotent (safe to run multiple times)", async () => {
      // GIVEN: Expired AI job (use existing USER_ID)
      await createAiJobWithAge(TENANT_ID, USER_ID, 100);

      const policy = getDefaultRetentionPolicy();

      // WHEN: Running purge first time
      const purged1 = await purgeAiJobs(TENANT_ID, policy, false);
      expect(purged1).toBe(1);

      // WHEN: Running purge second time
      const purged2 = await purgeAiJobs(TENANT_ID, policy, false);

      // THEN: No additional deletions (idempotent)
      expect(purged2).toBe(0);

      // WHEN: Running purge third time
      const purged3 = await purgeAiJobs(TENANT_ID, policy, false);

      // THEN: Still no deletions
      expect(purged3).toBe(0);
    });
  });

  describe("BLOCKER: Retention policy validation", () => {
    test("Retention policy cutoff date is calculated correctly", () => {
      // GIVEN: Retention policy of 90 days
      const policy = getDefaultRetentionPolicy();

      // WHEN: Calculating cutoff date
      const cutoffDate = calculateCutoffDate(policy.aiJobsRetentionDays);

      // THEN: Cutoff should be 90 days ago
      const now = new Date();
      const expected = new Date(now);
      expected.setDate(expected.getDate() - 90);

      // Allow 1 day tolerance for test timing
      const diff = Math.abs(cutoffDate.getTime() - expected.getTime());
      const dayInMs = 24 * 60 * 60 * 1000;

      expect(diff).toBeLessThan(dayInMs);
    });

    test("Custom retention policy can be applied", async () => {
      // Ensure clean state for this test (use cleanup function)
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query("DELETE FROM ai_jobs WHERE tenant_id = $1", [TENANT_ID]);
      });

      // GIVEN: Custom retention policy (30 days instead of 90, use existing USER_ID)
      const customPolicy = {
        ...getDefaultRetentionPolicy(),
        aiJobsRetentionDays: 30,
      };

      // GIVEN: AI jobs 40 days old (expired with custom policy)
      await createAiJobWithAge(TENANT_ID, USER_ID, 40);
      await createAiJobWithAge(TENANT_ID, USER_ID, 20); // Still valid

      const beforeCount = await countAiJobs(TENANT_ID);
      expect(beforeCount).toBe(2); // Should have exactly 2 jobs (fresh start)

      // WHEN: Running purge with custom policy
      const purgedCount = await purgeAiJobs(TENANT_ID, customPolicy, false);

      // THEN: 40-day-old job should be purged (1 job older than 30 days)
      expect(purgedCount).toBe(1);

      // THEN: Only 20-day-old job should remain
      const afterCount = await countAiJobs(TENANT_ID);
      expect(afterCount).toBe(1);
    });

    test("Dry-run mode does NOT delete data", async () => {
      // GIVEN: Expired data (use existing USER_ID)
      await createAiJobWithAge(TENANT_ID, USER_ID, 100);

      const beforeCount = await countAiJobs(TENANT_ID);

      // WHEN: Running purge in dry-run mode
      const policy = getDefaultRetentionPolicy();
      const purgedCount = await purgeAiJobs(TENANT_ID, policy, true); // dryRun = true

      // THEN: No actual deletion
      const afterCount = await countAiJobs(TENANT_ID);
      expect(afterCount).toBe(beforeCount);

      // THEN: Dry run returns count of what WOULD be purged
      expect(purgedCount).toBe(1); // Would purge 1 job
    });
  });

  describe("BLOCKER: Scheduled execution simulation", () => {
    test("Tenant-scoped purge job executes correctly", async () => {
      // GIVEN: Mixed data ages (use existing USER_ID)
      await createAiJobWithAge(TENANT_ID, USER_ID, 100); // Expired
      await createAiJobWithAge(TENANT_ID, USER_ID, 95); // Expired
      await createAiJobWithAge(TENANT_ID, USER_ID, 30); // Valid

      // WHEN: Executing tenant purge job (simulating cron)
      const result = await executeTenantPurgeJob(TENANT_ID);

      // THEN: Expired data should be purged
      expect(result.aiJobsPurged).toBeGreaterThanOrEqual(2);
      expect(result.dryRun).toBe(false);
      expect(result.executedAt).toBeInstanceOf(Date);
    });

    test("Empty tenant (no data) is handled safely", async () => {
      const emptyTenantId = newId();

      // Create empty tenant
      await pool.query(
        "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
        [emptyTenantId, "empty-tenant", "Empty Tenant"]
      );

      try {
        // WHEN: Running purge on empty tenant
        const policy = getDefaultRetentionPolicy();
        const purgedCount = await purgeAiJobs(emptyTenantId, policy, false);

        // THEN: Should succeed with 0 purged
        expect(purgedCount).toBe(0);
      } finally {
        // Cleanup
        await pool.query("DELETE FROM tenants WHERE id = $1", [emptyTenantId]);
      }
    });

    test("Purge does NOT affect other tenants", async () => {
      const otherTenantId = newId();
      const otherUserId = newId();

      // Create other tenant
      await pool.query(
        "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
        [otherTenantId, "other-tenant", "Other Tenant"]
      );

      await withTenantContext(pool, otherTenantId, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, 'TENANT', 'USER')`,
          [otherUserId, otherTenantId, "other@test.com", "Other User", "$2a$10$hash"]
        );
      });

      try {
        // GIVEN: Expired data in both tenants
        await createAiJobWithAge(TENANT_ID, USER_ID, 100); // Main tenant
        await createAiJobWithAge(otherTenantId, otherUserId, 100); // Other tenant

        const beforeOther = await countAiJobs(otherTenantId);

        // WHEN: Purging only main tenant
        const policy = getDefaultRetentionPolicy();
        await purgeAiJobs(TENANT_ID, policy, false);

        // THEN: Other tenant's data should NOT be affected
        const afterOther = await countAiJobs(otherTenantId);
        expect(afterOther).toBe(beforeOther); // Unchanged
      } finally {
        // Cleanup
        await pool.query("DELETE FROM ai_jobs WHERE tenant_id = $1", [otherTenantId]);
        await pool.query("DELETE FROM users WHERE tenant_id = $1", [otherTenantId]);
        await pool.query("DELETE FROM tenants WHERE id = $1", [otherTenantId]);
      }
    });
  });

  describe("Art. 5(1)(e) RGPD Compliance", () => {
    test("BLOCKER: Storage limitation principle is enforced", async () => {
      // Ensure clean state for this test (use cleanup function)
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query("DELETE FROM ai_jobs WHERE tenant_id = $1", [TENANT_ID]);
      });

      // GIVEN: Data kept beyond retention period (use existing USER_ID)
      await createAiJobWithAge(TENANT_ID, USER_ID, 100); // 100 days old

      const beforeCount = await countAiJobs(TENANT_ID);
      expect(beforeCount).toBe(1); // Should have exactly 1 job (fresh start)

      // WHEN: Automated retention enforcement
      const policy = getDefaultRetentionPolicy();
      const purgedCount = await purgeAiJobs(TENANT_ID, policy, false);

      // THEN: Data should be deleted (storage limitation)
      expect(purgedCount).toBe(1); // 1 job purged

      // Verify data was actually purged
      const allJobs = await withTenantContext(pool, TENANT_ID, async (client) => {
        const result = await client.query(
          "SELECT * FROM ai_jobs WHERE tenant_id = $1 AND user_id = $2",
          [TENANT_ID, USER_ID]
        );
        return result.rows;
      });

      expect(allJobs.length).toBe(0); // 100-day-old job should be gone
    });

    test("Retention policy is documented and auditable", () => {
      // GIVEN: Default retention policy
      const policy = getDefaultRetentionPolicy();

      // THEN: Policy should be well-defined
      expect(policy.aiJobsRetentionDays).toBeDefined();
      expect(typeof policy.aiJobsRetentionDays).toBe("number");
      expect(policy.aiJobsRetentionDays).toBeGreaterThan(0);

      // THEN: Policy should be reasonable (not too short, not too long)
      expect(policy.aiJobsRetentionDays).toBeGreaterThanOrEqual(30); // At least 30 days
      expect(policy.aiJobsRetentionDays).toBeLessThanOrEqual(365); // Max 1 year
    });
  });
});
