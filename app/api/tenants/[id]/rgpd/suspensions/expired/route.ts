/**
 * Suspension Purge API - RGPD Compliance
 * LOT 12.3 - Tenant Admin Dashboard
 *
 * DELETE /api/tenants/:id/rgpd/suspensions/expired
 * Purge expired suspensions (LIFTED > 3 years)
 *
 * SECURITY: TENANT_ADMIN, DPO, SUPERADMIN only
 * RGPD: Art. 18 (Right to restriction) - enforces retention policy
 * AUDIT: Logs purge action with actor ID and count
 *
 * NOTE: Only LIFTED suspensions are purged.
 * ACTIVE suspensions are NEVER purged (legal obligation).
 */

import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';
import { RGPD_SUSPENSION_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';

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
 * DELETE /api/tenants/:id/rgpd/suspensions/expired
 *
 * Purges expired suspensions:
 * - Deletes LIFTED suspensions older than 3 years
 * - ACTIVE suspensions are NEVER deleted
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
      ['rgpd:suspensions:delete'],
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
    const statsBefore = await rgpdRequestRepo.getSuspensionStats(tenantId);

    // Purge expired suspensions
    const purgedCount = await rgpdRequestRepo.purgeExpiredSuspensions(tenantId);

    // Get stats after purge
    const statsAfter = await rgpdRequestRepo.getSuspensionStats(tenantId);

    // Build response message
    let message: string;
    if (purgedCount === 0) {
      message = 'Aucune suspension expirée à purger. Conformité RGPD OK.';
    } else {
      message = `Purge RGPD effectuée : ${purgedCount} suspension(s) levée(s) purgée(s).`;
    }

    // Audit log (RGPD-safe: no sensitive data)
    logger.info({
      event: 'rgpd.suspensions.purged',
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
    }, 'Expired suspensions purged (RGPD Art. 18 compliance)');

    const response: PurgeResult = {
      success: true,
      purgedCount,
      retentionDays: RGPD_SUSPENSION_RETENTION_DAYS,
      message,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error({
      event: 'rgpd.suspensions.purge_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'DELETE /api/tenants/:id/rgpd/suspensions/expired error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
