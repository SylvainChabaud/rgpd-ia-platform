/**
 * User Stats Endpoint (Tenant-scoped)
 * LOT 12.1 - Tenant User Management
 *
 * GET /api/users/:id/stats - Get user statistics (jobs count, consents count)
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Only P1 aggregated data (counts)
 * - No P2/P3 content exposed
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { pool } from '@/infrastructure/db/pg';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError } from '@/lib/errorResponse';

/**
 * GET /api/users/:id/stats - Get user statistics
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
            }, 'Cross-tenant stats access attempt blocked');
            return NextResponse.json(forbiddenError('Cross-tenant access denied'), { status: 403 });
          }

          // Fetch stats in parallel
          const [jobsResult, consentsResult, auditResult] = await Promise.all([
            // AI Jobs count by status
            pool.query(
              `SELECT
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as success,
                COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
                COUNT(*) as total
               FROM ai_jobs
               WHERE tenant_id = $1 AND user_id = $2`,
              [context.tenantId, userId]
            ),
            // Consents count
            pool.query(
              `SELECT
                COUNT(*) FILTER (WHERE granted = true AND revoked_at IS NULL) as granted,
                COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked,
                COUNT(*) as total
               FROM consents
               WHERE tenant_id = $1 AND user_id = $2`,
              [context.tenantId, userId]
            ),
            // Audit events count
            pool.query(
              `SELECT COUNT(*) as total
               FROM audit_events
               WHERE tenant_id = $1 AND (actor_id = $2 OR target_id = $2)`,
              [context.tenantId, userId]
            ),
          ]);

          const stats = {
            jobs: {
              success: parseInt(jobsResult.rows[0]?.success || '0', 10),
              failed: parseInt(jobsResult.rows[0]?.failed || '0', 10),
              total: parseInt(jobsResult.rows[0]?.total || '0', 10),
            },
            consents: {
              granted: parseInt(consentsResult.rows[0]?.granted || '0', 10),
              revoked: parseInt(consentsResult.rows[0]?.revoked || '0', 10),
              total: parseInt(consentsResult.rows[0]?.total || '0', 10),
            },
            auditEvents: {
              total: parseInt(auditResult.rows[0]?.total || '0', 10),
            },
          };

          logger.info({
            userId,
            tenantId: context.tenantId,
          }, 'User stats fetched');

          return NextResponse.json({ stats });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/users/:id/stats error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
