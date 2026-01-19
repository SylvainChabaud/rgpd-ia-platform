import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgDpiaRepo } from '@/infrastructure/repositories/PgDpiaRepo';
import { toPublicDpia } from '@/domain/dpia';
import { logger } from '@/infrastructure/logging/logger';

/**
 * POST /api/tenants/:id/dpia/:dpiaId/request-review
 * LOT 12.4 - Tenant Admin: Request revision of rejected DPIA
 *
 * Workflow:
 * 1. Tenant Admin sees rejected DPIA
 * 2. Clicks "Demander révision" button
 * 3. Fills modal with revision comments explaining corrections
 * 4. This endpoint resets DPIA to PENDING with revision info
 * 5. DPO sees it in pending list with revision comments
 *
 * RGPD compliance:
 * - Art. 35.11: Revision required when processing changes
 * - Tenant isolation enforced
 * - Audit trail maintained
 */
export async function POST(
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

    // RBAC: Only TENANT_ADMIN can request revision
    const hasPermission = requirePermission(
      authResult.user,
      ['dpia:request-review'],
      { allowedRoles: [ACTOR_ROLE.TENANT_ADMIN] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only Tenant Admin can request DPIA revision' },
        { status: 403 }
      );
    }

    // CRITICAL: Tenant isolation
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Forbidden: Tenant mismatch' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    if (!body.revisionComments || typeof body.revisionComments !== 'string') {
      return NextResponse.json(
        { error: 'revisionComments is required' },
        { status: 400 }
      );
    }

    if (body.revisionComments.trim().length < 10) {
      return NextResponse.json(
        { error: 'revisionComments must be at least 10 characters' },
        { status: 400 }
      );
    }

    const dpiaRepo = new PgDpiaRepo();
    const dpia = await dpiaRepo.requestRevision(
      tenantId,
      dpiaId,
      authResult.user.id,
      body.revisionComments
    );

    if (!dpia) {
      return NextResponse.json({ error: 'DPIA not found' }, { status: 404 });
    }

    // Audit log (P1 data only)
    logger.info({
      event: 'dpia.revision.requested',
      tenantId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      dpiaId,
    }, 'Tenant Admin requested DPIA revision');

    return NextResponse.json(
      { dpia: toPublicDpia(dpia) },
      { status: 200 }
    );
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Only rejected DPIAs')) {
        return NextResponse.json(
          { error: 'Only rejected DPIAs can request revision' },
          { status: 400 }
        );
      }
      if (error.message.includes('Revision comments must be')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    logger.error({
      event: 'dpia.revision.request.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'POST /api/tenants/:id/dpia/:dpiaId/request-review error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
