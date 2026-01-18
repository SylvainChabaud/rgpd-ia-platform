/**
 * Export Purge API - RGPD Compliance
 * LOT 12.3 - Tenant Admin Dashboard
 *
 * DELETE /api/tenants/:id/rgpd/exports/expired
 * Purge expired exports (older than 7 days)
 *
 * SECURITY: TENANT_ADMIN, DPO, SUPERADMIN only
 * RGPD: Art. 5.1.e (Storage limitation) - enforces retention policy
 * AUDIT: Logs purge action with actor ID and count
 */

import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';
import { RGPD_EXPORT_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';
import { cleanupExpiredExports } from '@/infrastructure/storage/ExportStorage';

/**
 * Purge result
 */
export interface PurgeResult {
  success: boolean;
  /** Number of database records purged */
  purgedCount: number;
  /** Number of files cleaned up */
  filesCleanedUp: number;
  /** Retention policy in days */
  retentionDays: number;
  /** Message for UI */
  message: string;
}

/**
 * DELETE /api/tenants/:id/rgpd/exports/expired
 *
 * Purges expired exports:
 * 1. Deletes database records older than RGPD_EXPORT_RETENTION_DAYS
 * 2. Cleans up orphaned files in storage
 *
 * Returns:
 * - purgedCount: number of records deleted
 * - filesCleanedUp: number of files deleted
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
      ['rgpd:exports:delete'],
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
    const statsBefore = await rgpdRequestRepo.getExportStats(tenantId);

    // Purge expired exports from database
    const purgedCount = await rgpdRequestRepo.purgeExpiredExports(tenantId);

    // Clean up expired files from storage (in-memory + filesystem)
    const filesCleanedUp = await cleanupExpiredExports();

    // Get stats after purge
    const statsAfter = await rgpdRequestRepo.getExportStats(tenantId);

    // Build response message
    let message: string;
    if (purgedCount === 0 && filesCleanedUp === 0) {
      message = 'Aucun export expiré à purger. Conformité RGPD OK.';
    } else {
      const parts: string[] = [];
      if (purgedCount > 0) {
        parts.push(`${purgedCount} enregistrement(s) purgé(s)`);
      }
      if (filesCleanedUp > 0) {
        parts.push(`${filesCleanedUp} fichier(s) supprimé(s)`);
      }
      message = `Purge RGPD effectuée : ${parts.join(', ')}.`;
    }

    // Audit log (RGPD-safe: no sensitive data)
    logger.info({
      event: 'rgpd.exports.purged',
      tenantId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      purgedCount,
      filesCleanedUp,
      statsBefore: {
        totalCount: statsBefore.totalCount,
        expiredCount: statsBefore.expiredCount,
      },
      statsAfter: {
        totalCount: statsAfter.totalCount,
        expiredCount: statsAfter.expiredCount,
      },
    }, 'Expired exports purged (RGPD Art. 5.1.e compliance)');

    const response: PurgeResult = {
      success: true,
      purgedCount,
      filesCleanedUp,
      retentionDays: RGPD_EXPORT_RETENTION_DAYS,
      message,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error({
      event: 'rgpd.exports.purge_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'DELETE /api/tenants/:id/rgpd/exports/expired error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
