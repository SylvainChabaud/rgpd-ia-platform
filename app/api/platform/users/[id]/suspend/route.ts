/**
 * Platform User Suspend Endpoint (Super Admin only)
 * LOT 11.2 - Back Office Super Admin
 *
 * PATCH /api/platform/users/:id/suspend - Suspend user data processing (cross-tenant)
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
import { suspendUserData } from '@/app/usecases/suspension/suspendUserData';
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
 * PATCH /api/platform/users/:id/suspend - Suspend user (cross-tenant)
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

          if (!user || !user.tenantId) {
            return NextResponse.json(notFoundError('User tenant'), { status: 404 });
          }

          // Parse body for optional reason/notes
          const body = await req.json().catch(() => ({}));
          const { reason = 'admin_action', notes } = body;

          // Suspend user
          const auditWriter = new PgAuditEventWriter();
          await suspendUserData(
            userRepo,
            auditWriter,
            {
              tenantId: user.tenantId,
              userId,
              reason,
              requestedBy: context.userId,
              notes,
            }
          );

          logger.info({
            userId,
            platformAdminId: context.userId,
            userTenantId: user.tenantId,
          }, 'Platform admin suspended user');

          return NextResponse.json({
            message: 'User suspended successfully',
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'PATCH /api/platform/users/:id/suspend error');

          if (errorMessage.includes('not found')) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          if (errorMessage.includes('already suspended')) {
            return NextResponse.json(
              validationError([{ path: ['userId'], message: 'User is already suspended' }]),
              { status: 400 }
            );
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
