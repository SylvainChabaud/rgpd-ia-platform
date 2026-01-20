/**
 * RGPD Stats API (Time Series)
 * LOT 11.3 - Audit & Monitoring Dashboard
 *
 * GET /api/stats/rgpd
 * Provides RGPD requests statistics over time
 *
 * RGPD Compliance:
 * - P1 data only (counts, no user data)
 * - Time-series for exports/deletions
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
 * GET /api/stats/rgpd - RGPD requests time series
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

        // Fetch RGPD stats per day (exports, deletions, contests, oppositions, suspensions)
        // SECURITY: Use parameterized queries with make_interval() to prevent SQL injection
        const [exportsResult, deletionsResult, contestsResult, oppositionsResult, suspensionsResult] = await Promise.all([
          // Exports
          pool.query(
            `
            SELECT
              DATE(created_at) as date,
              COUNT(*) as count
            FROM rgpd_requests
            WHERE created_at >= NOW() - make_interval(days => $1)
              AND type = 'EXPORT'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
            `,
            [query.days]
          ),

          // Deletions
          pool.query(
            `
            SELECT
              DATE(created_at) as date,
              COUNT(*) as count
            FROM rgpd_requests
            WHERE created_at >= NOW() - make_interval(days => $1)
              AND type = 'DELETE'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
            `,
            [query.days]
          ),

          // Contests (Art. 22)
          pool.query(
            `
            SELECT
              DATE(created_at) as date,
              COUNT(*) as count
            FROM user_disputes
            WHERE created_at >= NOW() - make_interval(days => $1)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
            `,
            [query.days]
          ),

          // Oppositions (Art. 21)
          pool.query(
            `
            SELECT
              DATE(created_at) as date,
              COUNT(*) as count
            FROM user_oppositions
            WHERE created_at >= NOW() - make_interval(days => $1)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
            `,
            [query.days]
          ),

          // Suspensions (Art. 18)
          pool.query(
            `
            SELECT
              DATE(data_suspended_at) as date,
              COUNT(*) as count
            FROM users
            WHERE data_suspended_at >= NOW() - make_interval(days => $1)
            GROUP BY DATE(data_suspended_at)
            ORDER BY date ASC
            `,
            [query.days]
          ),
        ]);

        const stats = {
          exports: exportsResult.rows.map((row) => ({
            date: row.date,
            count: parseInt(row.count),
          })),
          deletions: deletionsResult.rows.map((row) => ({
            date: row.date,
            count: parseInt(row.count),
          })),
          contests: contestsResult.rows.map((row) => ({
            date: row.date,
            count: parseInt(row.count),
          })),
          oppositions: oppositionsResult.rows.map((row) => ({
            date: row.date,
            count: parseInt(row.count),
          })),
          suspensions: suspensionsResult.rows.map((row) => ({
            date: row.date,
            count: parseInt(row.count),
          })),
        };

        logger.info(
          {
            actorId: context.userId,
            days: query.days,
          },
          'RGPD stats fetched'
        );

        return NextResponse.json({ stats, days: query.days });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/stats/rgpd error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
