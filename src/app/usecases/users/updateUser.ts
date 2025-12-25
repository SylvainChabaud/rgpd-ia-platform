/**
 * Update User Use Case
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Tenant isolation enforced
 * - Only allowed fields can be updated (displayName, role)
 * - Audit event emitted
 */

import type { UserRepo } from '@/app/ports/UserRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import { newId } from '@/shared/ids';

export interface UpdateUserInput {
  tenantId: string;
  userId: string;
  displayName?: string;
  role?: string;
  actorId: string; // For audit trail
}

/**
 * Update user information
 *
 * SECURITY:
 * - Tenant-scoped (verifies user belongs to tenant)
 * - Only displayName and role can be updated
 * - Email and password cannot be updated via this use-case
 *
 * AUDIT:
 * - Event 'user.updated' emitted (P1 only: userId, tenantId, actorId)
 */
export async function updateUser(
  input: UpdateUserInput,
  deps: {
    userRepo: UserRepo;
    auditEventWriter: AuditEventWriter;
  }
): Promise<void> {
  const { tenantId, userId, displayName, role, actorId } = input;
  const { userRepo, auditEventWriter } = deps;

  // Validate tenant ID is provided (RGPD isolation)
  if (!tenantId) {
    throw new Error('RGPD VIOLATION: tenantId required for user updates');
  }

  // Verify user exists and belongs to tenant
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.tenantId !== tenantId) {
    throw new Error('RGPD VIOLATION: Cross-tenant access denied');
  }

  // Update user
  await userRepo.updateUser(userId, { displayName, role });

  // Emit audit event (RGPD-safe)
  await auditEventWriter.write({
    id: newId(),
    eventName: 'user.updated',
    actorScope: 'TENANT',
    actorId,
    tenantId,
    targetId: userId,
  });
}
