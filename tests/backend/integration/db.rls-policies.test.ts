/**
 * RGPD BLOCKER TESTS: Row-Level Security (RLS) PostgreSQL
 *
 * Requirements:
 * - RLS policies enforce tenant isolation at SQL level (defense in depth)
 * - Cross-tenant access blocked even with direct SQL queries
 * - Tenant context set via `SET LOCAL app.current_tenant_id = '<uuid>'`
 * - Platform context bypasses tenant restrictions
 *
 * Classification: P1 (technical tests, no sensitive data)
 * RGPD Ref: Art. 32 (mesures techniques appropriées)
 * Architecture: BOUNDARIES.md §3 (Database-level isolation)
 *
 * NOTE: These tests create a separate pool with testuser (NOBYPASSRLS) to verify RLS
 */

import { Pool, PoolClient } from "pg";
import { newId } from "@/shared/ids";

// Create RLS test pool with testuser (NOT devuser) to enforce RLS policies
const rlsPool = new Pool({
  connectionString: 'postgresql://testuser:testpass@localhost:5432/rgpd_platform',
});

/**
 * Helper: Execute query with tenant context in a transaction
 *
 * Automatically wraps queries in BEGIN/SET LOCAL/COMMIT with error handling
 */
async function withTenantContextInTest<T>(
  tenantId: string | null,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await rlsPool.connect();
  try {
    await client.query("BEGIN");
    if (tenantId) {
      await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    }
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Test fixtures
const TENANT_A_ID = newId();
const TENANT_B_ID = newId();
const USER_A_ID = newId();
const USER_B_ID = newId();

/**
 * Setup: create test tenants and data
 *
 * NOTE: Tenants table has NO RLS, so we can insert directly
 * For tenant-scoped tables (consents, ai_jobs), we must use tenant context
 */
async function setupTestData() {
  // Cleanup any existing test data first (idempotent setup)
  await cleanup();

  // Create tenants (no RLS on tenants table)
  await rlsPool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_A_ID, "rls-test-tenant-a", "RLS Test Tenant A"]
  );
  await rlsPool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_B_ID, "rls-test-tenant-b", "RLS Test Tenant B"]
  );

  // Create consents for tenant A (with tenant context)
  const clientA = await rlsPool.connect();
  try {
    await clientA.query("BEGIN");
    await clientA.query(`SET LOCAL app.current_tenant_id = '${TENANT_A_ID}'`);
    await clientA.query(
      "INSERT INTO consents (id, tenant_id, user_id, purpose, granted) VALUES ($1, $2, $3, $4, $5)",
      [newId(), TENANT_A_ID, USER_A_ID, "rls-test-consent-a", true]
    );
    await clientA.query(
      "INSERT INTO ai_jobs (id, tenant_id, user_id, purpose, status) VALUES ($1, $2, $3, $4, $5)",
      [newId(), TENANT_A_ID, USER_A_ID, "rls-test-job-a", "PENDING"]
    );
    await clientA.query("COMMIT");
  } catch (error) {
    await clientA.query("ROLLBACK");
    throw error;
  } finally {
    clientA.release();
  }

  // Create consents for tenant B (with tenant context)
  const clientB = await rlsPool.connect();
  try {
    await clientB.query("BEGIN");
    await clientB.query(`SET LOCAL app.current_tenant_id = '${TENANT_B_ID}'`);
    await clientB.query(
      "INSERT INTO consents (id, tenant_id, user_id, purpose, granted) VALUES ($1, $2, $3, $4, $5)",
      [newId(), TENANT_B_ID, USER_B_ID, "rls-test-consent-b", true]
    );
    await clientB.query(
      "INSERT INTO ai_jobs (id, tenant_id, user_id, purpose, status) VALUES ($1, $2, $3, $4, $5)",
      [newId(), TENANT_B_ID, USER_B_ID, "rls-test-job-b", "PENDING"]
    );
    await clientB.query("COMMIT");
  } catch (error) {
    await clientB.query("ROLLBACK");
    throw error;
  } finally {
    clientB.release();
  }
}

/**
 * Cleanup: delete all test data
 *
 * IMPORTANT: Use cleanup_test_data() SQL function (SECURITY DEFINER).
 * This function runs with devuser privileges, bypassing RLS restrictions.
 *
 * We use slugs to find tenant IDs because test tenants might have been created
 * in a previous run with different IDs than the constants.
 */
