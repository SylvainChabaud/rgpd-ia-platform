/**
 * Use Case: Unsuspend Tenant (Réactivation)
 *
 * Réactive un tenant suspendu
 * Restaure l'accès pour tous les users du tenant
 *
 * RGPD Compliance:
 * - Audit event créé (tenant.unsuspended)
 * - Traçabilité complète
 */

import type { TenantRepo } from '@/app/ports/TenantRepo'
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter'
import { emitAuditEvent } from '@/app/audit/emitAuditEvent'
import { randomUUID } from 'crypto'
import { ACTOR_SCOPE } from '@/shared/actorScope'

export type UnsuspendTenantInput = {
  tenantId: string
  actorId: string
}

export type UnsuspendTenantDeps = {
  tenantRepo: TenantRepo
  auditEventWriter: AuditEventWriter
}

/**
 * Réactive un tenant suspendu
 *
 * @throws Error si tenant introuvable
 * @throws Error si tenant pas suspendu
 */
export async function unsuspendTenant(
  input: UnsuspendTenantInput,
  deps: UnsuspendTenantDeps
): Promise<void> {
  // 1. Vérifier que tenant existe
  const tenant = await deps.tenantRepo.getById(input.tenantId)

  if (!tenant) {
    throw new Error('Tenant not found')
  }

  // 2. Vérifier que tenant est bien suspendu
  if (!tenant.suspendedAt) {
    throw new Error('Tenant is not suspended')
  }

  // 3. Réactiver le tenant
  await deps.tenantRepo.unsuspend(input.tenantId)

  // 4. Créer audit event (RGPD compliance)
  await emitAuditEvent(deps.auditEventWriter, {
    id: randomUUID(),
    eventName: 'tenant.unsuspended',
    actorScope: ACTOR_SCOPE.PLATFORM,
    actorId: input.actorId,
    tenantId: input.tenantId,
    targetId: input.tenantId,
    metadata: {
      previousReason: tenant.suspensionReason || 'unknown',
    },
  })
}
