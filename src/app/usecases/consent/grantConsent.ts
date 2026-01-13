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
 * LOT 12.2 — Enhanced with purposeId support for strong purpose-consent link
 */

export type GrantConsentInput = {
  tenantId: string;
  userId: string;
  purpose: string;
  purposeId?: string; // LOT 12.2: Optional link to purposes table (UUID)
};

export async function grantConsent(
  consentRepo: ConsentRepo,
  auditWriter: AuditEventWriter,
  input: GrantConsentInput
): Promise<void> {
  const { tenantId, userId, purpose, purposeId } = input;

  // Validation: tenantId, userId, purpose required
  if (!tenantId || !userId || !purpose) {
    throw new Error("tenantId, userId and purpose are required");
  }

  // Create consent record
  // LOT 12.2: Include purposeId for strong link to purposes table
  await consentRepo.create(tenantId, {
    userId,
    purpose,
    purposeId,
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
      purposeId, // LOT 12.2: Track purposeId in audit for traceability
    },
  });
}
