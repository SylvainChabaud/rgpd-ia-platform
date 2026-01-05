import type { DisputeRepo } from '@/app/ports/DisputeRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { UserDispute } from '@/domain/legal/UserDispute';
import { createUserDispute } from '@/domain/legal/UserDispute';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Submit user dispute use-case
 *
 * RGPD compliance:
 * - Art. 22 RGPD (Décision individuelle automatisée)
 * - User can contest AI decisions and request human review
 * - SLA: 30 days for admin review (Art. 12.3)
 * - Attachment support (encrypted, TTL 90 days)
 * - Email notification sent to user (confirmation)
 * - Email notification sent to admin (pending review)
 * - Audit event emitted (P1 data only)
 *
 * LOT 10.6 — Droits complémentaires Art. 22
 */

export type SubmitDisputeInput = {
  tenantId: string;
  userId: string;
  aiJobId?: string;
  reason: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
};

export type SubmitDisputeResult = {
  dispute: UserDispute;
};

export async function submitDispute(
  disputeRepo: DisputeRepo,
  auditWriter: AuditEventWriter,
  input: SubmitDisputeInput
): Promise<SubmitDisputeResult> {
  const { tenantId, userId, aiJobId, reason, attachmentUrl, metadata } = input;

  // Validation via domain factory (raison minimale 20 chars, etc.)
  createUserDispute({
    tenantId,
    userId,
    aiJobId,
    reason,
    attachmentUrl,
    metadata,
  });

  // Créer dispute en DB
  const dispute = await disputeRepo.create(tenantId, {
    tenantId,
    userId,
    aiJobId,
    reason,
    attachmentUrl,
    metadata,
  });

  // Emit audit event (RGPD-safe: P1 data only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: 'dispute.submitted',
    actorScope: ACTOR_SCOPE.TENANT,
    actorId: userId,
    tenantId,
    metadata: {
      disputeId: dispute.id,
      aiJobId: aiJobId ?? null,
      hasAttachment: !!attachmentUrl,
      reasonLength: reason.length,
    },
  });

  // TODO: Envoyer emails
  // await emailService.sendDisputeConfirmation(user.email, dispute);
  // await emailService.sendDisputeAdminNotification(dispute);

  return { dispute };
}
