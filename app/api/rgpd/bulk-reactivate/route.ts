/**
 * RGPD Bulk Reactivate Endpoint (Super Admin only)
 * LOT 11.2 - Back Office Super Admin
 *
 * POST /api/rgpd/bulk-reactivate - Reactivate multiple users (cross-tenant)
 *
 * RGPD compliance:
 * - PLATFORM scope required (Super Admin only)
 * - Art. 18 RGPD (Limitation du traitement)
 * - Audit trail logged
 * - Only P1 data processed
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError, validationError } from '@/lib/errorResponse';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { z } from 'zod';
import { unsuspendUserData } from '@/app/usecases/suspension/unsuspendUserData';

const BulkReactivateSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().min(3).max(255).optional(),
})

function withPlatformAdmin(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const context = requireContext(req);
    if (context.scope !== ACTOR_SCOPE.PLATFORM) {
      return NextResponse.json(forbiddenError('PLATFORM scope required'), { status: 403 });
    }
    return handler(req);
  };
}

export const POST = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);
          const body = await req.json();
          const parsed = BulkReactivateSchema.safeParse(body);
          if (!parsed.success) {
            return NextResponse.json(validationError(parsed.error.issues), { status: 400 });
          }
          const { userIds, reason } = parsed.data;
          const userRepo = new PgUserRepo();
          const auditWriter = new PgAuditEventWriter();
          let count = 0;
          for (const userId of userIds) {
            const user = await userRepo.findById(userId);
            if (!user || !user.tenantId) continue;
            // Only unsuspend if currently suspended
            if (!user.dataSuspended) continue;
            await unsuspendUserData(
              userRepo,
              auditWriter,
              {
                tenantId: user.tenantId,
                userId,
                requestedBy: context.userId,
                notes: reason ?? undefined,
              }
            );
            count++;
          }
          logger.info({ actorId: context.userId, count }, 'Bulk reactivation completed');
          return NextResponse.json({ message: 'Bulk reactivation completed', count });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/rgpd/bulk-reactivate error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
