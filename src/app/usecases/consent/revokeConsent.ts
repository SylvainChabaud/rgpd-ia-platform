import type { ConsentRepo } from "@/app/ports/ConsentRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { randomUUID } from "crypto";
import { ACTOR_SCOPE } from "@/shared/actorScope";

/**
 * Revoke consent use-case
 *
 * RGPD compliance:
 * - Revocation must be immediate and effective
 * - Tenant-scoped isolation enforced
 * - Audit event emitted (P1 data only)
 *
 * LOT 5.0 — Consentement (opt-in / revoke) + enforcement
 * LOT 12.2 — Enhanced with purposeId support for strong purpose-consent link
 */

export type RevokeConsentInput = {
  tenantId: string;
  userId: string;
  purpose: string;
  purposeId?: string; // LOT 12.2: Optional link to purposes table (UUID)
};

export async function revokeConsent(
  consentRepo: ConsentRepo,
  auditWriter: AuditEventWriter,
  input: RevokeConsentInput
): Promise<void> {
  const { tenantId, userId, purpose, purposeId } = input;

  // Validation: tenantId, userId, purpose required
  if (!tenantId || !userId || !purpose) {
    throw new Error("tenantId, userId and purpose are required");
  }

  // Revoke consent (immediate effect)
  // LOT 12.2: Use purposeId for strong link if available
  if (purposeId) {
    await consentRepo.revoke(tenantId, userId, { type: 'purposeId', value: purposeId });
  } else {
    await consentRepo.revoke(tenantId, userId, purpose);
  }

  // Emit audit event (RGPD-safe: P1 data only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: "consent.revoked",
    actorScope: ACTOR_SCOPE.TENANT,
    actorId: userId,
    tenantId,
    metadata: {
      purpose,
      purposeId, // LOT 12.2: Track purposeId in audit for traceability
    },
  });
}
