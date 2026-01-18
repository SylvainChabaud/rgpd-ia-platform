import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgOppositionRepo } from '@/infrastructure/repositories/PgOppositionRepo';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { logger } from '@/infrastructure/logging/logger';

/**
 * GET /api/tenants/:id/rgpd/oppositions
 * Tenant Admin: list user oppositions (Art. 21).
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
    const userRepo = new PgUserRepo();
    const oppositions = await oppositionRepo.findByTenant(tenantId);

    // Build user ID to displayName map (NO email - RGPD compliant)
    const userIds = [...new Set(oppositions.map(o => o.userId))];
    const userDisplayNames: Record<string, string> = {};
    for (const userId of userIds) {
      const user = await userRepo.findById(userId);
      // Verify user belongs to tenant (RGPD isolation)
      if (user && user.tenantId === tenantId) {
        userDisplayNames[userId] = user.displayName;
      } else {
        userDisplayNames[userId] = 'Utilisateur supprimé';
      }
    }

    // Return P1 data + displayName (NO email - RGPD compliant)
    return NextResponse.json(
      {
        oppositions: oppositions.map(opposition => ({
          id: opposition.id,
          userId: opposition.userId,
          userDisplayName: userDisplayNames[opposition.userId],
          treatmentType: opposition.treatmentType,
          reason: opposition.reason,
          status: opposition.status,
          adminResponse: opposition.adminResponse,
          reviewedBy: opposition.reviewedBy,
          createdAt: opposition.createdAt instanceof Date
            ? opposition.createdAt.toISOString()
            : opposition.createdAt,
          reviewedAt: opposition.reviewedAt instanceof Date
            ? opposition.reviewedAt.toISOString()
            : opposition.reviewedAt,
        })),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { error: errorMessage, path: '/api/tenants/[id]/rgpd/oppositions', method: 'GET' },
      'GET /api/tenants/[id]/rgpd/oppositions error'
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
