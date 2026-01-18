/**
 * Opposition Statistics API - RGPD Compliance Monitoring
 * LOT 12.3 - Tenant Admin Dashboard
 *
 * GET /api/tenants/:id/rgpd/oppositions/stats
 * Returns opposition statistics for RGPD compliance dashboard
 *
 * SECURITY: TENANT_ADMIN, DPO, SUPERADMIN only
 * RGPD: Art. 21 (Right to object) - monitors opposition retention
 */

import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';
import { RGPD_OPPOSITION_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';

/**
 * Opposition statistics for RGPD compliance
 */
export interface OppositionStats {
  /** Total number of oppositions */
  totalOppositions: number;
  /** Number of processed oppositions (ACCEPTED/REJECTED) */
  processedOppositions: number;
  /** Number of expired oppositions (processed > 3 years) */
  expiredOppositions: number;
  /** Age of oldest processed opposition in days (null if none) */
  oldestProcessedAge: number | null;
  /** RGPD compliant if no expired oppositions or all purged */
  rgpdCompliant: boolean;
  /** Warning message if non-compliant */
  warning: string | null;
  /** Retention policy in days */
  retentionDays: number;
}

/**
 * GET /api/tenants/:id/rgpd/oppositions/stats
 *
 * Returns:
 * - totalOppositions: total oppositions
 * - processedOppositions: ACCEPTED/REJECTED oppositions
 * - expiredOppositions: processed oppositions older than 3 years
 * - oldestProcessedAge: age of oldest processed opposition
 * - rgpdCompliant: true if no expired oppositions
 * - warning: message if non-compliant
 * - retentionDays: configured retention (1095 days / 3 years)
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
      ['rgpd:oppositions:read'],
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

    // Fetch opposition statistics
    const rgpdRequestRepo = new PgRgpdRequestRepo();
    const stats = await rgpdRequestRepo.getOppositionStats(tenantId);

    // Calculate RGPD compliance
    const rgpdCompliant = stats.expiredCount === 0;
    let warning: string | null = null;

    if (!rgpdCompliant) {
      warning = `${stats.expiredCount} opposition(s) traitée(s) dépasse(nt) la rétention de 3 ans. ` +
        `Purge recommandée pour conformité RGPD (Art. 21).`;
    }

    const response: OppositionStats = {
      totalOppositions: stats.totalCount,
      processedOppositions: stats.processedCount,
      expiredOppositions: stats.expiredCount,
      oldestProcessedAge: stats.oldestProcessedAgeDays,
      rgpdCompliant,
      warning,
      retentionDays: RGPD_OPPOSITION_RETENTION_DAYS,
    };

    // Audit log (RGPD-safe)
    logger.info({
      event: 'rgpd.oppositions.stats_fetched',
      tenantId,
      actorId: authResult.user.id,
      rgpdCompliant,
      expiredCount: stats.expiredCount,
    }, 'Opposition stats fetched for RGPD compliance');

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error({
      event: 'rgpd.oppositions.stats_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/rgpd/oppositions/stats error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
