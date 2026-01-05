import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';

/**
 * GET /api/tenants/:id/rgpd/suspensions
 * Tenant Admin: list users with suspended data processing (Art. 18).
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
      ['rgpd:suspensions:read'],
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

    const userRepo = new PgUserRepo();
    const users = await userRepo.listSuspendedByTenant(tenantId);

    return NextResponse.json(
      {
        suspensions: users.map(user => ({
          userId: user.id,
          userEmailHash: user.emailHash,
          displayName: user.displayName,
          suspendedAt: user.dataSuspendedAt ?? null,
          reason: user.dataSuspendedReason ?? null,
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
