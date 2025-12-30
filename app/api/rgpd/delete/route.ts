/**
 * RGPD Delete Endpoint
 * LOT 5.3 - API Layer
 *
 * POST /api/rgpd/delete
 * Request deletion of user data (Art. 17 - Right to erasure)
 *
 * RGPD compliance:
 * - User can only delete their own data
 * - Tenant isolation enforced
 * - Audit event emitted
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withCurrentUser } from '@/middleware/tenant';
import { requireContext } from '@/lib/requestContext';
import { deleteUserData } from '@/app/usecases/rgpd/deleteUserData';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgConsentRepo } from '@/infrastructure/repositories/PgConsentRepo';
import { PgAiJobRepo } from '@/infrastructure/repositories/PgAiJobRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError } from '@/lib/errorResponse';

export const POST = withLogging(
  withAuth(
    withCurrentUser(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // SECURITY: User can only delete their own data
          // tenantId and userId are already validated by withCurrentUser middleware

          const result = await deleteUserData(
            new PgRgpdRequestRepo(),
            new PgAuditEventWriter(),
            {
              tenantId: context.tenantId!,
              userId: context.userId,
            }
          );

          logger.info({
            userId: context.userId,
            tenantId: context.tenantId,
            requestId: result.requestId,
          }, 'RGPD deletion requested');

          return NextResponse.json({
            requestId: result.requestId,
            scheduledPurgeAt: result.scheduledPurgeAt,
            deletedAt: result.deletedAt,
            message: 'Deletion request created. Data will be soft-deleted immediately and purged after retention period.',
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/rgpd/delete error');

          if (errorMessage.includes('VIOLATION')) {
            return NextResponse.json(forbiddenError(errorMessage), { status: 403 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
