/**
 * Export Statistics API - RGPD Compliance Monitoring
 * LOT 12.3 - Tenant Admin Dashboard
 *
 * GET /api/tenants/:id/rgpd/exports/stats
 * Returns export statistics for RGPD compliance dashboard
 *
 * SECURITY: TENANT_ADMIN, DPO, SUPERADMIN only
 * RGPD: Art. 5.1.e (Storage limitation) - monitors retention compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';
import { RGPD_EXPORT_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';

/**
 * Export statistics for RGPD compliance
 */
export interface ExportStats {
  /** Total number of exports */
  totalExports: number;
  /** Number of expired exports (> RGPD_EXPORT_RETENTION_DAYS) */
  expiredExports: number;
  /** Age of oldest export in days (null if no exports) */
  oldestExportAge: number | null;
  /** RGPD compliant if no expired exports or all purged */
  rgpdCompliant: boolean;
  /** Warning message if non-compliant */
  warning: string | null;
  /** Retention policy in days */
  retentionDays: number;
}

/**
 * GET /api/tenants/:id/rgpd/exports/stats
 *
 * Returns:
 * - totalExports: number of exports for tenant
 * - expiredExports: exports older than 7 days
 * - oldestExportAge: age of oldest export in days
 * - rgpdCompliant: true if no expired exports
 * - warning: message if non-compliant
 * - retentionDays: configured retention (7 days)
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
      ['rgpd:exports:read'],
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

    // Fetch export statistics
    const rgpdRequestRepo = new PgRgpdRequestRepo();
    const stats = await rgpdRequestRepo.getExportStats(tenantId);

    // Calculate RGPD compliance
    const rgpdCompliant = stats.expiredCount === 0;
    let warning: string | null = null;

    if (!rgpdCompliant) {
      warning = `${stats.expiredCount} export(s) dépasse(nt) la politique de rétention de ${RGPD_EXPORT_RETENTION_DAYS} jours. ` +
        `Purge requise pour conformité RGPD (Art. 5.1.e).`;
    }

    const response: ExportStats = {
      totalExports: stats.totalCount,
      expiredExports: stats.expiredCount,
      oldestExportAge: stats.oldestAgeDays,
      rgpdCompliant,
      warning,
      retentionDays: RGPD_EXPORT_RETENTION_DAYS,
    };

    // Audit log (RGPD-safe)
    logger.info({
      event: 'rgpd.exports.stats_fetched',
      tenantId,
      actorId: authResult.user.id,
      rgpdCompliant,
      expiredCount: stats.expiredCount,
    }, 'Export stats fetched for RGPD compliance');

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error({
      event: 'rgpd.exports.stats_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/rgpd/exports/stats error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