async function cleanup() {
  // Find all test tenants by slug pattern
  const result = await rlsPool.query(
    "SELECT id FROM tenants WHERE slug LIKE 'rls-test%'"
  );

  if (result.rows.length > 0) {
    const tenantIds = result.rows.map((r) => r.id);
    await rlsPool.query("SELECT cleanup_test_data($1::UUID[])", [tenantIds]);
  }
}

// ============================================
// RLS: CONSENTS ISOLATION
// ============================================

describe("RGPD BLOCKER: RLS policies for consents table", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  afterAll(async () => {
    await cleanup();
  });

  test("BLOCKER: RLS enforces tenant isolation on SELECT (tenant A)", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Query consents
      const result = await client.query("SELECT * FROM consents");

      // Assert: only tenant A consents visible
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every((row) => row.tenant_id === TENANT_A_ID)).toBe(
        true
      );
      expect(result.rows.some((row) => row.tenant_id === TENANT_B_ID)).toBe(
        false
      );
    });
  });

  test("BLOCKER: RLS enforces tenant isolation on SELECT (tenant B)", async () => {
    await withTenantContextInTest(TENANT_B_ID, async (client) => {
      // Query consents
      const result = await client.query("SELECT * FROM consents");

      // Assert: only tenant B consents visible
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every((row) => row.tenant_id === TENANT_B_ID)).toBe(
        true
      );
      expect(result.rows.some((row) => row.tenant_id === TENANT_A_ID)).toBe(
        false
      );
    });
  });

  test("BLOCKER: RLS blocks INSERT into other tenant (cross-tenant write)", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Try to insert consent for tenant B (should fail RLS policy)
      await expect(
        client.query(
          "INSERT INTO consents (id, tenant_id, user_id, purpose, granted) VALUES ($1, $2, $3, $4, $5)",
          [newId(), TENANT_B_ID, USER_B_ID, "attack-cross-tenant", true]
        )
      ).rejects.toThrow(/new row violates row-level security policy/i);
    });
  });

  test("BLOCKER: RLS blocks UPDATE of other tenant rows", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Try to update tenant B consent (should affect 0 rows)
      const result = await client.query(
        "UPDATE consents SET granted = false WHERE tenant_id = $1",
        [TENANT_B_ID]
      );

      // Assert: 0 rows updated (RLS blocked access)
      expect(result.rowCount).toBe(0);
    });
  });

  test("BLOCKER: RLS blocks DELETE of other tenant rows", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Try to delete tenant B consents (should affect 0 rows)
      const result = await client.query(
        "DELETE FROM consents WHERE tenant_id = $1",
        [TENANT_B_ID]
      );

      // Assert: 0 rows deleted (RLS blocked access)
      expect(result.rowCount).toBe(0);
    });
  });

  test("BLOCKER: RLS without tenant context blocks ALL access", async () => {
    await withTenantContextInTest(null, async (client) => {
      // No tenant context set (simulate missing tenant_id)
      const result = await client.query("SELECT * FROM consents");

      // Assert: 0 rows visible (no tenant context = no access)
      expect(result.rows.length).toBe(0);
    });
  });
});

// ============================================
// RLS: AI_JOBS ISOLATION
// ============================================

describe("RGPD BLOCKER: RLS policies for ai_jobs table", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  afterAll(async () => {
    await cleanup();
  });

  test("BLOCKER: RLS enforces tenant isolation on ai_jobs SELECT", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Query AI jobs
      const result = await client.query("SELECT * FROM ai_jobs");

      // Assert: only tenant A jobs visible
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every((row) => row.tenant_id === TENANT_A_ID)).toBe(
        true
      );
    });
  });

  test("BLOCKER: RLS blocks cross-tenant ai_jobs INSERT", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Try to insert job for tenant B
      await expect(
        client.query(
          "INSERT INTO ai_jobs (id, tenant_id, user_id, purpose, status) VALUES ($1, $2, $3, $4, $5)",
          [newId(), TENANT_B_ID, USER_B_ID, "attack-job", "PENDING"]
        )
      ).rejects.toThrow(/new row violates row-level security policy/i);
    });
  });

  test("BLOCKER: RLS blocks cross-tenant ai_jobs UPDATE", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Try to update tenant B jobs
      const result = await client.query(
        "UPDATE ai_jobs SET status = 'COMPLETED' WHERE tenant_id = $1",
        [TENANT_B_ID]
      );

      // Assert: 0 rows updated
      expect(result.rowCount).toBe(0);
    });
  });
});

