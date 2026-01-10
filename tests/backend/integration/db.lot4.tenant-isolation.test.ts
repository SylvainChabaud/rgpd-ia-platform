/**
 * LOT 4.0 BLOCKER TESTS: DB-level tenant isolation
 *
 * Requirements (from TASKS.md LOT 4.0):
 * - Real PostgreSQL database (not in-memory mocks)
 * - Aucune requête DB sans tenantId
 * - Lecture cross-tenant impossible
 * - Écriture cross-tenant impossible
 * - Tentative d'accès sans tenant rejetée
 *
 * Classification: P1 (technical tests, no sensitive data)
 * Uses: DATABASE_URL with automatic cleanup
 */

import { pool } from "@/infrastructure/db/pg";
import { PgConsentRepo } from "@/infrastructure/repositories/PgConsentRepo";
import { PgAiJobRepo } from "@/infrastructure/repositories/PgAiJobRepo";
import { newId } from "@/shared/ids";

// Test fixtures
const TENANT_A_ID = newId();
const TENANT_B_ID = newId();
const USER_A_ID = newId();
const USER_B_ID = newId();

/**
 * Cleanup: delete all test data using SECURITY DEFINER function
 * Handles both new and leftover test data from previous runs
 */
async function cleanup() {
  // First: cleanup by slug pattern (handles old test data with different IDs)
  const existingTenants = await pool.query(
    "SELECT id FROM tenants WHERE slug IN ('test-tenant-a', 'test-tenant-b')"
  );
  if (existingTenants.rows.length > 0) {
    const tenantIds = existingTenants.rows.map((row) => row.id);
    await pool.query("SELECT cleanup_test_data($1::UUID[])", [tenantIds]);
  }
  
  // Second: cleanup by current test IDs (in case slugs already deleted but not tenants)
  await pool.query("SELECT cleanup_test_data($1::UUID[])", [[TENANT_A_ID, TENANT_B_ID]]);
}

/**
 * Setup: create test tenants
 */
async function setupTenants() {
  // Clean first to avoid duplicate slug errors
  await cleanup();
  
  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_A_ID, "test-tenant-a", "Test Tenant A"]
  );

  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_B_ID, "test-tenant-b", "Test Tenant B"]
  );
}

// ============================================
// CONSENTS: Tenant Isolation Tests
// ============================================

describe("LOT 4.0 BLOCKER: Consents tenant isolation", () => {
  const consentRepo = new PgConsentRepo();

  beforeAll(async () => {
    await setupTenants();
  });

  afterAll(async () => {
    await cleanup();
  });

  test("BLOCKER: consent creation requires tenantId", async () => {
    await expect(
      consentRepo.create("", {
        userId: USER_A_ID,
        purpose: "analytics",
        granted: true,
      })
    ).rejects.toThrow("RGPD VIOLATION: tenantId required");
  });

  test("BLOCKER: consent query requires tenantId", async () => {
    await expect(
      consentRepo.findByUserAndPurpose("", USER_A_ID, "analytics")
    ).rejects.toThrow("RGPD VIOLATION: tenantId required");
  });

  test("BLOCKER: cross-tenant consent read returns null (isolation)", async () => {
    // Setup: create consent in tenant A
    await consentRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "test-isolation",
      granted: true,
      grantedAt: new Date(),
    });

    // Attack: try to read with tenant B context
    const result = await consentRepo.findByUserAndPurpose(
      TENANT_B_ID, // wrong tenant!
      USER_A_ID,
      "test-isolation"
    );

    // Assert: isolation enforced
    expect(result).toBeNull();
  });

  test("BLOCKER: findByUser respects tenant isolation", async () => {
    // Setup: create consents in both tenants
    await consentRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "tenant-a-consent",
      granted: true,
    });

    await consentRepo.create(TENANT_B_ID, {
      userId: USER_B_ID,
      purpose: "tenant-b-consent",
      granted: true,
    });

    // Assert: tenant A can only see its own consents
    const consentsA = await consentRepo.findByUser(TENANT_A_ID, USER_A_ID);
    expect(consentsA.length).toBeGreaterThan(0);
    expect(consentsA.every((c) => c.tenantId === TENANT_A_ID)).toBe(true);

    // Assert: tenant B can only see its own consents
    const consentsB = await consentRepo.findByUser(TENANT_B_ID, USER_B_ID);
    expect(consentsB.length).toBeGreaterThan(0);
    expect(consentsB.every((c) => c.tenantId === TENANT_B_ID)).toBe(true);
  });
});

// ============================================
// AI_JOBS: Tenant Isolation Tests
// ============================================

