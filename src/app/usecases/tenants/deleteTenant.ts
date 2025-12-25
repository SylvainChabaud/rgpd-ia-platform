/**
 * Delete Tenant Use Case
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - PLATFORM admin only
 * - Soft delete (cascade to users)
 * - Audit event emitted
 */

import type { TenantRepo } from '@/app/ports/TenantRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import { newId } from '@/shared/ids';

export interface DeleteTenantInput {
  tenantId: string;
  actorId: string; // For audit trail
}

/**
 * Soft delete a tenant (PLATFORM admin only)
 *
 * SECURITY:
 * - PLATFORM scope required (enforced by middleware)
 * - Soft delete (sets deleted_at timestamp)
 * - Cascades soft delete to all tenant users
 *
 * AUDIT:
 * - Event 'tenant.deleted' emitted
 */
export async function deleteTenant(
  input: DeleteTenantInput,
  deps: {
    tenantRepo: TenantRepo;
    auditEventWriter: AuditEventWriter;
  }
): Promise<void> {
  const { tenantId, actorId } = input;
  const { tenantRepo, auditEventWriter } = deps;

  // Verify tenant exists
  const tenant = await tenantRepo.findById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Soft delete tenant (cascade to users)
  await tenantRepo.softDelete(tenantId);

  // Emit audit event (RGPD-safe)
  await auditEventWriter.write({
    id: newId(),
    eventName: 'tenant.deleted',
    actorScope: 'PLATFORM',
    actorId,
    tenantId: undefined, // PLATFORM-scoped event
    targetId: tenantId,
  });
}
