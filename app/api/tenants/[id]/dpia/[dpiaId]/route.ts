import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgDpiaRepo } from '@/infrastructure/repositories/PgDpiaRepo';
import { toPublicDpia, DPIA_STATUS } from '@/domain/dpia';
import { logger } from '@/infrastructure/logging/logger';

/**
 * GET /api/tenants/:id/dpia/:dpiaId
 * LOT 12.4 - DPO: Get DPIA details with risks
 *
 * RGPD compliance:
 * - Art. 35: DPIA consultation
 * - Art. 38.3: DPO access required
 * - Tenant isolation enforced
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

    // RBAC: DPO, TENANT_ADMIN (read-only), or SUPERADMIN
    const hasPermission = requirePermission(
      authResult.user,
      ['dpia:read'],
      { allowedRoles: [ACTOR_ROLE.DPO, ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.SUPERADMIN] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: DPO or Admin role required' },
        { status: 403 }
      );
    }

    // CRITICAL: Tenant isolation
    if (
      (authResult.user.role === ACTOR_ROLE.TENANT_ADMIN || authResult.user.role === ACTOR_ROLE.DPO) &&
      authResult.user.tenantId !== tenantId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Tenant mismatch' },
        { status: 403 }
      );
    }

    const dpiaRepo = new PgDpiaRepo();
    const dpia = await dpiaRepo.findById(tenantId, dpiaId);

    if (!dpia) {
      return NextResponse.json({ error: 'DPIA not found' }, { status: 404 });
    }

    // Audit log (P1 data only)
    logger.info({
      event: 'dpia.detail.viewed',
      tenantId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      dpiaId,
    }, 'DPO viewed DPIA detail');

    return NextResponse.json(
      { dpia: toPublicDpia(dpia) },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'dpia.detail.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/dpia/:dpiaId error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tenants/:id/dpia/:dpiaId
 * LOT 12.4 - DPO: Validate (approve/reject) DPIA
 *
 * RGPD compliance:
 * - Art. 35: DPIA validation
 * - Art. 38.3: Only DPO can validate
 * - Tenant isolation enforced
 */
export async function PATCH(
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

    const body = await request.json();

    // Determine action type: validation (DPO) or update (editable fields)
    const isValidation = body.status === DPIA_STATUS.APPROVED || body.status === DPIA_STATUS.REJECTED;

    if (isValidation) {
      // RBAC: Only DPO can validate
      const hasPermission = requirePermission(
        authResult.user,
        ['dpia:validate'],
        { allowedRoles: [ACTOR_ROLE.DPO] }
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden: Only DPO can validate DPIA' },
          { status: 403 }
        );
      }
    } else {
      // RBAC: DPO or TENANT_ADMIN can update editable fields
      const hasPermission = requirePermission(
        authResult.user,
        ['dpia:update'],
        { allowedRoles: [ACTOR_ROLE.DPO, ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.SUPERADMIN] }
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden: DPO or Admin role required' },
          { status: 403 }
        );
      }
    }

    // CRITICAL: Tenant isolation
    if (
      (authResult.user.role === ACTOR_ROLE.TENANT_ADMIN || authResult.user.role === ACTOR_ROLE.DPO) &&
      authResult.user.tenantId !== tenantId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Tenant mismatch' },
        { status: 403 }
      );
    }

    const dpiaRepo = new PgDpiaRepo();

    let dpia;

    if (isValidation) {
      // Validation requires rejectionReason if rejected
      if (body.status === DPIA_STATUS.REJECTED && !body.rejectionReason) {
        return NextResponse.json(
          { error: 'rejectionReason is required when rejecting DPIA' },
          { status: 400 }
        );
      }

      dpia = await dpiaRepo.validate(
        tenantId,
        dpiaId,
        authResult.user.id,
        body.status,
        body.dpoComments,
        body.rejectionReason
      );

      if (dpia) {
        // Audit log for validation (P1 data only)
        logger.info({
          event: body.status === DPIA_STATUS.APPROVED ? 'dpia.approved' : 'dpia.rejected',
          tenantId,
          actorId: authResult.user.id,
          dpiaId,
          status: body.status,
        }, `DPO ${body.status.toLowerCase()} DPIA`);
      }
    } else {
      // Update editable fields
      dpia = await dpiaRepo.update(tenantId, dpiaId, {
        title: body.title,
        description: body.description,
        dpoComments: body.dpoComments,
        securityMeasures: body.securityMeasures,
      });

      if (dpia) {
        // Audit log for update (P1 data only)
        logger.info({
          event: 'dpia.updated',
          tenantId,
          actorId: authResult.user.id,
          dpiaId,
        }, 'DPIA updated');
      }
    }

    if (!dpia) {
      return NextResponse.json({ error: 'DPIA not found' }, { status: 404 });
    }

    return NextResponse.json(
      { dpia: toPublicDpia(dpia) },
      { status: 200 }
    );
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('already validated')) {
        return NextResponse.json(
          { error: 'DPIA is already validated' },
          { status: 409 }
        );
      }
      if (error.message.includes('Cannot update validated')) {
        return NextResponse.json(
          { error: 'Cannot update a validated DPIA' },
          { status: 409 }
        );
      }
    }

    logger.error({
      event: 'dpia.patch.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'PATCH /api/tenants/:id/dpia/:dpiaId error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/:id/dpia/:dpiaId
 * LOT 12.4 - Delete DPIA (soft delete)
 *
 * RGPD compliance:
 * - Art. 35: DPIA documentation retained for audits
 * - Soft delete preserves audit trail
 */
export async function DELETE(
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

    // RBAC: Only SUPERADMIN can delete (for compliance audits)
    const hasPermission = requirePermission(
      authResult.user,
      ['dpia:delete'],
      { allowedRoles: [ACTOR_ROLE.SUPERADMIN] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only Platform Admin can delete DPIA' },
        { status: 403 }
      );
    }

    const dpiaRepo = new PgDpiaRepo();
    const deleted = await dpiaRepo.softDelete(tenantId, dpiaId);

    if (!deleted) {
      return NextResponse.json({ error: 'DPIA not found' }, { status: 404 });
    }

    // Audit log (P1 data only)
    logger.info({
      event: 'dpia.deleted',
      tenantId,
      actorId: authResult.user.id,
      dpiaId,
    }, 'DPIA soft-deleted');

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'dpia.delete.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'DELETE /api/tenants/:id/dpia/:dpiaId error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
