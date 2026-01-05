import type { OppositionRepo } from '@/app/ports/OppositionRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { UserOpposition, TreatmentType } from '@/domain/legal/UserOpposition';
import { createUserOpposition } from '@/domain/legal/UserOpposition';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Submit user opposition use-case
 *
 * RGPD compliance:
 * - Art. 21 RGPD (Droit d'opposition)
 * - User can object to specific treatments (analytics, marketing, profiling, ai_inference)
 * - SLA: 30 days for admin response (Art. 12.3)
 * - Email notification sent to user (confirmation)
 * - Email notification sent to admin (pending review)
 * - Audit event emitted (P1 data only)
 *
 * LOT 10.6 — Droits complémentaires Art. 21
 */

export type SubmitOppositionInput = {
  tenantId: string;
  userId: string;
  treatmentType: TreatmentType;
  reason: string;
  metadata?: Record<string, unknown>;
};

export type SubmitOppositionResult = {
  opposition: UserOpposition;
};

export async function submitOpposition(
  oppositionRepo: OppositionRepo,
  auditWriter: AuditEventWriter,
  input: SubmitOppositionInput
): Promise<SubmitOppositionResult> {
  const { tenantId, userId, treatmentType, reason, metadata } = input;

  // Validation via domain factory (raison minimale, etc.)
  createUserOpposition({
    tenantId,
    userId,
    treatmentType,
    reason,
    metadata,
  });

  // Créer opposition en DB
  const opposition = await oppositionRepo.create(tenantId, {
    tenantId,
    userId,
    treatmentType,
    reason,
    metadata,
  });

  // Emit audit event (RGPD-safe: P1 data only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: 'opposition.submitted',
    actorScope: ACTOR_SCOPE.TENANT,
    actorId: userId,
    tenantId,
    metadata: {
      oppositionId: opposition.id,
      treatmentType,
      reasonLength: reason.length,
    },
  });

  // TODO: Envoyer emails
  // await emailService.sendOppositionConfirmation(user.email, opposition);
  // await emailService.sendOppositionAdminNotification(opposition);

  return { opposition };
}
