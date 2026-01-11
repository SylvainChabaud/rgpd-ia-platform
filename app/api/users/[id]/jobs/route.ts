/**
 * User Jobs Endpoint (Tenant-scoped)
 * LOT 12.1 - Tenant User Management
 *
 * GET /api/users/:id/jobs - Get user AI jobs history (paginated)
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Only P1 metadata (no prompt/output content - P3)
 * - Pagination with max 100 items
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { pool } from '@/infrastructure/db/pg';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError, validationError } from '@/lib/errorResponse';

/**
 * GET /api/users/:id/jobs - Get user AI jobs history
 *
 * Query params:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 */
export const GET = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: userId } = await params;

          if (!userId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Parse query params
          const searchParams = req.nextUrl.searchParams;
          const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
          const offset = parseInt(searchParams.get('offset') || '0', 10);

          if (isNaN(limit) || limit < 1 || isNaN(offset) || offset < 0) {
            return NextResponse.json(validationError({ message: 'Invalid pagination params' }), { status: 400 });
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
            }, 'Cross-tenant jobs access attempt blocked');
            return NextResponse.json(forbiddenError('Cross-tenant access denied'), { status: 403 });
          }

          // Fetch AI jobs (metadata only - NO prompt/output content)
          // Note: Using actual schema columns (model_ref, started_at - no latency_ms)
          const result = await pool.query(
            `SELECT
               id,
               purpose,
               model_ref,
               status,
               created_at,
               started_at,
               completed_at,
               CASE
                 WHEN started_at IS NOT NULL AND completed_at IS NOT NULL
                 THEN EXTRACT(MILLISECONDS FROM (completed_at - started_at))::INTEGER
                 ELSE NULL
               END as latency_ms
             FROM ai_jobs
             WHERE tenant_id = $1 AND user_id = $2
             ORDER BY created_at DESC
             LIMIT $3 OFFSET $4`,
            [context.tenantId, userId, limit, offset]
          );

          // Get total count
          const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM ai_jobs WHERE tenant_id = $1 AND user_id = $2`,
            [context.tenantId, userId]
          );

          const jobs = result.rows.map((row) => ({
            id: row.id,
            purpose: row.purpose,
            model: row.model_ref,
            status: row.status,
            latencyMs: row.latency_ms,
            createdAt: row.created_at?.toISOString() || null,
            completedAt: row.completed_at?.toISOString() || null,
          }));

          logger.info({
            userId,
            tenantId: context.tenantId,
            count: jobs.length,
          }, 'User jobs fetched');

          return NextResponse.json({
            jobs,
            total: parseInt(countResult.rows[0]?.total || '0', 10),
            limit,
            offset,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/users/:id/jobs error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
