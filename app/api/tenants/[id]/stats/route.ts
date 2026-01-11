/**
 * Tenant Stats API
 * LOT 12.0 - Dashboard Tenant Admin
 *
 * GET /api/tenants/:id/stats
 * Provides tenant-scoped statistics for dashboard
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, counts)
 * - Tenant isolation enforced: TENANT admin sees only their tenant
 * - PLATFORM admin can view any tenant stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext, isPlatformAdmin, isTenantAdmin } from '@/lib/requestContext';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError, notFoundError } from '@/lib/errorResponse';
import { getPool } from '@/infrastructure/db/pool';
import type { TenantDashboardStats } from '@/types/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tenants/:id/stats - Tenant dashboard statistics
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
              'Cross-tenant access attempt blocked'
            );
            return NextResponse.json(
              forbiddenError('Access denied to this tenant'),
              { status: 403 }
            );
          }
        }

        const pool = getPool();

        // Check tenant exists and get name (P1 data - safe for tenant admin)
        const tenantCheck = await pool.query(
          'SELECT id, name FROM tenants WHERE id = $1 AND deleted_at IS NULL',
          [tenantId]
        );

        if (tenantCheck.rows.length === 0) {
          return NextResponse.json(notFoundError('Tenant'), { status: 404 });
        }

        // Tenant name is P1 data (organization name, not personal data)
        const tenantName = tenantCheck.rows[0].name;

        // Fetch stats in parallel (all tenant-scoped)
        const [
          usersResult,
          aiJobsResult,
          consentsResult,
          rgpdExportsResult,
          rgpdDeletionsResult,
        ] = await Promise.all([
          // Users stats (tenant-scoped)
          pool.query(
            `
            SELECT
              COUNT(*) FILTER (WHERE deleted_at IS NULL AND data_suspended = false) as active,
              COUNT(*) FILTER (WHERE deleted_at IS NOT NULL OR data_suspended = true) as suspended,
              COUNT(*) as total
            FROM users
            WHERE tenant_id = $1
            `,
            [tenantId]
          ),

          // AI Jobs stats (this month, tenant-scoped)
          pool.query(
            `
            SELECT
              COUNT(*) FILTER (WHERE status = 'COMPLETED') as success,
              COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
              COUNT(*) as total
            FROM ai_jobs
            WHERE tenant_id = $1
              AND created_at >= DATE_TRUNC('month', NOW())
            `,
            [tenantId]
          ),

          // Consents stats (tenant-scoped)
          // Schema: granted (boolean), granted_at (timestamp), revoked_at (timestamp)
          pool.query(
            `
            SELECT
              COUNT(*) FILTER (WHERE granted = true AND revoked_at IS NULL) as granted,
              COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked,
              COUNT(*) FILTER (WHERE granted = false AND revoked_at IS NULL) as pending
            FROM consents
            WHERE tenant_id = $1
            `,
            [tenantId]
          ),

          // RGPD exports (tenant-scoped)
          pool.query(
            `
            SELECT
              COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
              COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed
            FROM rgpd_requests
            WHERE tenant_id = $1 AND type = 'EXPORT'
            `,
            [tenantId]
          ),

          // RGPD deletions (tenant-scoped)
          pool.query(
            `
            SELECT
              COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
              COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed
            FROM rgpd_requests
            WHERE tenant_id = $1 AND type = 'DELETE'
            `,
            [tenantId]
          ),
        ]);

        const stats: TenantDashboardStats = {
          users: {
            active: parseInt(usersResult.rows[0]?.active || '0'),
            suspended: parseInt(usersResult.rows[0]?.suspended || '0'),
            total: parseInt(usersResult.rows[0]?.total || '0'),
          },
          aiJobs: {
            success: parseInt(aiJobsResult.rows[0]?.success || '0'),
            failed: parseInt(aiJobsResult.rows[0]?.failed || '0'),
            total: parseInt(aiJobsResult.rows[0]?.total || '0'),
            month: new Date().toISOString().slice(0, 7), // YYYY-MM
          },
          consents: {
            granted: parseInt(consentsResult.rows[0]?.granted || '0'),
            revoked: parseInt(consentsResult.rows[0]?.revoked || '0'),
            pending: parseInt(consentsResult.rows[0]?.pending || '0'),
          },
          rgpd: {
            exports: {
              pending: parseInt(rgpdExportsResult.rows[0]?.pending || '0'),
              completed: parseInt(rgpdExportsResult.rows[0]?.completed || '0'),
            },
            deletions: {
              pending: parseInt(rgpdDeletionsResult.rows[0]?.pending || '0'),
              completed: parseInt(rgpdDeletionsResult.rows[0]?.completed || '0'),
            },
          },
        };

        logger.info(
          {
            actorId: context.userId,
            tenantId,
            scope: context.scope,
          },
          'Tenant stats fetched'
        );

        // Return stats with tenant name (P1 data)
        return NextResponse.json({ stats, tenantName });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/tenants/[id]/stats error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
