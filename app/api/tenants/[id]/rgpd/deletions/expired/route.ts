/**
 * Deletion Purge API - RGPD Compliance
 * LOT 12.3 - Tenant Admin Dashboard
 *
 * DELETE /api/tenants/:id/rgpd/deletions/expired
 * Purge expired deletion requests (completed > 30 days)
 *
 * SECURITY: TENANT_ADMIN, DPO, SUPERADMIN only
 * RGPD: Art. 17 (Right to erasure) - enforces retention policy
 * AUDIT: Logs purge action with actor ID and count
 *
 * NOTE: Only COMPLETED deletion requests are purged.
 * PENDING requests are NEVER purged (legal obligation).
 */

import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';
import { RGPD_DELETION_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';

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
 * DELETE /api/tenants/:id/rgpd/deletions/expired
 *
 * Purges expired deletion requests:
 * - Deletes COMPLETED requests older than 30 days
 * - PENDING requests are NEVER deleted
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
      ['rgpd:deletions:delete'],
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
    const statsBefore = await rgpdRequestRepo.getDeletionStats(tenantId);

    // Purge expired deletion requests
    const purgedCount = await rgpdRequestRepo.purgeExpiredDeletions(tenantId);

    // Get stats after purge
    const statsAfter = await rgpdRequestRepo.getDeletionStats(tenantId);

    // Build response message
    let message: string;
    if (purgedCount === 0) {
      message = 'Aucune demande d\'effacement expirée à purger. Conformité RGPD OK.';
    } else {
      message = `Purge RGPD effectuée : ${purgedCount} demande(s) d'effacement complétée(s) purgée(s).`;
    }

    // Audit log (RGPD-safe: no sensitive data)
    logger.info({
      event: 'rgpd.deletions.purged',
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
    }, 'Expired deletion requests purged (RGPD Art. 17 compliance)');

    const response: PurgeResult = {
      success: true,
      purgedCount,
      retentionDays: RGPD_DELETION_RETENTION_DAYS,
      message,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error({
      event: 'rgpd.deletions.purge_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'DELETE /api/tenants/:id/rgpd/deletions/expired error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
