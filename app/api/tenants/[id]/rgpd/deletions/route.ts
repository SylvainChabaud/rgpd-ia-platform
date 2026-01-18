import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';

/**
 * GET /api/tenants/:id/rgpd/deletions
 * LOT 12.3 - Tenant Admin: list deletion requests (Art. 17)
 *
 * RGPD compliance:
 * - Tenant isolation enforced (tenantId in JWT == URL param)
 * - P1 data only (IDs, dates, status) + displayName (NO email)
 * - Consistent with /portal/users which also shows displayName only
 * - Audit event emitted
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

    // CRITICAL: Tenant isolation - TENANT_ADMIN can only see their own tenant
    if (
      authResult.user.role === ACTOR_ROLE.TENANT_ADMIN &&
      authResult.user.tenantId !== tenantId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Tenant mismatch' },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || undefined;

    // Fetch deletion requests
    const rgpdRequestRepo = new PgRgpdRequestRepo();
    const { requests, total } = await rgpdRequestRepo.findDeletionsByTenant(
      tenantId,
      { limit, offset, status }
    );

    // Log audit event (RGPD-safe: no sensitive data)
    logger.info({
      event: 'rgpd.deletions.listed',
      tenantId,
      actorId: authResult.user.id,
      count: requests.length,
    }, 'Tenant admin listed deletion requests');

    // Return P1 data + displayName (NO email - RGPD compliant)
    return NextResponse.json(
      {
        deletions: requests.map((req) => ({
          id: req.id,
          userId: req.userId,
          userDisplayName: req.userDisplayName,
          status: req.status,
          createdAt: req.createdAt.toISOString(),
          scheduledPurgeAt: req.scheduledPurgeAt?.toISOString() || null,
          completedAt: req.completedAt?.toISOString() || null,
        })),
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'rgpd.deletions.list_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/rgpd/deletions error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
