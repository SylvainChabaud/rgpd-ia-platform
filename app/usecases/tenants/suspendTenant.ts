/**
 * Use Case: Suspend Tenant (US 11.4)
 *
 * Suspend un tenant pour raison admin (impayé, non conforme, fraude)
 * Bloque tous les users du tenant (login impossible)
 *
 * RGPD Compliance:
 * - Audit event créé (tenant.suspended)
 * - Raison obligatoire (traçabilité)
 * - Réversible (unsuspendTenant)
 */

import type { TenantRepo } from '@/app/ports/TenantRepo'
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter'
import { emitAuditEvent } from '@/app/audit/emitAuditEvent'
import { randomUUID } from 'crypto'
import { ACTOR_SCOPE } from '@/shared/actorScope'

export type SuspendTenantInput = {
  tenantId: string
  reason: string
  actorId: string
}

export type SuspendTenantDeps = {
  tenantRepo: TenantRepo
  auditEventWriter: AuditEventWriter
}

/**
 * Suspend un tenant
 *
 * @throws Error si tenant introuvable
 * @throws Error si tenant déjà suspendu
 */
export async function suspendTenant(
  input: SuspendTenantInput,
  deps: SuspendTenantDeps
): Promise<void> {
  // 1. Vérifier que tenant existe
  const tenant = await deps.tenantRepo.getById(input.tenantId)

  if (!tenant) {
    throw new Error('Tenant not found')
  }

  // 2. Vérifier que tenant n'est pas déjà suspendu
  if (tenant.suspendedAt) {
    throw new Error('Tenant is already suspended')
  }

  // 3. Suspendre le tenant
  await deps.tenantRepo.suspend(input.tenantId, {
    reason: input.reason,
    suspendedBy: input.actorId,
  })

  // 4. Créer audit event (RGPD compliance)
  await emitAuditEvent(deps.auditEventWriter, {
    id: randomUUID(),
    eventName: 'tenant.suspended',
    actorScope: ACTOR_SCOPE.PLATFORM,
    actorId: input.actorId,
    tenantId: input.tenantId,
    targetId: input.tenantId,
    metadata: {
      reason: input.reason,
    },
  })
}
