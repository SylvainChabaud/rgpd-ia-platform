/**
 * Contest Statistics API - RGPD Compliance Monitoring
 * LOT 12.3 - Tenant Admin Dashboard
 *
 * GET /api/tenants/:id/rgpd/contests/stats
 * Returns AI decision contest statistics for RGPD compliance dashboard
 *
 * SECURITY: TENANT_ADMIN, DPO, SUPERADMIN only
 * RGPD: Art. 22 (Automated decision-making) - monitors contest retention
 */

import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';
import { RGPD_CONTEST_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';

/**
 * Contest statistics for RGPD compliance
 */
export interface ContestStats {
  /** Total number of contests */
  totalContests: number;
  /** Number of resolved contests (RESOLVED/REJECTED) */
  resolvedContests: number;
  /** Number of expired contests (resolved > 90 days) */
  expiredContests: number;
  /** Age of oldest resolved contest in days (null if none) */
  oldestResolvedAge: number | null;
  /** RGPD compliant if no expired contests or all purged */
  rgpdCompliant: boolean;
  /** Warning message if non-compliant */
  warning: string | null;
  /** Retention policy in days */
  retentionDays: number;
}

/**
 * GET /api/tenants/:id/rgpd/contests/stats
 *
 * Returns:
 * - totalContests: total contests
 * - resolvedContests: RESOLVED/REJECTED contests
 * - expiredContests: resolved contests older than 90 days
 * - oldestResolvedAge: age of oldest resolved contest
 * - rgpdCompliant: true if no expired contests
 * - warning: message if non-compliant
 * - retentionDays: configured retention (90 days)
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
      ['rgpd:contests:read'],
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

    // Fetch contest statistics
    const rgpdRequestRepo = new PgRgpdRequestRepo();
    const stats = await rgpdRequestRepo.getContestStats(tenantId);

    // Calculate RGPD compliance
    const rgpdCompliant = stats.expiredCount === 0;
    let warning: string | null = null;

    if (!rgpdCompliant) {
      warning = `${stats.expiredCount} contestation(s) résolue(s) dépasse(nt) la rétention de ${RGPD_CONTEST_RETENTION_DAYS} jours. ` +
        `Purge recommandée pour conformité RGPD (Art. 22).`;
    }

    const response: ContestStats = {
      totalContests: stats.totalCount,
      resolvedContests: stats.resolvedCount,
      expiredContests: stats.expiredCount,
      oldestResolvedAge: stats.oldestResolvedAgeDays,
      rgpdCompliant,
      warning,
      retentionDays: RGPD_CONTEST_RETENTION_DAYS,
    };

    // Audit log (RGPD-safe)
    logger.info({
      event: 'rgpd.contests.stats_fetched',
      tenantId,
      actorId: authResult.user.id,
      rgpdCompliant,
      expiredCount: stats.expiredCount,
    }, 'Contest stats fetched for RGPD compliance');

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error({
      event: 'rgpd.contests.stats_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/rgpd/contests/stats error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
