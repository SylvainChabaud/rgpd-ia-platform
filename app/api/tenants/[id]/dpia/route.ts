import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgDpiaRepo } from '@/infrastructure/repositories/PgDpiaRepo';
import { toPublicDpia } from '@/domain/dpia';
import { logger } from '@/infrastructure/logging/logger';

/**
 * GET /api/tenants/:id/dpia
 * LOT 12.4 - DPO: List all DPIAs for tenant
 *
 * RGPD compliance:
 * - Art. 35: DPIA management
 * - Art. 38.3: DPO access required
 * - Tenant isolation enforced
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    const riskLevel = searchParams.get('riskLevel') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

    const dpiaRepo = new PgDpiaRepo();
    const dpias = await dpiaRepo.findAll(tenantId, {
      status: status || undefined,
      riskLevel: riskLevel || undefined,
      limit,
      offset,
    });

    // Get stats for KPI widgets
    const stats = await dpiaRepo.getStats(tenantId);

    // Audit log (P1 data only)
    logger.info({
      event: 'dpia.list.viewed',
      tenantId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      count: dpias.length,
    }, 'DPO viewed DPIA list');

    return NextResponse.json(
      {
        dpias: dpias.map(toPublicDpia),
        stats,
        total: stats.total,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'dpia.list.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/dpia error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/:id/dpia
 * LOT 12.4 - Create DPIA (auto-triggered by HIGH/CRITICAL purpose activation)
 *
 * RGPD compliance:
 * - Art. 35: DPIA required for high-risk processing
 * - Tenant isolation enforced
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

    // RBAC: TENANT_ADMIN or SUPERADMIN can create DPIA
    // (DPO validates, doesn't create)
    const hasPermission = requirePermission(
      authResult.user,
      ['dpia:create'],
      { allowedRoles: [ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.SUPERADMIN] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      );
    }

    // CRITICAL: Tenant isolation
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

    // Validate required fields
    if (!body.purposeId) {
      return NextResponse.json(
        { error: 'purposeId is required' },
        { status: 400 }
      );
    }

    if (!body.title || body.title.length < 5) {
      return NextResponse.json(
        { error: 'title must be at least 5 characters' },
        { status: 400 }
      );
    }

    if (!body.description || body.description.length < 20) {
      return NextResponse.json(
        { error: 'description must be at least 20 characters' },
        { status: 400 }
      );
    }

    // P3 data is forbidden
    if (body.dataClassification === 'P3') {
      return NextResponse.json(
        { error: 'RGPD VIOLATION: P3 (sensitive) data processing is forbidden' },
        { status: 400 }
      );
    }

    const dpiaRepo = new PgDpiaRepo();

    const dpia = await dpiaRepo.create(tenantId, {
      tenantId,
      purposeId: body.purposeId,
      title: body.title,
      description: body.description,
      overallRiskLevel: body.overallRiskLevel,
      dataProcessed: body.dataProcessed,
      dataClassification: body.dataClassification,
      securityMeasures: body.securityMeasures,
    });

    // Audit log (P1 data only)
    logger.info({
      event: 'dpia.created',
      tenantId,
      actorId: authResult.user.id,
      dpiaId: dpia.id,
      purposeId: body.purposeId,
      riskLevel: dpia.overallRiskLevel,
    }, 'DPIA created');

    return NextResponse.json(
      { dpia: toPublicDpia(dpia) },
      { status: 201 }
    );
  } catch (error) {
    // Check for "already exists" error
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    logger.error({
      event: 'dpia.create.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'POST /api/tenants/:id/dpia error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
