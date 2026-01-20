import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgDpiaHistoryRepo } from '@/infrastructure/repositories/PgDpiaHistoryRepo';
import { logger } from '@/infrastructure/logging/logger';

/**
 * GET /api/tenants/:id/dpia/:dpiaId/history
 * LOT 12.4 - Get DPIA workflow history
 *
 * RGPD compliance:
 * - Art. 5.2: Accountability - all decisions are traceable
 * - Art. 35: DPIA documentation requirements
 * - Tenant isolation enforced
 *
 * Access:
 * - DPO: Can view history for their tenant's DPIAs
 * - TENANT_ADMIN: Can view history for their tenant's DPIAs
 * - SUPERADMIN: Can view history for all DPIAs (platform-wide access)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dpiaId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId, dpiaId } = await params;
    if (!tenantId || !dpiaId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // RBAC: DPO, TENANT_ADMIN, or SUPERADMIN
    const hasPermission = requirePermission(
      authResult.user,
      ['dpia:read'],
      { allowedRoles: [ACTOR_ROLE.DPO, ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.SUPERADMIN] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: DPO, Tenant Admin or Platform Admin role required' },
        { status: 403 }
      );
    }

    const historyRepo = new PgDpiaHistoryRepo();
    let history;

    // SUPERADMIN can access all tenants
    if (authResult.user.role === ACTOR_ROLE.SUPERADMIN) {
      history = await historyRepo.findByDpiaIdPlatform(dpiaId);
    } else {
      // CRITICAL: Tenant isolation for DPO and TENANT_ADMIN
      if (authResult.user.tenantId !== tenantId) {
        return NextResponse.json(
          { error: 'Forbidden: Tenant mismatch' },
          { status: 403 }
        );
      }
      history = await historyRepo.findByDpiaId(tenantId, dpiaId);
    }

    // Audit log (P1 data only)
    logger.info({
      event: 'dpia.history.viewed',
      tenantId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      dpiaId,
      historyCount: history.length,
    }, 'DPIA history viewed');

    return NextResponse.json(
      {
        history: history.map((entry) => ({
          id: entry.id,
          dpiaId: entry.dpiaId,
          action: entry.action,
          actorId: entry.actorId,
          actorRole: entry.actorRole,
          actorDisplayName: entry.actorDisplayName || null,
          comments: entry.comments,
          rejectionReason: entry.rejectionReason,
          createdAt: entry.createdAt.toISOString(),
        })),
        total: history.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'dpia.history.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/dpia/:dpiaId/history error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
