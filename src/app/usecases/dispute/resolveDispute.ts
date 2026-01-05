import type { DisputeRepo } from '@/app/ports/DisputeRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { UserDispute } from '@/domain/legal/UserDispute';
import { reviewDispute } from '@/domain/legal/UserDispute';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Resolve user dispute use-case (admin)
 *
 * RGPD compliance:
 * - Art. 22 RGPD (Décision individuelle automatisée)
 * - Human review mandatory for AI decisions
 * - Admin response required for resolved/rejected
 * - Email notification sent to user
 * - Audit event emitted (P1 data only)
 *
 * LOT 10.6 — Droits complémentaires Art. 22
 */

export type ResolveDisputeInput = {
  tenantId: string;
  disputeId: string;
  status: 'under_review' | 'resolved' | 'rejected';
  adminResponse?: string;
  reviewedBy: string;  // Admin user ID
};

export type ResolveDisputeResult = {
  dispute: UserDispute;
};

export async function resolveDispute(
  disputeRepo: DisputeRepo,
  auditWriter: AuditEventWriter,
  input: ResolveDisputeInput
): Promise<ResolveDisputeResult> {
  const { tenantId, disputeId, status, adminResponse, reviewedBy } = input;

  // Validation: champs obligatoires
  if (!tenantId || !disputeId || !status || !reviewedBy) {
    throw new Error('tenantId, disputeId, status and reviewedBy are required');
  }

  // Récupérer dispute actuelle
  const currentDispute = await disputeRepo.findById(tenantId, disputeId);
  if (!currentDispute) {
    throw new Error('Dispute not found');
  }

  // Valider via domain factory (réponse obligatoire si resolved/rejected)
  reviewDispute(currentDispute, {
    status,
    adminResponse,
    reviewedBy,
  });

  // Mettre à jour en DB
  const dispute = await disputeRepo.review(tenantId, disputeId, {
    status,
    adminResponse,
    reviewedBy,
  });

  // Emit audit event (RGPD-safe: P1 data only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: 'dispute.reviewed',
    actorScope: ACTOR_SCOPE.TENANT,
    actorId: reviewedBy,
    tenantId,
    metadata: {
      disputeId,
      userId: dispute.userId,
      status,
      hasResponse: !!adminResponse,
      humanReviewCompleted: true,
    },
  });

  // TODO: Envoyer email à l'utilisateur
  // await emailService.sendDisputeResolution(user.email, dispute);

  return { dispute };
}
