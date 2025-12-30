/**
 * Update Tenant Use Case
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - PLATFORM admin only
 * - Audit event emitted
 */

import type { TenantRepo } from '@/app/ports/TenantRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import { newId } from '@/shared/ids';
import { ACTOR_SCOPE } from '@/shared/actorScope';

export interface UpdateTenantInput {
  tenantId: string;
  name?: string;
  actorId: string; // For audit trail
}

/**
 * Update tenant information (PLATFORM admin only)
 *
 * SECURITY:
 * - PLATFORM scope required (enforced by middleware)
 * - Only name can be updated (slug is immutable)
 *
 * AUDIT:
 * - Event 'tenant.updated' emitted
 */
export async function updateTenant(
  input: UpdateTenantInput,
  deps: {
    tenantRepo: TenantRepo;
    auditEventWriter: AuditEventWriter;
  }
): Promise<void> {
  const { tenantId, name, actorId } = input;
  const { tenantRepo, auditEventWriter } = deps;

  // Verify tenant exists
  const tenant = await tenantRepo.findById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Update tenant
  await tenantRepo.update(tenantId, { name });

  // Emit audit event (RGPD-safe)
  await auditEventWriter.write({
    id: newId(),
    eventName: 'tenant.updated',
    actorScope: ACTOR_SCOPE.PLATFORM,
    actorId,
    tenantId: undefined, // PLATFORM-scoped event
    targetId: tenantId,
  });
}
