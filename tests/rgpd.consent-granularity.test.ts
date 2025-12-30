/**
 * rgpd.consent-granularity.test.ts — Test consent granularity by purpose
 *
 * RGPD Compliance:
 * - Art. 7 RGPD: Consent must be specific and granular
 * - Art. 6(1)(a) RGPD: Consent for specific purposes
 * - Prevent blanket consent - user must consent per purpose
 *
 * Gap addressed:
 * - Existing test (rgpd.consent-enforcement.test.ts) validates consent EXISTS
 * - This test validates consent is GRANULAR per purpose (analytics ≠ marketing)
 *
 * Reference: .claude/CONTINUATION_PROMPT_TESTS_COVERAGE.md §5
 *
 * Classification: P1 (technical tests with fictional data)
 */

import { pool } from "@/infrastructure/db/pg";
import { withTenantContext } from "@/infrastructure/db/tenantContext";
import { newId } from "@/shared/ids";

const TENANT_ID = newId();

/**
 * Helper: Grant consent with tenant context (RLS-safe)
 */
async function grantConsentWithContext(
  tenantId: string,
  userId: string,
  purpose: string
) {
  await withTenantContext(pool, tenantId, async (client) => {
    await client.query(
      `INSERT INTO consents (tenant_id, user_id, purpose, granted, granted_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [tenantId, userId, purpose, true]
    );
  });
}

/**
 * Helper: Revoke consent with tenant context (RLS-safe)
 */
async function revokeConsentWithContext(
  tenantId: string,
  userId: string,
  purpose: string
) {
  await withTenantContext(pool, tenantId, async (client) => {
    await client.query(
      `UPDATE consents
       SET granted = false, revoked_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND purpose = $3
       AND id = (
         SELECT id FROM consents
         WHERE tenant_id = $1 AND user_id = $2 AND purpose = $3
         ORDER BY created_at DESC
         LIMIT 1
       )`,
      [tenantId, userId, purpose]
    );
  });
}

/**
 * Helper: Find consent by user and purpose (RLS-safe)
 */
async function findConsentByPurpose(
  tenantId: string,
  userId: string,
  purpose: string
): Promise<{ granted: boolean; revoked_at: Date | null } | null> {
  return await withTenantContext(pool, tenantId, async (client) => {
    const result = await client.query(
      `SELECT granted, revoked_at
       FROM consents
       WHERE tenant_id = $1 AND user_id = $2 AND purpose = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, userId, purpose]
    );

    if (result.rowCount === 0) return null;

    return {
      granted: result.rows[0].granted,
      revoked_at: result.rows[0].revoked_at,
    };
  });
}

/**
 * Helper: Find all consents for a user (RLS-safe)
 */
async function findAllConsents(
  tenantId: string,
  userId: string
): Promise<Array<{ purpose: string; granted: boolean }>> {
  return await withTenantContext(pool, tenantId, async (client) => {
    const result = await client.query(
      `SELECT DISTINCT ON (purpose) purpose, granted
       FROM consents
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY purpose, created_at DESC`,
      [tenantId, userId]
    );

    return result.rows;
  });
}

/**
 * Setup: create test tenant
 */
async function setupTenant() {
  await pool.query("INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)", [
    TENANT_ID,
    "consent-granularity-test",
    "Consent Granularity Test",
  ]);
}

/**
 * Cleanup: delete all test data
 */
async function cleanup() {
  await pool.query("DELETE FROM consents WHERE tenant_id = $1", [TENANT_ID]);
  await pool.query("DELETE FROM tenants WHERE id = $1", [TENANT_ID]);
}

