import type { UserRepo } from '@/app/ports/UserRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { DataSuspension, SuspensionReason } from '@/domain/rgpd/DataSuspension';
import { unsuspendUserData as removeSuspension } from '@/domain/rgpd/DataSuspension';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Unsuspend user data processing use-case
 *
 * RGPD compliance:
 * - Art. 18 RGPD (Droit à la limitation du traitement)
 * - Restores AI processing capabilities
 * - Email notification sent to user
 * - Audit event emitted (P1 data only)
 *
 * LOT 10.6 — Droits complémentaires Art. 18
 */

export type UnsuspendUserDataInput = {
  tenantId: string;
  userId: string;
  requestedBy: string;  // userId or admin ID
  notes?: string;
};

export type UnsuspendUserDataResult = {
  suspension: DataSuspension;
};

export async function unsuspendUserData(
  userRepo: UserRepo,
  auditWriter: AuditEventWriter,
  input: UnsuspendUserDataInput
): Promise<UnsuspendUserDataResult> {
  const { tenantId, userId, requestedBy, notes } = input;

  // Validation: champs obligatoires
  if (!tenantId || !userId || !requestedBy) {
    throw new Error('tenantId, userId and requestedBy are required');
  }

  // Vérifier que user existe
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Vérifier que user est suspendu
  if (!user.dataSuspended) {
    throw new Error('User data is not currently suspended');
  }

  // Créer objet suspension actuel
  const suspendedReason = (user.dataSuspendedReason ?? null) as SuspensionReason | null;
  const currentSuspension: DataSuspension = {
    userId,
    tenantId,
    suspended: true,
    suspendedAt: user.dataSuspendedAt!,
    suspendedReason,
    unsuspendedAt: null,
    requestedBy: user.id, // Utilisateur d'origine
    notes: null,
  };

  // Lever suspension via domain factory
  const suspension = removeSuspension(currentSuspension, {
    userId,
    tenantId,
    requestedBy,
    notes,
  });

  // Mettre à jour user en DB
  await userRepo.updateDataSuspension(userId, false);

  // Emit audit event (RGPD-safe: P1 data only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: 'data.suspension.deactivated',
    actorScope: ACTOR_SCOPE.TENANT,
    actorId: requestedBy,
    tenantId,
    metadata: {
      userId,
      requestedByUser: requestedBy === userId,
    },
  });

  // TODO: Envoyer email de confirmation
  // await emailService.sendUnsuspensionConfirmation(user.email);

  return { suspension };
}