describe("LOT 4.0 BLOCKER: AI jobs tenant isolation", () => {
  const aiJobRepo = new PgAiJobRepo();

  beforeAll(async () => {
    await setupTenants();
  });

  afterAll(async () => {
    await cleanup();
  });

  test("BLOCKER: AI job creation requires tenantId", async () => {
    await expect(
      aiJobRepo.create("", {
        userId: USER_A_ID,
        purpose: "document_analysis",
      })
    ).rejects.toThrow("RGPD VIOLATION: tenantId required");
  });

  test("BLOCKER: AI job query requires tenantId", async () => {
    await expect(aiJobRepo.findById("", "some-job-id")).rejects.toThrow(
      "RGPD VIOLATION: tenantId required"
    );
  });

  test("BLOCKER: AI job creation requires purpose (DB constraint)", async () => {
    await expect(
      aiJobRepo.create(TENANT_A_ID, {
        userId: USER_A_ID,
        purpose: "", // empty purpose!
      })
    ).rejects.toThrow("AI job purpose is required");
  });

  test("BLOCKER: cross-tenant AI job read returns null (isolation)", async () => {
    // Setup: create job in tenant A
    const jobId = await aiJobRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "test-cross-tenant-read",
      modelRef: "llama2:7b",
    });

    // Attack: try to read with tenant B context
    const result = await aiJobRepo.findById(TENANT_B_ID, jobId);

    // Assert: isolation enforced
    expect(result).toBeNull();
  });

  test("BLOCKER: cross-tenant AI job update fails (isolation)", async () => {
    // Setup: create job in tenant A
    const jobId = await aiJobRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "test-cross-tenant-update",
    });

    // Attack: try to update with tenant B context
    await expect(
      aiJobRepo.updateStatus(TENANT_B_ID, jobId, {
        status: "RUNNING",
        startedAt: new Date(),
      })
    ).rejects.toThrow("not found or access denied");
  });

  test("BLOCKER: findByUser respects tenant isolation", async () => {
    // Setup: create jobs in both tenants
    await aiJobRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "tenant-a-job",
    });

    await aiJobRepo.create(TENANT_B_ID, {
      userId: USER_B_ID,
      purpose: "tenant-b-job",
    });

    // Assert: tenant A can only see its own jobs
    const jobsA = await aiJobRepo.findByUser(TENANT_A_ID, USER_A_ID);
    expect(jobsA.length).toBeGreaterThan(0);
    expect(jobsA.every((j) => j.tenantId === TENANT_A_ID)).toBe(true);

    // Assert: tenant B can only see its own jobs
    const jobsB = await aiJobRepo.findByUser(TENANT_B_ID, USER_B_ID);
    expect(jobsB.length).toBeGreaterThan(0);
    expect(jobsB.every((j) => j.tenantId === TENANT_B_ID)).toBe(true);
  });

  test("BLOCKER: AI job does NOT store content (schema validation)", async () => {
    // This test validates that ai_jobs table has NO columns for P3 data
    const schemaResult = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'ai_jobs'`
    );

    const columns = schemaResult.rows.map((r) => r.column_name);

    // Assert: forbidden columns do NOT exist
    expect(columns).not.toContain("prompt");
    expect(columns).not.toContain("prompt_content");
    expect(columns).not.toContain("output");
    expect(columns).not.toContain("output_content");
    expect(columns).not.toContain("response");
    expect(columns).not.toContain("embedding");
    expect(columns).not.toContain("embeddings");

    // Assert: only metadata columns exist
    expect(columns).toContain("id");
    expect(columns).toContain("tenant_id");
    expect(columns).toContain("user_id");
    expect(columns).toContain("purpose");
    expect(columns).toContain("model_ref");
    expect(columns).toContain("status");
    expect(columns).toContain("created_at");
  });
});

// ============================================
// DB-LEVEL: Direct SQL isolation tests
// ============================================

describe("LOT 4.0 BLOCKER: DB-level tenant isolation (raw SQL)", () => {
  beforeAll(async () => {
    await setupTenants();
  });

  afterAll(async () => {
    await cleanup();
  });

  test("BLOCKER: DB constraint prevents ai_jobs without tenant_id", async () => {
    // Try to insert AI job without tenant_id (should fail)
    await expect(
      pool.query(
        "INSERT INTO ai_jobs (id, purpose, status) VALUES ($1, $2, $3)",
        [newId(), "test-no-tenant", "PENDING"]
      )
    ).rejects.toThrow(); // violates NOT NULL or CHECK constraint
  });

  test("BLOCKER: DB constraint prevents consents without tenant_id", async () => {
    // Try to insert consent without tenant_id (should fail)
    await expect(
      pool.query(
        "INSERT INTO consents (id, user_id, purpose, granted) VALUES ($1, $2, $3, $4)",
        [newId(), USER_A_ID, "test-no-tenant", true]
      )
    ).rejects.toThrow(); // violates NOT NULL or CHECK constraint
  });

  test("BLOCKER: DB constraint enforces tenant scope on users", async () => {
    // This test validates the constraint added in migration 002
    // TENANT scope user MUST have tenant_id
    const tenantUserId = newId();

    await expect(
      pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, NULL, $2, $3, $4, 'TENANT', 'MEMBER')`,
        [tenantUserId, "test@test.com", "Test User", "hash"]
      )
    ).rejects.toThrow(); // violates chk_users_tenant_scope

    // PLATFORM scope user MUST NOT have tenant_id (tested in other suites)
  });
});
