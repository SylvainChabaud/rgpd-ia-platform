import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { suspendUserData } from '@/app/usecases/suspension/suspendUserData';
import type { SuspensionReason } from '@/domain/rgpd/DataSuspension';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Zod schema for POST body validation
 */
const SuspensionBodySchema = z.object({
  reason: z
    .enum(['admin_action', 'user_request', 'legal_obligation', 'security_incident'])
    .default('admin_action'),
});

/**
 * GET /api/tenants/:id/rgpd/suspensions
 * Tenant Admin: list users with suspended data processing (Art. 18).
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

    // Return P1 data + displayName (NO email - RGPD compliant)
    return NextResponse.json(
      {
        suspensions: users.map(user => ({
          id: user.id,
          userId: user.id,
          userDisplayName: user.displayName,
          status: 'active',
          reason: user.dataSuspendedReason ?? null,
          createdAt: user.dataSuspendedAt?.toISOString() ?? null,
          liftedAt: null,
        })),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { error: errorMessage, path: '/api/tenants/[id]/rgpd/suspensions', method: 'GET' },
      'GET /api/tenants/[id]/rgpd/suspensions error'
    );
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

    let body: z.infer<typeof SuspensionBodySchema>;
    try {
      const rawBody = await request.json();
      body = SuspensionBodySchema.parse(rawBody);
    } catch (parseError) {
      logger.warn(
        { error: parseError instanceof Error ? parseError.message : 'Unknown', path: '/api/tenants/[id]/rgpd/suspensions', method: 'POST' },
        'Invalid request body'
      );
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    const reason = body.reason as SuspensionReason;

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { error: errorMessage, path: '/api/tenants/[id]/rgpd/suspensions', method: 'POST' },
      'POST /api/tenants/[id]/rgpd/suspensions error'
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
