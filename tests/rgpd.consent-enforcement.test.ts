/**
 * LOT 5.0 BLOCKER TESTS: Consent enforcement
 *
 * Requirements (from TASKS.md LOT 5.0):
 * - Consent requis avant tout traitement IA concerné
 * - Révocation effective immédiatement
 * - Traçabilité sans fuite de contenu
 * - Enforcement au niveau Gateway (pas contournable)
 *
 * RGPD_TESTING.md:
 * - Test consentement requis avant traitement
 * - Test révocation immédiate
 * - Test audit events (P1 only)
 * - Test isolation cross-tenant
 *
 * Classification: P1 (technical tests, no sensitive data)
 * Uses: Real PostgreSQL database with cleanup
 */

import { pool } from "@/infrastructure/db/pg";
import { PgConsentRepo } from "@/infrastructure/repositories/PgConsentRepo";
import { InMemoryAuditEventWriter } from "@/app/audit/InMemoryAuditEventWriter";
import { grantConsent } from "@/app/usecases/consent/grantConsent";
import { revokeConsent } from "@/app/usecases/consent/revokeConsent";
import { invokeLLM } from "@/ai/gateway/invokeLLM";
import { ConsentError } from "@/ai/gateway/enforcement/checkConsent";
import { newId } from "@/shared/ids";

// Test fixtures
const TENANT_A_ID = newId();
const TENANT_B_ID = newId();
const USER_A_ID = newId();
const USER_B_ID = newId();
const PURPOSE = "ai_processing";

/**
 * Setup: create test tenants
 */
async function setupTenants() {
  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_A_ID, "consent-test-a", "Consent Test A"]
  );

  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_B_ID, "consent-test-b", "Consent Test B"]
  );
}

/**
 * Cleanup: delete all test data
 */
async function cleanup() {
  await pool.query("DELETE FROM consents WHERE tenant_id IN ($1, $2)", [
    TENANT_A_ID,
    TENANT_B_ID,
  ]);
  await pool.query("DELETE FROM tenants WHERE id IN ($1, $2)", [
    TENANT_A_ID,
    TENANT_B_ID,
  ]);
}

