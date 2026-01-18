import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgDisputeRepo } from '@/infrastructure/repositories/PgDisputeRepo';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { logger } from '@/infrastructure/logging/logger';

/**
 * GET /api/tenants/:id/rgpd/contests
 * Tenant Admin: list AI disputes (Art. 22).
 *
 * RGPD compliance:
 * - Tenant isolation enforced
 * - P1 data only + displayName (NO email)
 * - Consistent with /portal/users which also shows displayName only
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

    const hasPermission = requirePermission(
      authResult.user,
      ['rgpd:contests:read'],
      { allowedRoles: [ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.SUPERADMIN] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      );
    }

    if (
      authResult.user.role === ACTOR_ROLE.TENANT_ADMIN &&
      authResult.user.tenantId !== tenantId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Tenant mismatch' },
        { status: 403 }
      );
    }

    const disputeRepo = new PgDisputeRepo();
    const userRepo = new PgUserRepo();
    const disputes = await disputeRepo.findByTenant(tenantId);

    // Build user ID to displayName map (NO email - RGPD compliant)
    const userIds = [...new Set(disputes.map(d => d.userId))];
    const userDisplayNames: Record<string, string> = {};
    for (const userId of userIds) {
      const user = await userRepo.findById(userId);
      // Verify user belongs to tenant (RGPD isolation)
      if (user && user.tenantId === tenantId) {
        userDisplayNames[userId] = user.displayName;
      } else {
        userDisplayNames[userId] = 'Utilisateur supprimé';
      }
    }

    // Return P1 data + displayName (NO email - RGPD compliant)
    return NextResponse.json(
      {
        contests: disputes.map(dispute => ({
          id: dispute.id,
          userId: dispute.userId,
          userDisplayName: userDisplayNames[dispute.userId],
          aiJobId: dispute.aiJobId,
          reason: dispute.reason,
          status: dispute.status,
          adminResponse: dispute.adminResponse,
          reviewedBy: dispute.reviewedBy,
          createdAt: dispute.createdAt instanceof Date
            ? dispute.createdAt.toISOString()
            : dispute.createdAt,
          reviewedAt: dispute.reviewedAt instanceof Date
            ? dispute.reviewedAt.toISOString()
            : dispute.reviewedAt,
          resolvedAt: dispute.resolvedAt instanceof Date
            ? dispute.resolvedAt.toISOString()
            : dispute.resolvedAt,
          hasAttachment: dispute.attachmentUrl !== null,
        })),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { error: errorMessage, path: '/api/tenants/[id]/rgpd/contests', method: 'GET' },
      'GET /api/tenants/[id]/rgpd/contests error'
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
