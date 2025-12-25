/**
 * LOT 4.1 BLOCKER TESTS: Data purge & retention policy
 *
 * CRITICAL REQUIREMENTS (TASKS.md LOT 4.1):
 * - Purge MUST be idempotent
 * - Purge MUST respect retention policy
 * - Purge MUST NOT delete audit trails
 * - Purge MUST NOT prevent RGPD rights (export/delete)
 *
 * These tests run against REAL database (not mocks)
 */

import { pool } from "@/infrastructure/db/pg";
import {
  executePurgeJob,
  executeTenantPurgeJob,
  purgeAiJobs,
} from "@/app/jobs/purge";
import {
  getDefaultRetentionPolicy,
  validateRetentionPolicy,
  calculateCutoffDate,
} from "@/domain/retention/RetentionPolicy";
import { randomUUID } from "node:crypto";

const TENANT_A_ID = randomUUID();
const TENANT_B_ID = randomUUID();
const USER_A_ID = randomUUID();

/**
 * Setup: create test tenants and test data
 */
async function setupTestData() {
  // Create tenants
  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_A_ID, "test-purge-tenant-a", "Test Purge Tenant A"]
  );
  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_B_ID, "test-purge-tenant-b", "Test Purge Tenant B"]
  );

  // Create AI jobs with different ages (tenant A)
  const now = new Date();
  const old = new Date(now);
  old.setDate(old.getDate() - 100); // 100 days old (> 90 days retention)
  const recent = new Date(now);
  recent.setDate(recent.getDate() - 30); // 30 days old (< 90 days retention)

  // Old AI job (should be purged)
  await pool.query(
    `INSERT INTO ai_jobs (id, tenant_id, user_id, purpose, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), TENANT_A_ID, USER_A_ID, "test_old", "COMPLETED", old]
  );

  // Recent AI job (should NOT be purged)
  await pool.query(
    `INSERT INTO ai_jobs (id, tenant_id, user_id, purpose, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), TENANT_A_ID, USER_A_ID, "test_recent", "COMPLETED", recent]
  );

  // Tenant B AI job (old, but different tenant)
  await pool.query(
    `INSERT INTO ai_jobs (id, tenant_id, user_id, purpose, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), TENANT_B_ID, USER_A_ID, "test_old_b", "COMPLETED", old]
  );
}

/**
 * Cleanup: delete test data
 */
async function cleanup() {
  await pool.query(
    "DELETE FROM ai_jobs WHERE tenant_id IN ($1, $2)",
    [TENANT_A_ID, TENANT_B_ID]
  );
  await pool.query(
    "DELETE FROM tenants WHERE id IN ($1, $2)",
    [TENANT_A_ID, TENANT_B_ID]
  );
}

describe("LOT 4.1 BLOCKER: Retention policy validation", () => {
  test("BLOCKER: default retention policy is valid", () => {
    const policy = getDefaultRetentionPolicy();
    expect(() => validateRetentionPolicy(policy)).not.toThrow();
  });

  test("BLOCKER: retention policy rejects excessive AI jobs retention", () => {
    const policy = getDefaultRetentionPolicy();
    policy.aiJobsRetentionDays = 365; // > 90 days max

    expect(() => validateRetentionPolicy(policy)).toThrow(
      /AI jobs retention exceeds maximum/
    );
  });

  test("BLOCKER: retention policy rejects insufficient audit retention", () => {
    const policy = getDefaultRetentionPolicy();
    policy.auditEventsRetentionDays = 180; // < 365 days min

    expect(() => validateRetentionPolicy(policy)).toThrow(
      /Audit events retention below legal minimum/
    );
  });

  test("BLOCKER: retention policy rejects consents auto-purge", () => {
    const policy = getDefaultRetentionPolicy();
    // @ts-expect-error: testing invalid policy
    policy.consentsRetentionDays = 90;

    expect(() => validateRetentionPolicy(policy)).toThrow(
      /Consents auto-purge forbidden/
    );
  });

  test("cutoff date calculation is correct", () => {
    const retentionDays = 90;
    const cutoff = calculateCutoffDate(retentionDays);
    const expectedCutoff = new Date();
    expectedCutoff.setDate(expectedCutoff.getDate() - retentionDays);

    // Allow 1 second tolerance for test execution time
    const diff = Math.abs(cutoff.getTime() - expectedCutoff.getTime());
    expect(diff).toBeLessThan(1000);
  });
});

describe("LOT 4.1 BLOCKER: Purge job execution", () => {
  beforeAll(async () => {
    await cleanup(); // Ensure clean state
    await setupTestData();
  });

  afterAll(async () => {
    await cleanup();
  });

  test("BLOCKER: purge requires tenantId (RGPD isolation)", async () => {
    const policy = getDefaultRetentionPolicy();

    await expect(
      purgeAiJobs("", policy, false)
    ).rejects.toThrow(/RGPD VIOLATION: tenantId required/);
  });

  test("BLOCKER: purge respects retention policy (only old data purged)", async () => {
    const policy = getDefaultRetentionPolicy();
    policy.aiJobsRetentionDays = 90; // Default

    // Count before purge
    const beforeCount = await pool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM ai_jobs WHERE tenant_id = $1",
      [TENANT_A_ID]
    );
    expect(parseInt(beforeCount.rows[0].count)).toBe(2); // 1 old + 1 recent

    // Execute purge
    const purged = await purgeAiJobs(TENANT_A_ID, policy, false);

    // Should purge 1 old job only
    expect(purged).toBe(1);

    // Verify recent job still exists
    const afterCount = await pool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM ai_jobs WHERE tenant_id = $1",
      [TENANT_A_ID]
    );
    expect(parseInt(afterCount.rows[0].count)).toBe(1); // recent job remains
  });

  test("BLOCKER: purge is tenant-scoped (isolation)", async () => {
    const policy = getDefaultRetentionPolicy();

    // Purge tenant A only
    await purgeAiJobs(TENANT_A_ID, policy, false);

    // Verify tenant B data untouched
    const tenantBCount = await pool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM ai_jobs WHERE tenant_id = $1",
      [TENANT_B_ID]
    );
    expect(parseInt(tenantBCount.rows[0].count)).toBe(1); // still has 1 job
  });

  test("BLOCKER: purge is idempotent (safe to run multiple times)", async () => {
    // Re-setup test data
    await cleanup();
    await setupTestData();

    const policy = getDefaultRetentionPolicy();

    // First purge
    const purged1 = await purgeAiJobs(TENANT_A_ID, policy, false);
    expect(purged1).toBe(1); // 1 old job purged

    // Second purge (should purge 0, since already purged)
    const purged2 = await purgeAiJobs(TENANT_A_ID, policy, false);
    expect(purged2).toBe(0); // idempotent

    // Third purge (still 0)
    const purged3 = await purgeAiJobs(TENANT_A_ID, policy, false);
    expect(purged3).toBe(0); // idempotent
  });

  test("BLOCKER: dry-run mode does NOT delete data", async () => {
    // Re-setup test data
    await cleanup();
    await setupTestData();

    const policy = getDefaultRetentionPolicy();

    // Count before dry run
    const beforeCount = await pool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM ai_jobs WHERE tenant_id = $1",
      [TENANT_A_ID]
    );
    const countBefore = parseInt(beforeCount.rows[0].count);

    // Dry run purge
    const dryRunPurged = await purgeAiJobs(TENANT_A_ID, policy, true);
    expect(dryRunPurged).toBe(1); // would purge 1

    // Count after dry run (should be unchanged)
    const afterCount = await pool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM ai_jobs WHERE tenant_id = $1",
      [TENANT_A_ID]
    );
    const countAfter = parseInt(afterCount.rows[0].count);

    expect(countAfter).toBe(countBefore); // no data deleted
  });

  test("BLOCKER: executeTenantPurgeJob respects tenant isolation", async () => {
    // Re-setup test data
    await cleanup();
    await setupTestData();

    // Execute purge for tenant A only
    const result = await executeTenantPurgeJob(TENANT_A_ID);

    expect(result.aiJobsPurged).toBe(1); // 1 old job purged
    expect(result.dryRun).toBe(false);

    // Verify tenant B untouched
    const tenantBCount = await pool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM ai_jobs WHERE tenant_id = $1",
      [TENANT_B_ID]
    );
    expect(parseInt(tenantBCount.rows[0].count)).toBe(1);
  });

  test("BLOCKER: executePurgeJob purges all tenants", async () => {
    // Re-setup test data
    await cleanup();
    await setupTestData();

    // Execute full purge (all tenants)
    const result = await executePurgeJob();

    // Should purge old jobs from both tenants (2 total)
    expect(result.aiJobsPurged).toBe(2); // 1 from A + 1 from B
    expect(result.dryRun).toBe(false);
  });

  test("BLOCKER: consents are NEVER auto-purged", async () => {
    // Create consent
    await pool.query(
      `INSERT INTO consents (id, tenant_id, user_id, purpose, granted)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), TENANT_A_ID, USER_A_ID, "test_consent", true]
    );

    // Execute purge
    await executePurgeJob();

    // Verify consent still exists (no auto-purge)
    const consentCount = await pool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM consents WHERE tenant_id = $1",
      [TENANT_A_ID]
    );
    expect(parseInt(consentCount.rows[0].count)).toBe(1);

    // Cleanup consent
    await pool.query(
      "DELETE FROM consents WHERE tenant_id = $1",
      [TENANT_A_ID]
    );
  });
});
