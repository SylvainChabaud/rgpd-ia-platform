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
 */

export type RevokeConsentInput = {
  tenantId: string;
  userId: string;
  purpose: string;
};

export async function revokeConsent(
  consentRepo: ConsentRepo,
  auditWriter: AuditEventWriter,
  input: RevokeConsentInput
): Promise<void> {
  const { tenantId, userId, purpose } = input;

  // Validation: tenantId, userId, purpose required
  if (!tenantId || !userId || !purpose) {
    throw new Error("tenantId, userId and purpose are required");
  }

  // Revoke consent (immediate effect)
  await consentRepo.revoke(tenantId, userId, purpose);

  // Emit audit event (RGPD-safe: P1 data only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: "consent.revoked",
    actorScope: ACTOR_SCOPE.TENANT,
    actorId: userId,
    tenantId,
    metadata: {
      purpose,
    },
  });
}
