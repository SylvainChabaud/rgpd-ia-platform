/**
 * DPO Email Access API
 * LOT 1.6 - Email chiffré pour notifications RGPD
 *
 * GET /api/platform/users/:id/email
 * DPO-only access to user email for RGPD obligations
 *
 * RGPD Compliance:
 * - DPO ONLY (Art. 37-39 - DPO responsibilities)
 * - Required for Art. 34 notifications (violation de données)
 * - Audit trail for every access
 * - Platform Admin and Tenant Admin: FORBIDDEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError, notFoundError } from '@/lib/errorResponse';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { newId } from '@/shared/ids';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/platform/users/:id/email - Get user email (DPO only)
 *
 * RGPD Art. 34: DPO must be able to notify users of data breaches
 * RGPD Art. 37-39: DPO responsibilities include ensuring compliance
 *
 * ACCESS RULES (FULL RGPD):
 * - DPO: ALLOWED (legal obligation)
 * - Platform Admin: FORBIDDEN (can delegate to DPO)
 * - Tenant Admin: FORBIDDEN (displayName suffices)
 * - User: Use /api/users/me instead
 */
export const GET = withLogging(
  withAuth(async (req: NextRequest, { params }: RouteParams) => {
    try {
      const context = requireContext(req);
      const { id: targetUserId } = await params;

      // CRITICAL: DPO only access
      // DPO role is the only one legally authorized to access user emails
      // for RGPD compliance purposes (Art. 34, 37-39)
      if (context.role !== ACTOR_ROLE.DPO) {
        logger.warn(
          {
            actorId: context.userId,
            actorRole: context.role,
            targetUserId,
            attemptedAction: 'access_user_email',
          },
          'RGPD: Unauthorized email access attempt (DPO only)'
        );

        return NextResponse.json(
          forbiddenError('DPO role required to access user emails (Art. 37-39 RGPD)'),
          { status: 403 }
        );
      }

      // DPO must be PLATFORM scope
      if (context.scope !== ACTOR_SCOPE.PLATFORM) {
        return NextResponse.json(
          forbiddenError('PLATFORM scope required'),
          { status: 403 }
        );
      }

      const userRepo = new PgUserRepo();

      // Check user exists
      const user = await userRepo.findById(targetUserId);
      if (!user) {
        return NextResponse.json(notFoundError('User'), { status: 404 });
      }

      // Get decrypted email
      const email = await userRepo.getDecryptedEmail(targetUserId);

      // RGPD Audit trail - persist to database (Art. 5.2, 32)
      // P1 data only: IDs, event type, timestamp
      const auditWriter = new PgAuditEventWriter();
      await auditWriter.write({
        id: newId(),
        eventName: 'user.email.accessed',
        actorScope: ACTOR_SCOPE.PLATFORM,
        actorId: context.userId,
        tenantId: user.tenantId ?? undefined,
        targetId: targetUserId,
      });

      // Also log for observability (RGPD-safe)
      logger.info(
        {
          dpoId: context.userId,
          targetUserId,
          targetTenantId: user.tenantId,
          hasEmail: !!email,
          purpose: 'rgpd_compliance',
        },
        'DPO accessed user email (Art. 34, 37-39 RGPD)'
      );

      return NextResponse.json({
        userId: user.id,
        displayName: user.displayName,
        email: email, // Decrypted email for DPO
        tenantId: user.tenantId,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        { error: errorMessage },
        'GET /api/platform/users/[id]/email error'
      );
      return NextResponse.json(internalError(), { status: 500 });
    }
  })
);
