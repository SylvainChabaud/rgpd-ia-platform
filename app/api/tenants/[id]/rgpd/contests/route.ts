import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgDisputeRepo } from '@/infrastructure/repositories/PgDisputeRepo';

/**
 * GET /api/tenants/:id/rgpd/contests
 * Tenant Admin: list AI disputes (Art. 22).
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
      { allowedRoles: ['TENANT_ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      );
    }

    if (
      authResult.user.role === 'TENANT_ADMIN' &&
      authResult.user.tenantId !== tenantId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Tenant mismatch' },
        { status: 403 }
      );
    }

    const disputeRepo = new PgDisputeRepo();
    const disputes = await disputeRepo.findByTenant(tenantId);

    return NextResponse.json(
      {
        contests: disputes.map(dispute => ({
          id: dispute.id,
          userId: dispute.userId,
          aiJobId: dispute.aiJobId,
          reason: dispute.reason,
          status: dispute.status,
          adminResponse: dispute.adminResponse,
          reviewedBy: dispute.reviewedBy,
          createdAt: dispute.createdAt,
          reviewedAt: dispute.reviewedAt,
          resolvedAt: dispute.resolvedAt,
          hasAttachment: dispute.attachmentUrl !== null,
        })),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
