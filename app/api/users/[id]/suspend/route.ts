/**
 * User Suspend Endpoint (Tenant-scoped)
 * LOT 12.1 - Tenant User Management
 *
 * POST /api/users/:id/suspend - Suspend user
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Audit event logged
 * - Reason required for accountability (Art. 5)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError, validationError } from '@/lib/errorResponse';
import { z } from 'zod';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Suspend reason schema
 * Reason is required for RGPD accountability (Art. 5)
 */
const SuspendUserSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
});

/**
 * POST /api/users/:id/suspend - Suspend user
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

          // Parse and validate body
          let body: { reason: string };
          try {
            const rawBody = await req.json();
            body = SuspendUserSchema.parse(rawBody);
          } catch (error) {
            if (error instanceof z.ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json(validationError({ reason: 'Invalid request body' }), { status: 400 });
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
            }, 'Cross-tenant suspend attempt blocked');
            return NextResponse.json(forbiddenError('Cross-tenant access denied'), { status: 403 });
          }

          // Check if already suspended
          if (user.dataSuspended) {
            return NextResponse.json({
              message: 'User already suspended',
              user: {
                id: user.id,
                displayName: user.displayName,
                dataSuspended: true,
                dataSuspendedAt: user.dataSuspendedAt?.toISOString() || null,
              },
            });
          }

          // Suspend user
          const updatedUser = await userRepo.updateDataSuspension(userId, true, body.reason);

          // Log audit event
          const auditWriter = new PgAuditEventWriter();
          await auditWriter.write({
            id: crypto.randomUUID(),
            eventName: 'user.suspended',
            actorScope: ACTOR_SCOPE.TENANT,
            actorId: context.userId,
            tenantId: context.tenantId!,
            targetId: userId,
          });

          // RGPD: reason is stored in DB for accountability (Art. 5)
          // but NOT logged to prevent P2 data leakage
          logger.info({
            userId,
            tenantId: context.tenantId,
            actorId: context.userId,
          }, 'User suspended');

          return NextResponse.json({
            message: 'User suspended successfully',
            user: {
              id: updatedUser.id,
              displayName: updatedUser.displayName,
              dataSuspended: updatedUser.dataSuspended,
              dataSuspendedAt: updatedUser.dataSuspendedAt?.toISOString() || null,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/users/:id/suspend error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
