/**
 * Delete User Use Case
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Soft delete (marks deleted_at)
 * - Tenant isolation enforced
 * - Audit event emitted
 */

import type { UserRepo } from '@/app/ports/UserRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import { newId } from '@/shared/ids';
import { ACTOR_SCOPE } from '@/shared/actorScope';

export interface DeleteUserInput {
  tenantId: string;
  userId: string;
  actorId: string; // For audit trail
}

/**
 * Soft delete a user
 *
 * SECURITY:
 * - Tenant-scoped (verifies user belongs to tenant)
 * - Soft delete only (sets deleted_at timestamp)
 * - User data remains until purge job runs (LOT 5.2)
 *
 * AUDIT:
 * - Event 'user.deleted' emitted (P1 only: userId, tenantId, actorId)
 */
export async function deleteUser(
  input: DeleteUserInput,
  deps: {
    userRepo: UserRepo;
    auditEventWriter: AuditEventWriter;
  }
): Promise<void> {
  const { tenantId, userId, actorId } = input;
  const { userRepo, auditEventWriter } = deps;

  // Validate tenant ID is provided (RGPD isolation)
  if (!tenantId) {
    throw new Error('RGPD VIOLATION: tenantId required for user deletion');
  }

  // Verify user exists and belongs to tenant
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.tenantId !== tenantId) {
    throw new Error('RGPD VIOLATION: Cross-tenant access denied');
  }

  // Soft delete user
  await userRepo.softDeleteUser(userId);

  // Emit audit event (RGPD-safe)
  await auditEventWriter.write({
    id: newId(),
    eventName: 'user.deleted',
    actorScope: ACTOR_SCOPE.TENANT,
    actorId,
    tenantId,
    targetId: userId,
  });
}
