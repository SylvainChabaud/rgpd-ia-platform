/**
 * User by ID Endpoints (Tenant-scoped)
 * LOT 5.3 - API Layer
 *
 * GET /api/users/:id - Get user details
 * PUT /api/users/:id - Update user
 * DELETE /api/users/:id - Soft delete user
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Cross-tenant access denied
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { updateUser } from '@/app/usecases/users/updateUser';
import { deleteUser } from '@/app/usecases/users/deleteUser';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError, validationError } from '@/lib/errorResponse';
import { validateBody, UpdateUserSchema } from '@/lib/validation';
import { ZodError } from 'zod';

/**
 * GET /api/users/:id - Get user details
 */
export const GET = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: userId } = await params;

          if (!userId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Fetch user
          const userRepo = new PgUserRepo();
          const user = await userRepo.findById(userId);

          if (!user) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // SECURITY: Verify user belongs to tenant
          if (user.tenantId !== context.tenantId) {
            logger.warn({
              userId,
              requestingTenant: context.tenantId,
              userTenant: user.tenantId,
            }, 'Cross-tenant user access attempt');
            return NextResponse.json(forbiddenError('Cross-tenant access denied'), { status: 403 });
          }

          logger.info({
            userId,
            tenantId: context.tenantId,
          }, 'User retrieved');

          // RGPD-safe: Do not expose email_hash or password_hash
          return NextResponse.json({
            user: {
              id: user.id,
              displayName: user.displayName,
              role: user.role,
              tenantId: user.tenantId,
              createdAt: user.createdAt,
              dataSuspended: user.dataSuspended,
              dataSuspendedAt: user.dataSuspendedAt?.toISOString() || null,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/users/:id error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * PUT /api/users/:id - Update user
 */
export const PUT = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: userId } = await params;

          if (!userId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Validate request body
          const body = await validateBody(req, UpdateUserSchema);

          // Update user
          await updateUser(
            {
              tenantId: context.tenantId!,
              userId,
              displayName: body.displayName,
              role: body.role,
              actorId: context.userId,
            },
            {
              userRepo: new PgUserRepo(),
              auditEventWriter: new PgAuditEventWriter(),
            }
          );

          logger.info({
            userId,
            tenantId: context.tenantId,
            actorId: context.userId,
          }, 'User updated');

          return NextResponse.json({
            user: {
              id: userId,
              displayName: body.displayName,
              role: body.role,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'PUT /api/users/:id error');

          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }

          if (errorMessage.includes('not found')) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          if (errorMessage.includes('VIOLATION') || errorMessage.includes('denied')) {
            return NextResponse.json(forbiddenError(errorMessage), { status: 403 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * DELETE /api/users/:id - Soft delete user
 */
export const DELETE = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: userId } = await params;

          if (!userId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Delete user
          await deleteUser(
            {
              tenantId: context.tenantId!,
              userId,
              actorId: context.userId,
            },
            {
              userRepo: new PgUserRepo(),
              auditEventWriter: new PgAuditEventWriter(),
            }
          );

          logger.info({
            userId,
            tenantId: context.tenantId,
            actorId: context.userId,
          }, 'User deleted');

          return NextResponse.json({
            message: 'User deleted',
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'DELETE /api/users/:id error');

          if (errorMessage.includes('not found')) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          if (errorMessage.includes('VIOLATION') || errorMessage.includes('denied')) {
            return NextResponse.json(forbiddenError(errorMessage), { status: 403 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
