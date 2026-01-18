/**
 * Opposition Purge API - RGPD Compliance
 * LOT 12.3 - Tenant Admin Dashboard
 *
 * DELETE /api/tenants/:id/rgpd/oppositions/expired
 * Purge expired oppositions (ACCEPTED/REJECTED > 3 years)
 *
 * SECURITY: TENANT_ADMIN, DPO, SUPERADMIN only
 * RGPD: Art. 21 (Right to object) - enforces retention policy
 * AUDIT: Logs purge action with actor ID and count
 *
 * NOTE: Only ACCEPTED/REJECTED oppositions are purged.
 * PENDING oppositions are NEVER purged.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';
import { RGPD_OPPOSITION_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';

/**
 * Purge result
 */
export interface PurgeResult {
  success: boolean;
  /** Number of records purged */
  purgedCount: number;
  /** Retention policy in days */
  retentionDays: number;
  /** Message for UI */
  message: string;
}

/**
 * DELETE /api/tenants/:id/rgpd/oppositions/expired
 *
 * Purges expired oppositions:
 * - Deletes ACCEPTED/REJECTED oppositions older than 3 years
 * - PENDING oppositions are NEVER deleted
 *
 * Returns:
 * - purgedCount: number of records deleted
 * - message: human-readable result
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId } = await params;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // RBAC: Only TENANT_ADMIN, DPO, or SUPERADMIN can purge
    const hasPermission = requirePermission(
      authResult.user,
      ['rgpd:oppositions:delete'],
      { allowedRoles: [ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.DPO, ACTOR_ROLE.SUPERADMIN] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      );
    }

    // CRITICAL: Tenant isolation
    if (
      authResult.user.role === ACTOR_ROLE.TENANT_ADMIN &&
      authResult.user.tenantId !== tenantId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Tenant mismatch' },
        { status: 403 }
      );
    }

    // Get stats before purge (for audit)
    const rgpdRequestRepo = new PgRgpdRequestRepo();
    const statsBefore = await rgpdRequestRepo.getOppositionStats(tenantId);

    // Purge expired oppositions
    const purgedCount = await rgpdRequestRepo.purgeExpiredOppositions(tenantId);

    // Get stats after purge
    const statsAfter = await rgpdRequestRepo.getOppositionStats(tenantId);

    // Build response message
    let message: string;
    if (purgedCount === 0) {
      message = 'Aucune opposition expirée à purger. Conformité RGPD OK.';
    } else {
      message = `Purge RGPD effectuée : ${purgedCount} opposition(s) traitée(s) purgée(s).`;
    }

    // Audit log (RGPD-safe: no sensitive data)
    logger.info({
      event: 'rgpd.oppositions.purged',
      tenantId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      purgedCount,
      statsBefore: {
        totalCount: statsBefore.totalCount,
        expiredCount: statsBefore.expiredCount,
      },
      statsAfter: {
        totalCount: statsAfter.totalCount,
        expiredCount: statsAfter.expiredCount,
      },
    }, 'Expired oppositions purged (RGPD Art. 21 compliance)');

    const response: PurgeResult = {
      success: true,
      purgedCount,
      retentionDays: RGPD_OPPOSITION_RETENTION_DAYS,
      message,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error({
      event: 'rgpd.oppositions.purge_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'DELETE /api/tenants/:id/rgpd/oppositions/expired error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
