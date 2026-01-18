import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgOppositionRepo } from '@/infrastructure/repositories/PgOppositionRepo';
import { PgDisputeRepo } from '@/infrastructure/repositories/PgDisputeRepo';
import { OPPOSITION_STATUS } from '@/domain/legal/UserOpposition';
import { DISPUTE_STATUS } from '@/domain/legal/UserDispute';
import { logger } from '@/infrastructure/logging/logger';

/**
 * GET /api/tenants/:id/rgpd/stats
 * LOT 12.3 - Tenant Admin: RGPD statistics for KPI widgets
 *
 * RGPD compliance:
 * - Tenant isolation enforced
 * - P1 aggregated data only (counts)
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
      ['rgpd:stats:read'],
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

    // Fetch stats from repositories
    const rgpdRequestRepo = new PgRgpdRequestRepo();
    const userRepo = new PgUserRepo();
    const oppositionRepo = new PgOppositionRepo();
    const disputeRepo = new PgDisputeRepo();

    // Get RGPD request counts
    const requestCounts = await rgpdRequestRepo.countByTenant(tenantId);

    // Get suspensions count (from suspended users)
    const suspendedUsers = await userRepo.listSuspendedByTenant(tenantId);
    const activeSuspensions = suspendedUsers.length;

    // Get oppositions count
    const oppositions = await oppositionRepo.findByTenant(tenantId);
    const pendingOppositions = oppositions.filter(o => o.status === OPPOSITION_STATUS.PENDING).length;
    const reviewedOppositions = oppositions.filter(o => o.status !== OPPOSITION_STATUS.PENDING).length;

    // Get contests count
    const contests = await disputeRepo.findByTenant(tenantId);
    const pendingContests = contests.filter(c => c.status === DISPUTE_STATUS.PENDING).length;
    const resolvedContests = contests.filter(c => c.status === DISPUTE_STATUS.RESOLVED).length;

    // Log audit event
    logger.info({
      event: 'rgpd.stats.viewed',
      tenantId,
      actorId: authResult.user.id,
    }, 'Tenant admin viewed RGPD stats');

    return NextResponse.json(
      {
        stats: {
          exports: requestCounts.exports,
          deletions: requestCounts.deletions,
          suspensions: {
            active: activeSuspensions,
            total: activeSuspensions,
          },
          oppositions: {
            pending: pendingOppositions,
            reviewed: reviewedOppositions,
            total: oppositions.length,
          },
          contests: {
            pending: pendingContests,
            resolved: resolvedContests,
            total: contests.length,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'rgpd.stats.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/rgpd/stats error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
