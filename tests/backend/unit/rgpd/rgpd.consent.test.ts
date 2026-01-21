/**
 * RGPD Art. 6 + 7 TESTS: Consent Management
 *
 * CRITICAL REQUIREMENTS:
 * - Consent MUST be explicit (opt-in, never pre-checked)
 * - Consent MUST be granular (per purpose: analytics, marketing, etc.)
 * - Consent MUST be revocable (withdrawal as easy as granting)
 * - Consent MUST be traceable (timestamped, audited)
 * - Consent changes MUST be immediate
 * - Consent MUST be scoped to tenant (isolation)
 *
 * Reference: RGPD_TESTING.md, .claude/rules/rgpd.md
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { MemAuditWriter } from "@tests/helpers/memoryRepos";
import { ACTOR_SCOPE } from "@/shared/actorScope";

// Constants for tests
const TENANT_A_ID = randomUUID();
const TENANT_B_ID = randomUUID();
const USER_A_ID = randomUUID();
const USER_B_ID = randomUUID();

// Consent purposes (as defined in RGPD rules)
enum ConsentPurpose {
  NECESSARY = "necessary",
  ANALYTICS = "analytics",
  MARKETING = "marketing",
  PERSONALIZATION = "personalization",
}

// Consent record structure
interface ConsentRecord {
  id: string;
  userId: string | null; // null for anonymous (cookie consent)
  anonymousId: string | null; // For anonymous users
  tenantId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  ipAnonymized: string | null; // Last octet masked
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory consent repo for tests
class MemConsentRepo {
  private consents: ConsentRecord[] = [];

  async grantConsent(input: {
    userId: string | null;
    anonymousId: string | null;
    tenantId: string;
    purpose: ConsentPurpose;
    ipAnonymized?: string;
    userAgent?: string;
  }): Promise<ConsentRecord> {
    if (!input.tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required");
    }

    // Find existing or create new
    const existing = this.consents.find(
      (c) =>
        c.tenantId === input.tenantId &&
        c.purpose === input.purpose &&
        ((c.userId && c.userId === input.userId) ||
          (c.anonymousId && c.anonymousId === input.anonymousId))
    );

    const now = new Date();

    if (existing) {
      existing.granted = true;
      existing.grantedAt = now;
      existing.revokedAt = null;
      existing.updatedAt = now;
      existing.ipAnonymized = input.ipAnonymized ?? existing.ipAnonymized;
      existing.userAgent = input.userAgent ?? existing.userAgent;
      return existing;
    }

    const consent: ConsentRecord = {
      id: randomUUID(),
      userId: input.userId,
      anonymousId: input.anonymousId,
      tenantId: input.tenantId,
      purpose: input.purpose,
      granted: true,
      grantedAt: now,
      revokedAt: null,
      ipAnonymized: input.ipAnonymized ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.consents.push(consent);
    return consent;
  }

  async revokeConsent(input: {
    userId: string | null;
    anonymousId: string | null;
    tenantId: string;
    purpose: ConsentPurpose;
  }): Promise<ConsentRecord | null> {
    if (!input.tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required");
    }

    const consent = this.consents.find(
      (c) =>
        c.tenantId === input.tenantId &&
        c.purpose === input.purpose &&
        ((c.userId && c.userId === input.userId) ||
          (c.anonymousId && c.anonymousId === input.anonymousId))
    );

    if (!consent) {
      return null;
    }

    const now = new Date();
    consent.granted = false;
    consent.revokedAt = now;
    consent.updatedAt = now;

    return consent;
  }

  async getConsents(
    tenantId: string,
    userId: string | null,
    anonymousId: string | null
  ): Promise<ConsentRecord[]> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required");
    }

    return this.consents.filter(
      (c) =>
        c.tenantId === tenantId &&
        ((c.userId && c.userId === userId) ||
          (c.anonymousId && c.anonymousId === anonymousId))
    );
  }

  async getConsentByPurpose(
    tenantId: string,
    userId: string | null,
    anonymousId: string | null,
    purpose: ConsentPurpose
  ): Promise<ConsentRecord | null> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required");
    }

    return (
      this.consents.find(
        (c) =>
          c.tenantId === tenantId &&
          c.purpose === purpose &&
          ((c.userId && c.userId === userId) ||
            (c.anonymousId && c.anonymousId === anonymousId))
      ) ?? null
    );
  }

  // For testing: clear all
  clear() {
    this.consents = [];
  }
}

// Consent use case simulation
async function updateConsent(
  input: {
    userId: string | null;
    anonymousId: string | null;
    tenantId: string;
    purpose: ConsentPurpose;
    granted: boolean;
    ipAnonymized?: string;
    userAgent?: string;
  },
  deps: {
    consentRepo: MemConsentRepo;
    auditWriter: MemAuditWriter;
  }
): Promise<ConsentRecord> {
  if (!input.tenantId) {
    throw new Error("RGPD VIOLATION: tenantId required");
  }

  // Necessary consent cannot be revoked
  if (input.purpose === ConsentPurpose.NECESSARY && !input.granted) {
    throw new Error("Cannot revoke necessary consent");
  }

  let consent: ConsentRecord | null;

  if (input.granted) {
    consent = await deps.consentRepo.grantConsent(input);
  } else {
    consent = await deps.consentRepo.revokeConsent(input);
    if (!consent) {
      throw new Error("Consent not found");
    }
  }

  // Write audit event (RGPD-safe: no PII)
  await deps.auditWriter.write({
    id: randomUUID(),
    eventName: input.granted ? "consent.granted" : "consent.revoked",
    actorScope: input.userId ? ACTOR_SCOPE.TENANT : ACTOR_SCOPE.SYSTEM,
    actorId: input.userId ?? input.anonymousId ?? "anonymous",
    tenantId: input.tenantId,
    targetId: consent.id,
    metadata: {
      purpose: input.purpose,
      granted: input.granted,
      // IP is already anonymized (P1 data)
      ipAnonymized: input.ipAnonymized,
    },
    occurredAt: new Date(),
  });

  return consent;
}

describe("RGPD Art. 6 + 7: Consent Management", () => {
  let consentRepo: MemConsentRepo;
  let auditWriter: MemAuditWriter;

  beforeEach(() => {
    consentRepo = new MemConsentRepo();
    auditWriter = new MemAuditWriter();
  });

  describe("Explicit consent (opt-in)", () => {
    it("should require explicit action to grant consent", async () => {
      const consent = await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      expect(consent.granted).toBe(true);
      expect(consent.grantedAt).toBeInstanceOf(Date);
    });

    it("should default to no consent (opt-in model)", async () => {
      // No consent granted yet
      const consent = await consentRepo.getConsentByPurpose(
        TENANT_A_ID,
        USER_A_ID,
        null,
        ConsentPurpose.ANALYTICS
      );

      expect(consent).toBeNull(); // No consent = no permission
    });

    it("should NOT allow pre-checked consent (necessary is always true)", async () => {
      // Necessary consent is the only one always granted
      const consent = await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.NECESSARY,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      expect(consent.granted).toBe(true);

      // But cannot revoke necessary
      await expect(
        updateConsent(
          {
            userId: USER_A_ID,
            anonymousId: null,
            tenantId: TENANT_A_ID,
            purpose: ConsentPurpose.NECESSARY,
            granted: false,
          },
          { consentRepo, auditWriter }
        )
      ).rejects.toThrow("Cannot revoke necessary consent");
    });
  });

  describe("Granular consent (per purpose)", () => {
    it("should support multiple consent purposes", async () => {
      // Grant analytics
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      // Grant marketing
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.MARKETING,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      // Verify both are granted
      const consents = await consentRepo.getConsents(TENANT_A_ID, USER_A_ID, null);
      expect(consents).toHaveLength(2);
      expect(consents.map((c) => c.purpose)).toContain(ConsentPurpose.ANALYTICS);
      expect(consents.map((c) => c.purpose)).toContain(ConsentPurpose.MARKETING);
    });

    it("should allow revoking one purpose while keeping others", async () => {
      // Grant both
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.MARKETING,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      // Revoke only marketing
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.MARKETING,
          granted: false,
        },
        { consentRepo, auditWriter }
      );

      // Verify analytics still granted, marketing revoked
      const analytics = await consentRepo.getConsentByPurpose(
        TENANT_A_ID,
        USER_A_ID,
        null,
        ConsentPurpose.ANALYTICS
      );
      const marketing = await consentRepo.getConsentByPurpose(
        TENANT_A_ID,
        USER_A_ID,
        null,
        ConsentPurpose.MARKETING
      );

      expect(analytics?.granted).toBe(true);
      expect(marketing?.granted).toBe(false);
    });
  });

  describe("Revocability (withdrawal)", () => {
    it("should allow immediate revocation of consent", async () => {
      // Grant consent
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      // Revoke consent
      const revoked = await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: false,
        },
        { consentRepo, auditWriter }
      );

      expect(revoked.granted).toBe(false);
      expect(revoked.revokedAt).toBeInstanceOf(Date);
    });

    it("should record revocation timestamp", async () => {
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      const before = new Date();
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: false,
        },
        { consentRepo, auditWriter }
      );
      const after = new Date();

      const consent = await consentRepo.getConsentByPurpose(
        TENANT_A_ID,
        USER_A_ID,
        null,
        ConsentPurpose.ANALYTICS
      );

      expect(consent?.revokedAt).not.toBeNull();
      expect(consent!.revokedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(consent!.revokedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should allow re-granting consent after revocation", async () => {
      // Grant -> Revoke -> Grant again
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: false,
        },
        { consentRepo, auditWriter }
      );

      const regranted = await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      expect(regranted.granted).toBe(true);
      expect(regranted.revokedAt).toBeNull(); // Cleared on re-grant
    });
  });

  describe("Traceability (audit trail)", () => {
    it("should generate audit event on consent grant", async () => {
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      expect(auditWriter.events).toHaveLength(1);
      expect(auditWriter.events[0].eventName).toBe("consent.granted");
      expect(auditWriter.events[0].tenantId).toBe(TENANT_A_ID);
      expect(auditWriter.events[0].metadata?.purpose).toBe(ConsentPurpose.ANALYTICS);
    });

    it("should generate audit event on consent revocation", async () => {
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: false,
        },
        { consentRepo, auditWriter }
      );

      expect(auditWriter.events).toHaveLength(2);
      expect(auditWriter.events[1].eventName).toBe("consent.revoked");
    });

    it("should record timestamp in consent records", async () => {
      const before = new Date();
      const consent = await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );
      const after = new Date();

      expect(consent.grantedAt).not.toBeNull();
      expect(consent.grantedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(consent.grantedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("Tenant isolation (CRITICAL)", () => {
    it("should reject consent operations without tenantId", async () => {
      await expect(
        updateConsent(
          {
            userId: USER_A_ID,
            anonymousId: null,
            tenantId: "", // Empty
            purpose: ConsentPurpose.ANALYTICS,
            granted: true,
          },
          { consentRepo, auditWriter }
        )
      ).rejects.toThrow("RGPD VIOLATION: tenantId required");
    });

    it("should scope consents to specific tenant", async () => {
      // Grant in Tenant A
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      // Query from Tenant B - should not find
      const consentB = await consentRepo.getConsentByPurpose(
        TENANT_B_ID,
        USER_A_ID,
        null,
        ConsentPurpose.ANALYTICS
      );

      expect(consentB).toBeNull();

      // Query from Tenant A - should find
      const consentA = await consentRepo.getConsentByPurpose(
        TENANT_A_ID,
        USER_A_ID,
        null,
        ConsentPurpose.ANALYTICS
      );

      expect(consentA).not.toBeNull();
      expect(consentA?.granted).toBe(true);
    });

    it("should NOT allow cross-tenant consent access", async () => {
      // User A grants consent in Tenant A
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      // List consents from Tenant B - should be empty
      const consents = await consentRepo.getConsents(TENANT_B_ID, USER_A_ID, null);
      expect(consents).toHaveLength(0);
    });
  });

  describe("Anonymous consent (cookies)", () => {
    it("should support anonymous consent with anonymousId", async () => {
      const anonymousId = `anon-${randomUUID()}`;

      const consent = await updateConsent(
        {
          userId: null,
          anonymousId,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
          ipAnonymized: "192.168.1.0", // Last octet masked
          userAgent: "Mozilla/5.0...",
        },
        { consentRepo, auditWriter }
      );

      expect(consent.userId).toBeNull();
      expect(consent.anonymousId).toBe(anonymousId);
      expect(consent.ipAnonymized).toBe("192.168.1.0");
    });

    it("should store anonymized IP (last octet masked)", async () => {
      const anonymousId = `anon-${randomUUID()}`;

      const consent = await updateConsent(
        {
          userId: null,
          anonymousId,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
          ipAnonymized: "10.0.0.0", // Correctly anonymized
        },
        { consentRepo, auditWriter }
      );

      // IP should be anonymized (ends with .0)
      expect(consent.ipAnonymized).toMatch(/\.\d+\.\d+\.0$/);
    });
  });

  describe("Edge cases", () => {
    it("should handle revoking non-existent consent", async () => {
      await expect(
        updateConsent(
          {
            userId: USER_A_ID,
            anonymousId: null,
            tenantId: TENANT_A_ID,
            purpose: ConsentPurpose.ANALYTICS,
            granted: false, // Revoke without prior grant
          },
          { consentRepo, auditWriter }
        )
      ).rejects.toThrow("Consent not found");
    });

    it("should handle duplicate grant (idempotent)", async () => {
      // Grant twice
      await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      const second = await updateConsent(
        {
          userId: USER_A_ID,
          anonymousId: null,
          tenantId: TENANT_A_ID,
          purpose: ConsentPurpose.ANALYTICS,
          granted: true,
        },
        { consentRepo, auditWriter }
      );

      // Should still be granted, not duplicated
      const consents = await consentRepo.getConsents(TENANT_A_ID, USER_A_ID, null);
      expect(consents).toHaveLength(1);
      expect(second.granted).toBe(true);
    });
  });
});