// ============================================
// RLS: AUDIT_EVENTS ISOLATION
// ============================================

describe("RGPD BLOCKER: RLS policies for audit_events table", () => {
  beforeAll(async () => {
    await setupTestData();

    // Create audit events for both tenants
    await rlsPool.query(
      "INSERT INTO audit_events (id, event_type, actor_id, tenant_id) VALUES ($1, $2, $3, $4)",
      [newId(), "CONSENT_GRANTED", USER_A_ID, TENANT_A_ID]
    );
    await rlsPool.query(
      "INSERT INTO audit_events (id, event_type, actor_id, tenant_id) VALUES ($1, $2, $3, $4)",
      [newId(), "CONSENT_GRANTED", USER_B_ID, TENANT_B_ID]
    );
  });

  afterAll(async () => {
    // Delete audit events first (they reference tenants)
    await rlsPool.query("SELECT cleanup_test_data($1::UUID[])", [
      [TENANT_A_ID, TENANT_B_ID],
    ]);
  });

  test("BLOCKER: RLS enforces tenant isolation on audit_events SELECT", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Query audit events
      const result = await client.query("SELECT * FROM audit_events");

      // Assert: only tenant A events visible
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every((row) => row.tenant_id === TENANT_A_ID)).toBe(
        true
      );
    });
  });

  test("BLOCKER: RLS allows platform context to see all audit events", async () => {
    await withTenantContextInTest(null, async (client) => {
      // No tenant context (platform scope)
      // This simulates platform admin querying all audit events

      const result = await client.query(
        "SELECT * FROM audit_events WHERE tenant_id IN ($1, $2)",
        [TENANT_A_ID, TENANT_B_ID]
      );

      // Assert: platform can see both tenants' events
      expect(result.rows.length).toBeGreaterThanOrEqual(2);
      const tenantIds = result.rows.map((r) => r.tenant_id);
      expect(tenantIds).toContain(TENANT_A_ID);
      expect(tenantIds).toContain(TENANT_B_ID);
    });
  });

  test("BLOCKER: RLS allows INSERT audit events from any context (logging must always work)", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Insert audit event (should succeed)
      const eventId = newId();
      await expect(
        client.query(
          "INSERT INTO audit_events (id, event_type, tenant_id) VALUES ($1, $2, $3)",
          [eventId, "TEST_EVENT", TENANT_A_ID]
        )
      ).resolves.not.toThrow();

      // Cleanup
      await client.query("DELETE FROM audit_events WHERE id = $1", [eventId]);
    });
  });
});

// ============================================
// RLS: RGPD_REQUESTS ISOLATION
// ============================================

describe("RGPD BLOCKER: RLS policies for rgpd_requests table", () => {
  beforeAll(async () => {
    await setupTestData();

    // Create RGPD requests for tenant A (with tenant context)
    const clientA = await rlsPool.connect();
    try {
      await clientA.query("BEGIN");
      await clientA.query(`SET LOCAL app.current_tenant_id = '${TENANT_A_ID}'`);
      await clientA.query(
        "INSERT INTO rgpd_requests (id, tenant_id, user_id, type, status) VALUES ($1, $2, $3, $4, $5)",
        [newId(), TENANT_A_ID, USER_A_ID, "EXPORT", "PENDING"]
      );
      await clientA.query("COMMIT");
    } finally {
      clientA.release();
    }

    // Create RGPD requests for tenant B (with tenant context)
    const clientB = await rlsPool.connect();
    try {
      await clientB.query("BEGIN");
      await clientB.query(`SET LOCAL app.current_tenant_id = '${TENANT_B_ID}'`);
      await clientB.query(
        "INSERT INTO rgpd_requests (id, tenant_id, user_id, type, status) VALUES ($1, $2, $3, $4, $5)",
        [newId(), TENANT_B_ID, USER_B_ID, "DELETE", "PENDING"]
      );
      await clientB.query("COMMIT");
    } finally {
      clientB.release();
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  test("BLOCKER: RLS enforces tenant isolation on rgpd_requests SELECT", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Query RGPD requests
      const result = await client.query("SELECT * FROM rgpd_requests");

      // Assert: only tenant A requests visible
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every((row) => row.tenant_id === TENANT_A_ID)).toBe(
        true
      );
    });
  });

  test("BLOCKER: RLS blocks cross-tenant rgpd_requests INSERT", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Try to insert request for tenant B
      await expect(
        client.query(
          "INSERT INTO rgpd_requests (id, tenant_id, user_id, type, status) VALUES ($1, $2, $3, $4, $5)",
          [newId(), TENANT_B_ID, USER_B_ID, "EXPORT", "PENDING"]
        )
      ).rejects.toThrow(/new row violates row-level security policy/i);
    });
  });
});

