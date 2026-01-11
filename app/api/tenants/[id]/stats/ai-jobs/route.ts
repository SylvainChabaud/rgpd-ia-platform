/**
 * Tenant AI Jobs Stats API (Time Series)
 * LOT 12.0 - Dashboard Tenant Admin
 *
 * GET /api/tenants/:id/stats/ai-jobs
 * Provides tenant-scoped AI jobs time series for dashboard charts
 *
 * RGPD Compliance:
 * - P1 data only (aggregates per day)
 * - NO content (prompts, outputs)
 * - Tenant isolation enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext, isPlatformAdmin, isTenantAdmin } from '@/lib/requestContext';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError, notFoundError, validationError } from '@/lib/errorResponse';
import { getPool } from '@/infrastructure/db/pool';
import { z, ZodError } from 'zod';
import type { TenantAIJobsStatsResponse } from '@/types/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

/**
 * GET /api/tenants/:id/stats/ai-jobs - AI Jobs time series
 *
 * Query params:
 * - days: number of days to fetch (default: 30, max: 90)
 *
 * SECURITY:
 * - TENANT admin: can only access their own tenant stats
 * - PLATFORM admin: can access any tenant stats
 * - Other users: denied (403)
 */
export const GET = withLogging(
  withAuth(
    async (req: NextRequest, { params }: RouteParams) => {
      try {
        const context = requireContext(req);
        const { id: tenantId } = await params;

        // Security check: TENANT admin can only see their own tenant
        if (!isPlatformAdmin(context)) {
          if (!isTenantAdmin(context)) {
            return NextResponse.json(
              forbiddenError('Tenant admin access required'),
              { status: 403 }
            );
          }

          // CRITICAL RGPD: Tenant isolation check
          if (context.tenantId !== tenantId) {
            logger.warn(
              {
                actorId: context.userId,
                requestedTenantId: tenantId,
                actualTenantId: context.tenantId,
              },
              'Cross-tenant AI jobs stats access attempt blocked'
            );
            return NextResponse.json(
              forbiddenError('Access denied to this tenant'),
              { status: 403 }
            );
          }
        }

        // Parse query params
        const searchParams = req.nextUrl.searchParams;
        const rawParams = Object.fromEntries(searchParams.entries());

        let query;
        try {
          query = QuerySchema.parse(rawParams);
        } catch (error: unknown) {
          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }
          return NextResponse.json(validationError({}), { status: 400 });
        }

        const pool = getPool();

        // Check tenant exists
        const tenantCheck = await pool.query(
          'SELECT id FROM tenants WHERE id = $1 AND deleted_at IS NULL',
          [tenantId]
        );

        if (tenantCheck.rows.length === 0) {
          return NextResponse.json(notFoundError('Tenant'), { status: 404 });
        }

        // Fetch AI jobs time series (tenant-scoped)
        // RGPD: Only aggregates (counts per day), no content
        const aiJobsResult = await pool.query(
          `
          SELECT
            DATE(created_at) as date,
            COUNT(*) FILTER (WHERE status = 'COMPLETED') as success,
            COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
            COUNT(*) as total
          FROM ai_jobs
          WHERE tenant_id = $1
            AND created_at >= NOW() - INTERVAL '1 day' * $2
          GROUP BY DATE(created_at)
          ORDER BY date ASC
          `,
          [tenantId, query.days]
        );

        const stats = aiJobsResult.rows.map((row) => ({
          date: row.date.toISOString().split('T')[0], // YYYY-MM-DD
          success: parseInt(row.success || '0'),
          failed: parseInt(row.failed || '0'),
          total: parseInt(row.total || '0'),
        }));

        const response: TenantAIJobsStatsResponse = {
          stats,
          days: query.days,
        };

        logger.info(
          {
            actorId: context.userId,
            tenantId,
            days: query.days,
            dataPoints: stats.length,
          },
          'Tenant AI jobs stats fetched'
        );

        return NextResponse.json(response);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/tenants/[id]/stats/ai-jobs error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
