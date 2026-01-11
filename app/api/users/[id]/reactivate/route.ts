/**
 * User Reactivate Endpoint (Tenant-scoped)
 * LOT 12.1 - Tenant User Management
 *
 * POST /api/users/:id/reactivate - Reactivate suspended user
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Audit event logged
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError } from '@/lib/errorResponse';

/**
 * POST /api/users/:id/reactivate - Reactivate suspended user
 */
export const POST = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: userId } = await params;

          if (!userId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Fetch user to verify tenant
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
            }, 'Cross-tenant reactivate attempt blocked');
            return NextResponse.json(forbiddenError('Cross-tenant access denied'), { status: 403 });
          }

          // Check if not suspended
          if (!user.dataSuspended) {
            return NextResponse.json({
              message: 'User is not suspended',
              user: {
                id: user.id,
                displayName: user.displayName,
                dataSuspended: false,
                dataSuspendedAt: null,
              },
            });
          }

          // Reactivate user
          const updatedUser = await userRepo.updateDataSuspension(userId, false);

          // Log audit event
          const auditWriter = new PgAuditEventWriter();
          await auditWriter.write({
            id: crypto.randomUUID(),
            eventName: 'user.reactivated',
            actorScope: 'TENANT',
            actorId: context.userId,
            tenantId: context.tenantId!,
            targetId: userId,
          });

          logger.info({
            userId,
            tenantId: context.tenantId,
            actorId: context.userId,
          }, 'User reactivated');

          return NextResponse.json({
            message: 'User reactivated successfully',
            user: {
              id: updatedUser.id,
              displayName: updatedUser.displayName,
              dataSuspended: updatedUser.dataSuspended,
              dataSuspendedAt: null,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/users/:id/reactivate error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
