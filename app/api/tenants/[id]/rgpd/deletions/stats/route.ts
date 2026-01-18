/**
 * Deletion Statistics API - RGPD Compliance Monitoring
 * LOT 12.3 - Tenant Admin Dashboard
 *
 * GET /api/tenants/:id/rgpd/deletions/stats
 * Returns deletion request statistics for RGPD compliance dashboard
 *
 * SECURITY: TENANT_ADMIN, DPO, SUPERADMIN only
 * RGPD: Art. 17 (Right to erasure) - monitors deletion request retention
 */

import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';
import { RGPD_DELETION_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';

/**
 * Deletion statistics for RGPD compliance
 */
export interface DeletionStats {
  /** Total number of deletion requests */
  totalDeletions: number;
  /** Number of completed deletion requests */
  completedDeletions: number;
  /** Number of expired deletion requests (completed > 30 days) */
  expiredDeletions: number;
  /** Age of oldest completed request in days (null if none) */
  oldestCompletedAge: number | null;
  /** RGPD compliant if no expired deletions or all purged */
  rgpdCompliant: boolean;
  /** Warning message if non-compliant */
  warning: string | null;
  /** Retention policy in days */
  retentionDays: number;
}

/**
 * GET /api/tenants/:id/rgpd/deletions/stats
 *
 * Returns:
 * - totalDeletions: total deletion requests
 * - completedDeletions: completed deletion requests
 * - expiredDeletions: completed requests older than 30 days
 * - oldestCompletedAge: age of oldest completed request
 * - rgpdCompliant: true if no expired deletions
 * - warning: message if non-compliant
 * - retentionDays: configured retention (30 days)
 */
export async function GET(
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

    // RBAC: Only TENANT_ADMIN, DPO, or SUPERADMIN can access
    const hasPermission = requirePermission(
      authResult.user,
      ['rgpd:deletions:read'],
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

    // Fetch deletion statistics
    const rgpdRequestRepo = new PgRgpdRequestRepo();
    const stats = await rgpdRequestRepo.getDeletionStats(tenantId);

    // Calculate RGPD compliance
    const rgpdCompliant = stats.expiredCount === 0;
    let warning: string | null = null;

    if (!rgpdCompliant) {
      warning = `${stats.expiredCount} demande(s) d'effacement complétée(s) dépasse(nt) la rétention de ${RGPD_DELETION_RETENTION_DAYS} jours. ` +
        `Purge recommandée pour conformité RGPD (Art. 17).`;
    }

    const response: DeletionStats = {
      totalDeletions: stats.totalCount,
      completedDeletions: stats.completedCount,
      expiredDeletions: stats.expiredCount,
      oldestCompletedAge: stats.oldestCompletedAgeDays,
      rgpdCompliant,
      warning,
      retentionDays: RGPD_DELETION_RETENTION_DAYS,
    };

    // Audit log (RGPD-safe)
    logger.info({
      event: 'rgpd.deletions.stats_fetched',
      tenantId,
      actorId: authResult.user.id,
      rgpdCompliant,
      expiredCount: stats.expiredCount,
    }, 'Deletion stats fetched for RGPD compliance');

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error({
      event: 'rgpd.deletions.stats_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/rgpd/deletions/stats error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