// ============================================
// RLS: USERS TABLE (TENANT scope isolation)
// ============================================

describe("RGPD BLOCKER: RLS policies for users table (tenant scope)", () => {
  // Use existing platform user (only one allowed by uniq_platform_superadmin constraint)
  let PLATFORM_USER_ID: string;
  const TENANT_A_USER_ID = newId();
  const TENANT_B_USER_ID = newId();

  beforeAll(async () => {
    await setupTestData();

    // Find existing platform user (required by uniq_platform_superadmin constraint)
    // There can only be ONE platform user in the system
    const platformRes = await rlsPool.query(
      `SELECT id FROM users WHERE scope = 'PLATFORM' LIMIT 1`
    );
    
    if (platformRes.rows.length === 0) {
      // Create platform user if none exists (first run only)
      PLATFORM_USER_ID = newId();
      await rlsPool.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, NULL, $2, $3, $4, 'PLATFORM', 'PLATFORM_ADMIN')`,
        [PLATFORM_USER_ID, "platform-rls-test@test.com", "Platform User", "__HASH__"]
      );
    } else {
      PLATFORM_USER_ID = platformRes.rows[0].id;
    }

    // Create tenant A user (with tenant A context)
    const clientA = await rlsPool.connect();
    try {
      await clientA.query("BEGIN");
      await clientA.query(`SET LOCAL app.current_tenant_id = '${TENANT_A_ID}'`);
      await clientA.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, 'TENANT', 'MEMBER')`,
        [
          TENANT_A_USER_ID,
          TENANT_A_ID,
          "user-a@test.com",
          "User A",
          "__HASH__",
        ]
      );
      await clientA.query("COMMIT");
    } finally {
      clientA.release();
    }

    // Create tenant B user (with tenant B context)
    const clientB = await rlsPool.connect();
    try {
      await clientB.query("BEGIN");
      await clientB.query(`SET LOCAL app.current_tenant_id = '${TENANT_B_ID}'`);
      await clientB.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, 'TENANT', 'MEMBER')`,
        [
          TENANT_B_USER_ID,
          TENANT_B_ID,
          "user-b@test.com",
          "User B",
          "__HASH__",
        ]
      );
      await clientB.query("COMMIT");
    } finally {
      clientB.release();
    }
  });

  afterAll(async () => {
    // Delete test tenant users only (not platform user - it's shared)
    await rlsPool.query("DELETE FROM users WHERE id IN ($1, $2)", [
      TENANT_A_USER_ID,
      TENANT_B_USER_ID,
    ]);
    await cleanup();
  });

  test("BLOCKER: RLS allows tenant A to see platform users + own tenant users", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Query users
      const result = await client.query(
        "SELECT * FROM users WHERE id IN ($1, $2, $3)",
        [PLATFORM_USER_ID, TENANT_A_USER_ID, TENANT_B_USER_ID]
      );

      // Assert: can see platform user + tenant A user (NOT tenant B user)
      const userIds = result.rows.map((r) => r.id);
      expect(userIds).toContain(PLATFORM_USER_ID); // platform user visible
      expect(userIds).toContain(TENANT_A_USER_ID); // own tenant user visible
      expect(userIds).not.toContain(TENANT_B_USER_ID); // other tenant user NOT visible
    });
  });

  test("BLOCKER: RLS blocks cross-tenant user INSERT", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Try to insert user for tenant B
      await expect(
        client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, 'TENANT', 'MEMBER')`,
          [newId(), TENANT_B_ID, "attack@test.com", "Attack User", "__HASH__"]
        )
      ).rejects.toThrow(/new row violates row-level security policy/i);
    });
  });

  test("BLOCKER: RLS blocks cross-tenant user UPDATE", async () => {
    await withTenantContextInTest(TENANT_A_ID, async (client) => {
      // Try to update tenant B user
      const result = await client.query(
        "UPDATE users SET display_name = 'HACKED' WHERE id = $1",
        [TENANT_B_USER_ID]
      );

      // Assert: 0 rows updated
      expect(result.rowCount).toBe(0);
    });
  });
});

// Global cleanup: close pool after ALL tests
afterAll(async () => {
  await rlsPool.end();
});

