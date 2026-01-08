/**
 * Platform User Reactivate Endpoint (Super Admin only)
 * LOT 11.2 - Back Office Super Admin
 *
 * PATCH /api/platform/users/:id/reactivate - Reactivate suspended user (cross-tenant)
 *
 * RGPD compliance:
 * - PLATFORM scope required (Super Admin only)
 * - Cross-tenant access authorized
 * - Art. 18 RGPD (Limitation du traitement)
 * - Audit trail logged
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext } from '@/lib/requestContext';
import { unsuspendUserData } from '@/app/usecases/suspension/unsuspendUserData';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError, validationError } from '@/lib/errorResponse';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Middleware to check PLATFORM scope
 */
function withPlatformAdmin(
  handler: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const ctx = requireContext(req);

    if (ctx.scope !== ACTOR_SCOPE.PLATFORM) {
      return NextResponse.json(
        forbiddenError('PLATFORM scope required'),
        { status: 403 }
      );
    }

    return handler(req, context);
  };
}

/**
 * PATCH /api/platform/users/:id/reactivate - Reactivate user (cross-tenant)
 */
export const PATCH = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: userId } = await params;

          if (!userId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Fetch user to get tenantId (NO TENANT FILTERING)
          const userRepo = new PgUserRepo();
          const user = await userRepo.findById(userId);

          if (!user) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Parse body for optional notes
          const body = await req.json().catch(() => ({}));
          const { notes } = body;

          // Check tenantId is not null
          if (!user.tenantId) {
            return NextResponse.json(notFoundError('User tenant'), { status: 404 });
          }

          // Reactivate user
          const auditWriter = new PgAuditEventWriter();
          await unsuspendUserData(
            userRepo,
            auditWriter,
            {
              tenantId: user.tenantId,
              userId,
              requestedBy: context.userId,
              notes,
            }
          );

          logger.info({
            userId,
            platformAdminId: context.userId,
            userTenantId: user.tenantId,
          }, 'Platform admin reactivated user');

          return NextResponse.json({
            message: 'User reactivated successfully',
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'PATCH /api/platform/users/:id/reactivate error');

          if (errorMessage.includes('not found')) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          if (errorMessage.includes('not suspended')) {
            return NextResponse.json(
              validationError([{ path: ['userId'], message: 'User is not suspended' }]),
              { status: 400 }
            );
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
