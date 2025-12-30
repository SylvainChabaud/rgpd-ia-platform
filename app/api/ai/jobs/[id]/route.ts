/**
 * AI Job Detail Endpoint
 * LOT 5.3 - API Layer
 *
 * GET /api/ai/jobs/:id
 * Get AI job details
 *
 * RGPD compliance:
 * - User can only see their own jobs
 * - Tenant isolation enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withCurrentUser } from '@/middleware/tenant';
import { requireContext } from '@/lib/requestContext';
import { PgAiJobRepo } from '@/infrastructure/repositories/PgAiJobRepo';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError } from '@/lib/errorResponse';

/**
 * GET /api/ai/jobs/:id - Get job details
 */
export const GET = withLogging(
  withAuth(
    withCurrentUser(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: jobId } = await params;

          if (!jobId) {
            return NextResponse.json(notFoundError('Job'), { status: 404 });
          }

          // Fetch job
          const aiJobRepo = new PgAiJobRepo();
          const job = await aiJobRepo.findById(context.tenantId!, jobId);

          if (!job) {
            return NextResponse.json(notFoundError('Job'), { status: 404 });
          }

          // SECURITY: Verify job belongs to current user
          if (job.userId !== context.userId) {
            logger.warn({
              jobId,
              requestingUserId: context.userId,
              jobUserId: job.userId,
            }, 'Unauthorized AI job access attempt');
            return NextResponse.json(forbiddenError('You can only view your own jobs'), { status: 403 });
          }

          logger.info({
            jobId,
            userId: context.userId,
            tenantId: context.tenantId,
          }, 'AI job retrieved');

          return NextResponse.json({
            job: {
              id: job.id,
              purpose: job.purpose,
              modelRef: job.modelRef,
              status: job.status,
              createdAt: job.createdAt,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/ai/jobs/:id error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
