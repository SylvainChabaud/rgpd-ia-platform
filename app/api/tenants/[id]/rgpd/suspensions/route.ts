import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { suspendUserData } from '@/app/usecases/suspension/suspendUserData';
import type { SuspensionReason } from '@/domain/rgpd/DataSuspension';

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

/**
 * POST /api/tenants/:id/rgpd/suspensions
 * Tenant Admin: suspend all users' data processing for a tenant (Art. 18).
 * Body: { reason?: string }
 */
export async function POST(
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
      ['rgpd:suspensions:write'],
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

    const body = await request.json();
    const reason = (body?.reason || 'admin_action') as SuspensionReason;

    const userRepo = new PgUserRepo();
    const auditWriter = new PgAuditEventWriter();
    const users = await userRepo.listByTenant(tenantId);

    let suspendedCount = 0;
    for (const user of users) {
      if (!user.dataSuspended) {
        await suspendUserData(userRepo, auditWriter, {
          tenantId,
          userId: user.id,
          reason,
          requestedBy: authResult.user.id,
        });
        suspendedCount++;
      }
    }

    return NextResponse.json(
      { message: `Suspended ${suspendedCount} users for tenant ${tenantId}` },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
