import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgOppositionRepo } from '@/infrastructure/repositories/PgOppositionRepo';

/**
 * GET /api/tenants/:id/rgpd/oppositions
 * Tenant Admin: list user oppositions (Art. 21).
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
      ['rgpd:oppositions:read'],
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

    const oppositionRepo = new PgOppositionRepo();
    const oppositions = await oppositionRepo.findByTenant(tenantId);

    return NextResponse.json(
      {
        oppositions: oppositions.map(opposition => ({
          id: opposition.id,
          userId: opposition.userId,
          treatmentType: opposition.treatmentType,
          reason: opposition.reason,
          status: opposition.status,
          adminResponse: opposition.adminResponse,
          reviewedBy: opposition.reviewedBy,
          createdAt: opposition.createdAt,
          reviewedAt: opposition.reviewedAt,
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
