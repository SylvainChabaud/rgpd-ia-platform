/**
 * AI Jobs List Endpoint
 * LOT 5.3 - API Layer
 *
 * GET /api/ai/jobs
 * List AI jobs for current user
 *
 * RGPD compliance:
 * - User can only see their own jobs
 * - Tenant isolation enforced
 * - Pagination support
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext } from '@/lib/requestContext';
import { PgAiJobRepo } from '@/infrastructure/repositories/PgAiJobRepo';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';

const QuerySchema = z.object({
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/ai/jobs - List user's AI jobs
 */
export const GET = withLogging(
  withAuth(
    async (req: NextRequest) => {
      try {
        const context = requireContext(req);

        // Parse query params
        const searchParams = req.nextUrl.searchParams;
        const params = Object.fromEntries(searchParams.entries());

        let query;
        try {
          query = QuerySchema.parse(params);
        } catch (error: unknown) {
          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }
          return NextResponse.json(validationError({}), { status: 400 });
        }

        // Fetch user's jobs
        const aiJobRepo = new PgAiJobRepo();
        let jobs = await aiJobRepo.findByUser(
          context.tenantId!,
          context.userId,
          query.limit
        );

        // Filter by status if provided
        if (query.status) {
          jobs = jobs.filter(job => job.status === query.status);
        }

        // Apply pagination
        const paginatedJobs = jobs.slice(query.offset, query.offset + query.limit);

        logger.info({
          userId: context.userId,
          tenantId: context.tenantId,
          count: paginatedJobs.length,
        }, 'AI jobs listed');

        return NextResponse.json({
          jobs: paginatedJobs.map(job => ({
            id: job.id,
            purpose: job.purpose,
            modelRef: job.modelRef,
            status: job.status,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
          })),
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/ai/jobs error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
