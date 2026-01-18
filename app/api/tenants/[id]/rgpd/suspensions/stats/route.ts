/**
 * Suspension Statistics API - RGPD Compliance Monitoring
 * LOT 12.3 - Tenant Admin Dashboard
 *
 * GET /api/tenants/:id/rgpd/suspensions/stats
 * Returns suspension statistics for RGPD compliance dashboard
 *
 * SECURITY: TENANT_ADMIN, DPO, SUPERADMIN only
 * RGPD: Art. 18 (Right to restriction) - monitors suspension retention
 */

import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';
import { RGPD_SUSPENSION_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';

/**
 * Suspension statistics for RGPD compliance
 */
export interface SuspensionStats {
  /** Total number of suspensions */
  totalSuspensions: number;
  /** Number of active suspensions */
  activeSuspensions: number;
  /** Number of lifted suspensions */
  liftedSuspensions: number;
  /** Number of expired suspensions (lifted > 3 years) */
  expiredSuspensions: number;
  /** Age of oldest lifted suspension in days (null if none) */
  oldestLiftedAge: number | null;
  /** RGPD compliant if no expired suspensions or all purged */
  rgpdCompliant: boolean;
  /** Warning message if non-compliant */
  warning: string | null;
  /** Retention policy in days */
  retentionDays: number;
}

/**
 * GET /api/tenants/:id/rgpd/suspensions/stats
 *
 * Returns:
 * - totalSuspensions: total suspensions
 * - activeSuspensions: currently active suspensions
 * - liftedSuspensions: lifted suspensions
 * - expiredSuspensions: lifted suspensions older than 3 years
 * - oldestLiftedAge: age of oldest lifted suspension
 * - rgpdCompliant: true if no expired suspensions
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
      ['rgpd:suspensions:read'],
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

    // Fetch suspension statistics
    const rgpdRequestRepo = new PgRgpdRequestRepo();
    const stats = await rgpdRequestRepo.getSuspensionStats(tenantId);

    // Calculate RGPD compliance
    const rgpdCompliant = stats.expiredCount === 0;
    let warning: string | null = null;

    if (!rgpdCompliant) {
      warning = `${stats.expiredCount} suspension(s) levée(s) dépasse(nt) la rétention de 3 ans. ` +
        `Purge recommandée pour conformité RGPD (Art. 18).`;
    }

    const response: SuspensionStats = {
      totalSuspensions: stats.totalCount,
      activeSuspensions: stats.activeCount,
      liftedSuspensions: stats.liftedCount,
      expiredSuspensions: stats.expiredCount,
      oldestLiftedAge: stats.oldestLiftedAgeDays,
      rgpdCompliant,
      warning,
      retentionDays: RGPD_SUSPENSION_RETENTION_DAYS,
    };

    // Audit log (RGPD-safe)
    logger.info({
      event: 'rgpd.suspensions.stats_fetched',
      tenantId,
      actorId: authResult.user.id,
      rgpdCompliant,
      expiredCount: stats.expiredCount,
    }, 'Suspension stats fetched for RGPD compliance');

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error({
      event: 'rgpd.suspensions.stats_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/rgpd/suspensions/stats error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
