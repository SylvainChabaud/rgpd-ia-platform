import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveDispute } from '@/app/usecases/dispute/resolveDispute';
import { createDisputeDependencies } from '@/app/dependencies';
import { tenantContextRequiredError, forbiddenError, validationError } from '@/lib/errorResponse';
import { logError } from '@/shared/logger';
import { withAuth, requireUser } from '@/middleware/auth';

/**
 * PATCH /api/rgpd/contests/:id - Resolve dispute (admin only)
 *
 * RGPD compliance:
 * - Art. 22 RGPD (Décision individuelle automatisée)
 * - Human review mandatory for AI decisions
 * - Admin response required for resolved/rejected
 * - Tenant-scoped isolation enforced
 * - RBAC: TENANT_ADMIN or SUPER_ADMIN only
 *
 * LOT 10.6 — Droits complémentaires Art. 22
 */

const ResolveDisputeBodySchema = z.object({
  status: z.enum(['resolved', 'rejected']),
  adminResponse: z.string().min(1, 'adminResponse is required'),
});

async function patchHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireUser(request);

    // RBAC: Admin only
    if (user.role !== 'TENANT_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        forbiddenError('Admin role required'),
        { status: 403 }
      );
    }

    // Tenant context required
    if (!user.tenantId) {
      return NextResponse.json(
        tenantContextRequiredError(),
        { status: 403 }
      );
    }

    const { id: disputeId } = await params;
    const rawBody = await request.json();

    // Validation with Zod
    const parsed = ResolveDisputeBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        validationError(parsed.error.issues.map(i => i.message).join(', ')),
        { status: 400 }
      );
    }

    const { status, adminResponse } = parsed.data;

    // Dependencies via factory (BOUNDARIES.md section 11)
    const deps = createDisputeDependencies();

    const result = await resolveDispute(deps.disputeRepo, deps.auditEventWriter, {
      tenantId: user.tenantId,
      disputeId,
      status,
      adminResponse,
      reviewedBy: user.userId,
    });

    return NextResponse.json(
      {
        success: true,
        dispute: {
          id: result.dispute.id,
          status: result.dispute.status,
          adminResponse: result.dispute.adminResponse,
          reviewedAt: result.dispute.reviewedAt,
          resolvedAt: result.dispute.resolvedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logError('rgpd.contests.resolve_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(patchHandler);
