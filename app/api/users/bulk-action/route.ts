/**
 * Users Bulk Action Endpoint (Tenant-scoped)
 * LOT 12.1 - Tenant User Management
 *
 * POST /api/users/bulk-action - Bulk suspend/reactivate users
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced (all users must belong to same tenant)
 * - Audit events logged for each user
 * - Art. 5 Accountability: reason required for suspend
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError } from '@/lib/errorResponse';
import { z } from 'zod';

/**
 * Bulk action schema
 */
const BulkActionSchema = z.object({
  action: z.enum(['suspend', 'reactivate']),
  userIds: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().min(1).max(500).optional(),
}).refine(
  (data) => data.action !== 'suspend' || (data.reason && data.reason.length > 0),
  { message: 'Reason is required for suspend action', path: ['reason'] }
);

/**
 * POST /api/users/bulk-action - Bulk suspend/reactivate users
 */
export const POST = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Parse and validate body
          let body: z.infer<typeof BulkActionSchema>;
          try {
            const rawBody = await req.json();
            body = BulkActionSchema.parse(rawBody);
          } catch (error) {
            if (error instanceof z.ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json(validationError({ message: 'Invalid request body' }), { status: 400 });
          }

          const { action, userIds, reason } = body;
          const userRepo = new PgUserRepo();
          const auditWriter = new PgAuditEventWriter();

          // Verify all users belong to tenant
          const results: { userId: string; success: boolean; error?: string }[] = [];
          let successCount = 0;
          let errorCount = 0;

          for (const userId of userIds) {
            try {
              const user = await userRepo.findById(userId);

              if (!user) {
                results.push({ userId, success: false, error: 'User not found' });
                errorCount++;
                continue;
              }

              // SECURITY: Verify user belongs to tenant
              if (user.tenantId !== context.tenantId) {
                logger.warn({
                  userId,
                  requestingTenant: context.tenantId,
                  userTenant: user.tenantId,
                  action,
                }, 'Cross-tenant bulk action attempt blocked');
                results.push({ userId, success: false, error: 'Cross-tenant access denied' });
                errorCount++;
                continue;
              }

              // Skip if already in desired state
              if (action === 'suspend' && user.dataSuspended) {
                results.push({ userId, success: true, error: 'Already suspended' });
                successCount++;
                continue;
              }
              if (action === 'reactivate' && !user.dataSuspended) {
                results.push({ userId, success: true, error: 'Already active' });
                successCount++;
                continue;
              }

              // Execute action
              if (action === 'suspend') {
                await userRepo.updateDataSuspension(userId, true, reason);
                await auditWriter.write({
                  id: crypto.randomUUID(),
                  eventName: 'user.suspended',
                  actorScope: 'TENANT',
                  actorId: context.userId,
                  tenantId: context.tenantId!,
                  targetId: userId,
                });
              } else {
                await userRepo.updateDataSuspension(userId, false);
                await auditWriter.write({
                  id: crypto.randomUUID(),
                  eventName: 'user.reactivated',
                  actorScope: 'TENANT',
                  actorId: context.userId,
                  tenantId: context.tenantId!,
                  targetId: userId,
                });
              }

              results.push({ userId, success: true });
              successCount++;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              results.push({ userId, success: false, error: errorMessage });
              errorCount++;
            }
          }

          logger.info({
            tenantId: context.tenantId,
            actorId: context.userId,
            action,
            totalRequested: userIds.length,
            successCount,
            errorCount,
          }, 'Bulk user action completed');

          return NextResponse.json({
            message: `Bulk ${action} completed`,
            action,
            results,
            summary: {
              total: userIds.length,
              success: successCount,
              errors: errorCount,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/users/bulk-action error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