beforeAll(async () => {
  await setupTenant();
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe("RGPD - Consent Granularity by Purpose (Art. 7)", () => {
  describe("BLOCKER: Purpose-specific consent (not blanket)", () => {
    test("BLOCKER: Consent for 'analytics' does NOT grant consent for 'marketing'", async () => {
      const userId = newId();

      // GIVEN: User grants consent for analytics only
      await grantConsentWithContext(TENANT_ID, userId, "analytics");

      // WHEN: Checking consent for analytics
      const analyticsConsent = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "analytics"
      );

      // THEN: Analytics consent is granted
      expect(analyticsConsent).not.toBeNull();
      expect(analyticsConsent!.granted).toBe(true);

      // WHEN: Checking consent for marketing
      const marketingConsent = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "marketing"
      );

      // THEN: Marketing consent is NOT granted (null)
      expect(marketingConsent).toBeNull();

      // This validates Art. 7 RGPD - specific consent per purpose
    });

    test("BLOCKER: Consent for 'marketing' does NOT grant consent for 'ai_processing'", async () => {
      const userId = newId();

      // GIVEN: User grants consent for marketing
      await grantConsentWithContext(TENANT_ID, userId, "marketing");

      // WHEN: Checking marketing consent
      const marketingConsent = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "marketing"
      );

      expect(marketingConsent).not.toBeNull();
      expect(marketingConsent!.granted).toBe(true);

      // WHEN: Checking AI processing consent
      const aiConsent = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "ai_processing"
      );

      // THEN: AI processing consent is NOT granted
      expect(aiConsent).toBeNull();
    });

    test("User can have multiple consents for different purposes", async () => {
      const userId = newId();

      // GIVEN: User grants consent for multiple purposes
      const purposes = ["analytics", "personalization", "notifications"];

      for (const purpose of purposes) {
        await grantConsentWithContext(TENANT_ID, userId, purpose);
      }

      // WHEN: Retrieving all consents
      const allConsents = await findAllConsents(TENANT_ID, userId);

      // THEN: User should have consents for all purposes
      const grantedPurposes = allConsents
        .filter((c) => c.granted)
        .map((c) => c.purpose);

      purposes.forEach((purpose) => {
        expect(grantedPurposes).toContain(purpose);
      });

      expect(grantedPurposes.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("BLOCKER: Revocation is purpose-specific", () => {
    test("BLOCKER: Revoking 'marketing' does NOT revoke 'analytics'", async () => {
      const userId = newId();

      // GIVEN: User has consents for both marketing and analytics
      await grantConsentWithContext(TENANT_ID, userId, "marketing");
      await grantConsentWithContext(TENANT_ID, userId, "analytics");

      // WHEN: User revokes marketing consent
      await revokeConsentWithContext(TENANT_ID, userId, "marketing");

      // THEN: Marketing consent is revoked
      const marketingConsent = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "marketing"
      );

      expect(marketingConsent).not.toBeNull();
      expect(marketingConsent!.granted).toBe(false);
      expect(marketingConsent!.revoked_at).not.toBeNull();

      // THEN: Analytics consent is STILL granted
      const analyticsConsent = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "analytics"
      );

      expect(analyticsConsent).not.toBeNull();
      expect(analyticsConsent!.granted).toBe(true);
      expect(analyticsConsent!.revoked_at).toBeNull();

      // This validates fine-grained consent control
    });

    test("BLOCKER: Revoking one purpose does not affect other purposes", async () => {
      const userId = newId();

      // GIVEN: User has consents for multiple purposes
      const purposes = ["analytics", "marketing", "ai_processing", "personalization"];

      for (const purpose of purposes) {
        await grantConsentWithContext(TENANT_ID, userId, purpose);
      }

      // WHEN: User revokes only 'ai_processing'
      await revokeConsentWithContext(TENANT_ID, userId, "ai_processing");

      // THEN: Only ai_processing is revoked
      const aiConsent = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "ai_processing"
      );
      expect(aiConsent!.granted).toBe(false);

      // THEN: Other purposes are still granted
      const otherPurposes = ["analytics", "marketing", "personalization"];
      for (const purpose of otherPurposes) {
        const consent = await findConsentByPurpose(TENANT_ID, userId, purpose);
        expect(consent).not.toBeNull();
        expect(consent!.granted).toBe(true);
        expect(consent!.revoked_at).toBeNull();
      }
    });

    test("User can selectively revoke and re-grant specific purposes", async () => {
      const userId = newId();

      // GIVEN: User grants consent for analytics
      await grantConsentWithContext(TENANT_ID, userId, "analytics");

      // WHEN: User revokes analytics
      await revokeConsentWithContext(TENANT_ID, userId, "analytics");

      // THEN: Analytics is revoked
      let consent = await findConsentByPurpose(TENANT_ID, userId, "analytics");
      expect(consent!.granted).toBe(false);

      // WHEN: User re-grants analytics
      await grantConsentWithContext(TENANT_ID, userId, "analytics");

      // THEN: Analytics is granted again (latest consent)
      consent = await findConsentByPurpose(TENANT_ID, userId, "analytics");
      expect(consent!.granted).toBe(true);
      expect(consent!.revoked_at).toBeNull();
    });
  });

  describe("BLOCKER: Purpose validation and isolation", () => {
    test("Different purposes are completely isolated", async () => {
      const userId = newId();

      // GIVEN: Various purposes
      const purposesA = ["analytics", "marketing"];
      const purposesB = ["ai_processing", "personalization"];

      // WHEN: Grant consents for group A
      for (const purpose of purposesA) {
        await grantConsentWithContext(TENANT_ID, userId, purpose);
      }

      // THEN: Group A purposes are granted
      for (const purpose of purposesA) {
        const consent = await findConsentByPurpose(TENANT_ID, userId, purpose);
        expect(consent).not.toBeNull();
        expect(consent!.granted).toBe(true);
      }

      // THEN: Group B purposes are NOT granted
      for (const purpose of purposesB) {
        const consent = await findConsentByPurpose(TENANT_ID, userId, purpose);
        expect(consent).toBeNull(); // Never granted
      }
    });

    test("Purpose string is case-sensitive and exact match", async () => {
      const userId = newId();

      // GIVEN: User grants consent for "analytics"
      await grantConsentWithContext(TENANT_ID, userId, "analytics");

      // WHEN: Checking with exact match
      const exactMatch = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "analytics"
      );
      expect(exactMatch).not.toBeNull();
      expect(exactMatch!.granted).toBe(true);

      // WHEN: Checking with different case
      const upperCase = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "ANALYTICS"
      );
      expect(upperCase).toBeNull(); // Case-sensitive, no match

      // WHEN: Checking with variation
      const variation = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "analytics_other"
      );
      expect(variation).toBeNull(); // Exact match required
    });

    test("Empty or invalid purpose is handled safely", async () => {
      const userId = newId();

      // WHEN: Checking consent with empty purpose
      const emptyPurpose = await findConsentByPurpose(TENANT_ID, userId, "");

      // THEN: No consent found (safe behavior)
      expect(emptyPurpose).toBeNull();

      // WHEN: Checking with whitespace
      const whitespacePurpose = await findConsentByPurpose(
        TENANT_ID,
        userId,
        "   "
      );
      expect(whitespacePurpose).toBeNull();
    });
  });

  describe("BLOCKER: Art. 7 RGPD Compliance", () => {
    test("BLOCKER: No blanket consent - each purpose requires explicit consent", async () => {
      const userId = newId();

      // GIVEN: User grants consent for one purpose
      await grantConsentWithContext(TENANT_ID, userId, "analytics");

      // WHEN: Checking other purposes
      const otherPurposes = [
        "marketing",
        "ai_processing",
        "personalization",
        "notifications",
      ];

      // THEN: All other purposes MUST be null (not granted)
      for (const purpose of otherPurposes) {
        const consent = await findConsentByPurpose(TENANT_ID, userId, purpose);
        expect(consent).toBeNull();
      }

      // This validates Art. 7 - consent must be specific
    });

    test("BLOCKER: Granular revocation enables RGPD compliance", async () => {
      const userId = newId();

      // GIVEN: User has consents for multiple purposes
      const purposes = ["analytics", "marketing", "ai_processing"];
      for (const purpose of purposes) {
        await grantConsentWithContext(TENANT_ID, userId, purpose);
      }

      // WHEN: User wants to revoke only marketing (Art. 7 right)
      await revokeConsentWithContext(TENANT_ID, userId, "marketing");

      // THEN: Marketing is revoked
      const marketing = await findConsentByPurpose(TENANT_ID, userId, "marketing");
      expect(marketing!.granted).toBe(false);

      // THEN: Other purposes remain active (user choice preserved)
      const analytics = await findConsentByPurpose(TENANT_ID, userId, "analytics");
      const ai = await findConsentByPurpose(TENANT_ID, userId, "ai_processing");

      expect(analytics!.granted).toBe(true);
      expect(ai!.granted).toBe(true);

      // This enables Art. 7(3) - right to withdraw consent
    });
  });
});
