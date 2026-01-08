/**
 * Platform User by ID Endpoints (Super Admin only)
 * LOT 11.2 - Back Office Super Admin
 *
 * GET /api/platform/users/:id - Get user details (cross-tenant)
 * PUT /api/platform/users/:id - Update user (cross-tenant)
 * DELETE /api/platform/users/:id - Soft delete user (cross-tenant)
 *
 * RGPD compliance:
 * - PLATFORM scope required (Super Admin only)
 * - Cross-tenant access authorized
 * - Email redacted in responses (P2 data)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext } from '@/lib/requestContext';
import { updateUser } from '@/app/usecases/users/updateUser';
import { deleteUser } from '@/app/usecases/users/deleteUser';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError, validationError } from '@/lib/errorResponse';
import { validateBody, UpdateUserSchema } from '@/lib/validation';
import { ZodError } from 'zod';
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
 * GET /api/platform/users/:id - Get user details (cross-tenant)
 */
export const GET = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: userId } = await params;

          if (!userId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Fetch user (NO TENANT FILTERING - Platform admin can see all)
          const userRepo = new PgUserRepo();
          const user = await userRepo.findById(userId);

          if (!user) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          logger.info({
            userId,
            platformAdminId: context.userId,
            userTenantId: user.tenantId,
          }, 'Platform admin retrieved user');

          // RGPD-safe: Do not expose email_hash or password_hash
          return NextResponse.json({
            user: {
              id: user.id,
              displayName: user.displayName,
              role: user.role,
              tenantId: user.tenantId,
              scope: user.scope,
              createdAt: user.createdAt,
              dataSuspended: user.dataSuspended,
              dataSuspendedAt: user.dataSuspendedAt,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/platform/users/:id error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * PATCH /api/platform/users/:id - Update user (cross-tenant)
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

          // Validate body
          const body = await validateBody(req, UpdateUserSchema);
          logger.info({ body }, 'PATCH /api/platform/users/:id - body validated');

          const { displayName, role } = body;

          // Update user (NO TENANT FILTERING)
          const userRepo = new PgUserRepo();
          const auditWriter = new PgAuditEventWriter();
          const user = await userRepo.findById(userId);
          if (!user || !user.tenantId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          const tenantId = user.tenantId; // Type narrowing
          await updateUser(
            {
              userId,
              displayName,
              role,
              tenantId,
              actorId: context.userId,
            },
            {
              userRepo,
              auditEventWriter: auditWriter,
            }
          );

          logger.info({
            userId,
            platformAdminId: context.userId,
          }, 'Platform admin updated user');

          // Fetch updated user
          const updatedUser = await userRepo.findById(userId);

          return NextResponse.json({
            user: {
              id: updatedUser!.id,
              displayName: updatedUser!.displayName,
              role: updatedUser!.role,
              tenantId: updatedUser!.tenantId,
              scope: updatedUser!.scope,
              createdAt: updatedUser!.createdAt,
              dataSuspended: updatedUser!.dataSuspended,
              dataSuspendedAt: updatedUser!.dataSuspendedAt,
            },
          });
        } catch (error: unknown) {
          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'PATCH /api/platform/users/:id error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * DELETE /api/platform/users/:id - Soft delete user (cross-tenant)
 */
export const DELETE = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: userId } = await params;

          if (!userId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Delete user (NO TENANT FILTERING)
          const userRepo = new PgUserRepo();
          const auditWriter = new PgAuditEventWriter();
          const user = await userRepo.findById(userId);
          if (!user || !user.tenantId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          const tenantId = user.tenantId; // Type narrowing
          await deleteUser(
            {
              userId,
              tenantId,
              actorId: context.userId,
            },
            {
              userRepo,
              auditEventWriter: auditWriter,
            }
          );

          logger.info({
            userId,
            platformAdminId: context.userId,
          }, 'Platform admin deleted user');

          return NextResponse.json({
            message: 'User soft-deleted successfully',
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'DELETE /api/platform/users/:id error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
