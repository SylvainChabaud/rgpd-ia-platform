/**
 * AI Jobs Stats API (Time Series)
 * LOT 11.3 - Audit & Monitoring Dashboard
 *
 * GET /api/stats/ai-jobs
 * Provides AI jobs statistics over time (for charts)
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, no content)
 * - Time-series data for last 30 days
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext, isPlatformAdmin } from '@/lib/requestContext';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError, validationError } from '@/lib/errorResponse';
import { getPool } from '@/infrastructure/db/pool';
import { z, ZodError } from 'zod';

const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

/**
 * GET /api/stats/ai-jobs - AI jobs time series
 *
 * Query params:
 * - days: number of days to fetch (default: 30, max: 90)
 *
 * SECURITY: PLATFORM admin only
 */
export const GET = withLogging(
  withAuth(
    async (req: NextRequest) => {
      try {
        const context = requireContext(req);

        if (!isPlatformAdmin(context)) {
          return NextResponse.json(
            forbiddenError('PLATFORM admin access required'),
            { status: 403 }
          );
        }

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

        const pool = getPool();

        // Fetch AI jobs stats per day (last N days)
        const result = await pool.query(
          `
          SELECT
            DATE(created_at) as date,
            COUNT(*) FILTER (WHERE status = 'COMPLETED') as success,
            COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
            COUNT(*) as total
          FROM ai_jobs
          WHERE created_at >= NOW() - INTERVAL '${query.days} days'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
          `
        );

        const stats = result.rows.map((row) => ({
          date: row.date,
          success: parseInt(row.success),
          failed: parseInt(row.failed),
          total: parseInt(row.total),
        }));

        logger.info(
          {
            actorId: context.userId,
            days: query.days,
            dataPoints: stats.length,
          },
          'AI jobs stats fetched'
        );

        return NextResponse.json({ stats, days: query.days });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/stats/ai-jobs error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
