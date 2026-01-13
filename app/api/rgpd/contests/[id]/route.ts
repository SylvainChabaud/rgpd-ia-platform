import { NextRequest, NextResponse } from 'next/server';
import { stubAuthProvider } from '@/app/auth/stubAuthProvider';
import { resolveDispute } from '@/app/usecases/dispute/resolveDispute';
import { PgDisputeRepo } from '@/infrastructure/repositories/PgDisputeRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { tenantContextRequiredError } from '@/lib/errorResponse';

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

type ResolveDisputeBody = {
  status: 'resolved' | 'rejected';
  adminResponse: string;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid auth header' }, { status: 401 });
    }

    const actor = await stubAuthProvider.validateAuth(match[1]);
    if (!actor) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // RBAC: Admin only
    if (!actor.roles.includes('TENANT_ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      );
    }

    // Tenant context required
    if (!actor.tenantId) {
      return NextResponse.json(
        tenantContextRequiredError(),
        { status: 403 }
      );
    }

    const { id: disputeId } = await params;
    const body = (await request.json()) as ResolveDisputeBody;

    // Validation
    if (!body.status || !body.adminResponse) {
      return NextResponse.json(
        { error: 'status and adminResponse are required' },
        { status: 400 }
      );
    }

    const disputeRepo = new PgDisputeRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await resolveDispute(disputeRepo, auditWriter, {
      tenantId: actor.tenantId,
      disputeId,
      status: body.status,
      adminResponse: body.adminResponse,
      reviewedBy: actor.actorId,
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
    console.error('Error resolving dispute:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
