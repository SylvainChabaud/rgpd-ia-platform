import type { ConsentRepo } from "@/app/ports/ConsentRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { randomUUID } from "crypto";
import { ACTOR_SCOPE } from "@/shared/actorScope";

/**
 * Grant consent use-case (opt-in)
 *
 * RGPD compliance:
 * - Consent must be explicit (not implied)
 * - Tenant-scoped isolation enforced
 * - Audit event emitted (P1 data only)
 *
 * LOT 5.0 — Consentement (opt-in / revoke) + enforcement
 */

export type GrantConsentInput = {
  tenantId: string;
  userId: string;
  purpose: string;
};

export async function grantConsent(
  consentRepo: ConsentRepo,
  auditWriter: AuditEventWriter,
  input: GrantConsentInput
): Promise<void> {
  const { tenantId, userId, purpose } = input;

  // Validation: tenantId, userId, purpose required
  if (!tenantId || !userId || !purpose) {
    throw new Error("tenantId, userId and purpose are required");
  }

  // Create consent record
  await consentRepo.create(tenantId, {
    userId,
    purpose,
    granted: true,
    grantedAt: new Date(),
  });

  // Emit audit event (RGPD-safe: P1 data only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: "consent.granted",
    actorScope: ACTOR_SCOPE.TENANT,
    actorId: userId,
    tenantId,
    metadata: {
      purpose,
    },
  });
}
