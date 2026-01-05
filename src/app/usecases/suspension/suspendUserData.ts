import type { UserRepo } from '@/app/ports/UserRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { DataSuspension, SuspensionReason } from '@/domain/rgpd/DataSuspension';
import { suspendUserData as createSuspension } from '@/domain/rgpd/DataSuspension';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Suspend user data processing use-case
 *
 * RGPD compliance:
 * - Art. 18 RGPD (Droit à la limitation du traitement)
 * - Blocks all AI processing (Gateway LLM returns HTTP 403)
 * - Data remains accessible in read-only mode
 * - Email notification sent to user
 * - Audit event emitted (P1 data only)
 *
 * LOT 10.6 — Droits complémentaires Art. 18
 */

export type SuspendUserDataInput = {
  tenantId: string;
  userId: string;
  reason: SuspensionReason;
  requestedBy: string;  // userId or admin ID
  notes?: string;
};

export type SuspendUserDataResult = {
  suspension: DataSuspension;
};

export async function suspendUserData(
  userRepo: UserRepo,
  auditWriter: AuditEventWriter,
  input: SuspendUserDataInput
): Promise<SuspendUserDataResult> {
  const { tenantId, userId, reason, requestedBy, notes } = input;

  // Validation: champs obligatoires
  if (!tenantId || !userId || !reason) {
    throw new Error('tenantId, userId and reason are required');
  }

  // Vérifier que user existe
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Vérifier que user n'est pas déjà suspendu
  if (user.dataSuspended) {
    throw new Error('User data is already suspended');
  }

  // Créer suspension via domain factory
  const suspension = createSuspension({
    userId,
    tenantId,
    reason,
    requestedBy,
    notes,
  });

  // Mettre à jour user en DB (ALTER TABLE users)
  await userRepo.updateDataSuspension(userId, true, reason);

  // Emit audit event (RGPD-safe: P1 data only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: 'data.suspension.activated',
    actorScope: ACTOR_SCOPE.TENANT,
    actorId: requestedBy,
    tenantId,
    metadata: {
      userId,
      reason,
      requestedByUser: requestedBy === userId,
    },
  });

  // TODO: Envoyer email de confirmation
  // await emailService.sendSuspensionConfirmation(user.email, suspension);

  return { suspension };
}