beforeAll(async () => {
  await setupTenants();
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe("LOT 5.0 - Consent Enforcement (RGPD BLOCKER)", () => {
  const consentRepo = new PgConsentRepo();
  const auditWriter = new InMemoryAuditEventWriter();

  test("BLOCKER: AI call rejected without consent", async () => {
    // GIVEN: No consent granted for user
    // WHEN: Attempt AI processing
    // THEN: Must be rejected with ConsentError

    await expect(
      invokeLLM(
        {
          purpose: PURPOSE,
          tenantId: TENANT_A_ID,
          actorId: USER_A_ID,
          policy: "test",
          text: "test input",
        },
        { consentRepo }
      )
    ).rejects.toThrow(ConsentError);

    await expect(
      invokeLLM(
        {
          purpose: PURPOSE,
          tenantId: TENANT_A_ID,
          actorId: USER_A_ID,
          policy: "test",
          text: "test input",
        },
        { consentRepo }
      )
    ).rejects.toThrow(/not granted consent/);
  });

  test("BLOCKER: AI call allowed WITH consent", async () => {
    // GIVEN: User grants consent
    await grantConsent(consentRepo, auditWriter, {
      tenantId: TENANT_A_ID,
      userId: USER_A_ID,
      purpose: PURPOSE,
    });

    // WHEN: Attempt AI processing
    // THEN: Must succeed (stub provider returns test response)
    const result = await invokeLLM(
      {
        purpose: PURPOSE,
        tenantId: TENANT_A_ID,
        actorId: USER_A_ID,
        policy: "test",
        text: "test input",
      },
      { consentRepo }
    );

    expect(result).toBeDefined();
    expect(result.provider).toBe("stub");
  });

  test("BLOCKER: AI call rejected AFTER revoke (immediate effect)", async () => {
    // GIVEN: User previously granted consent (from previous test)
    // AND: User revokes consent
    await revokeConsent(consentRepo, auditWriter, {
      tenantId: TENANT_A_ID,
      userId: USER_A_ID,
      purpose: PURPOSE,
    });

    // WHEN: Attempt AI processing
    // THEN: Must be rejected immediately
    await expect(
      invokeLLM(
        {
          purpose: PURPOSE,
          tenantId: TENANT_A_ID,
          actorId: USER_A_ID,
          policy: "test",
          text: "test input",
        },
        { consentRepo }
      )
    ).rejects.toThrow(ConsentError);

    await expect(
      invokeLLM(
        {
          purpose: PURPOSE,
          tenantId: TENANT_A_ID,
          actorId: USER_A_ID,
          policy: "test",
          text: "test input",
        },
        { consentRepo }
      )
    ).rejects.toThrow(/revoked/);
  });

  test("BLOCKER: Audit events created for consent grant", async () => {
    // GIVEN: Fresh audit writer
    const freshAuditWriter = new InMemoryAuditEventWriter();

    // WHEN: User grants consent
    await grantConsent(consentRepo, freshAuditWriter, {
      tenantId: TENANT_B_ID,
      userId: USER_B_ID,
      purpose: PURPOSE,
    });

    // THEN: Audit event must be present
    const events = freshAuditWriter.events;
    expect(events.length).toBe(1);
    expect(events[0].eventName).toBe("consent.granted");
    expect(events[0].tenantId).toBe(TENANT_B_ID);
    expect(events[0].actorId).toBe(USER_B_ID);
    expect(events[0].metadata?.purpose).toBe(PURPOSE);

    // CRITICAL: No sensitive data in audit event
    expect(events[0]).not.toHaveProperty("content");
    expect(events[0]).not.toHaveProperty("prompt");
    expect(events[0]).not.toHaveProperty("response");
  });

  test("BLOCKER: Audit events created for consent revoke", async () => {
    // GIVEN: Fresh audit writer
    const freshAuditWriter = new InMemoryAuditEventWriter();

    // WHEN: User revokes consent (from previous test)
    await revokeConsent(consentRepo, freshAuditWriter, {
      tenantId: TENANT_B_ID,
      userId: USER_B_ID,
      purpose: PURPOSE,
    });

    // THEN: Audit event must be present
    const events = freshAuditWriter.events;
    expect(events.length).toBe(1);
    expect(events[0].eventName).toBe("consent.revoked");
    expect(events[0].tenantId).toBe(TENANT_B_ID);
    expect(events[0].actorId).toBe(USER_B_ID);
    expect(events[0].metadata?.purpose).toBe(PURPOSE);

    // CRITICAL: No sensitive data in audit event
    expect(events[0]).not.toHaveProperty("content");
    expect(events[0]).not.toHaveProperty("prompt");
    expect(events[0]).not.toHaveProperty("response");
  });

  test("BLOCKER: Cross-tenant consent isolation", async () => {
    // GIVEN: User in Tenant A grants consent
    await grantConsent(consentRepo, auditWriter, {
      tenantId: TENANT_A_ID,
      userId: USER_A_ID,
      purpose: "cross_tenant_test",
    });

    // WHEN: Same user ID in Tenant B attempts AI processing
    // THEN: Must be rejected (different tenant = different consent)
    await expect(
      invokeLLM(
        {
          purpose: "cross_tenant_test",
          tenantId: TENANT_B_ID,
          actorId: USER_A_ID, // Same user ID, different tenant
          policy: "test",
          text: "test input",
        },
        { consentRepo }
      )
    ).rejects.toThrow(ConsentError);
  });

  test("BLOCKER: Consent enforcement at Gateway level (not bypassable)", async () => {
    // GIVEN: User without consent
    const userWithoutConsent = newId();

    // WHEN: Attempt to call invokeLLM directly (bypassing API routes)
    // THEN: Must still be rejected (enforcement at Gateway)
    await expect(
      invokeLLM(
        {
          purpose: "bypass_test",
          tenantId: TENANT_A_ID,
          actorId: userWithoutConsent,
          policy: "test",
          text: "test input",
        },
        { consentRepo }
      )
    ).rejects.toThrow(ConsentError);

    // This proves enforcement is at Gateway level, not just at API Routes level
  });
});
