/**
 * Global Platform Stats API
 * LOT 11.3 - Audit & Monitoring Dashboard
 *
 * GET /api/stats/global
 * Provides global platform statistics (Super Admin only)
 *
 * RGPD Compliance:
 * - P1 data only (metadata, aggregates)
 * - No sensitive user content
 * - Tenant isolation enforced for TENANT_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext, isPlatformAdmin } from '@/lib/requestContext';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError } from '@/lib/errorResponse';
import { getPool } from '@/infrastructure/db/pool';

/**
 * GET /api/stats/global - Global platform statistics
 *
 * SECURITY:
 * - PLATFORM admin: all platform stats
 * - TENANT admin: denied (use tenant-specific stats)
 * - Regular users: denied
 */
export const GET = withLogging(
  withAuth(
    async (req: NextRequest) => {
      try {
        const context = requireContext(req);

        // Check if user is PLATFORM admin
        if (!isPlatformAdmin(context)) {
          return NextResponse.json(
            forbiddenError('PLATFORM admin access required'),
            { status: 403 }
          );
        }

        const pool = getPool();

        // Fetch stats in parallel
        const [
          tenantsResult,
          usersResult,
          aiJobsResult,
          rgpdExportsResult,
          rgpdDeletionsResult,
          incidentsResult,
        ] = await Promise.all([
          // Total tenants (active vs suspended)
          pool.query(`
            SELECT
              COUNT(*) FILTER (WHERE suspended_at IS NULL AND deleted_at IS NULL) as active,
              COUNT(*) FILTER (WHERE suspended_at IS NOT NULL AND deleted_at IS NULL) as suspended,
              COUNT(*) FILTER (WHERE deleted_at IS NULL) as total
            FROM tenants
          `),

          // Total users (active vs suspended/deleted, excluding users from suspended tenants)
          pool.query(`
            SELECT
              COUNT(*) FILTER (WHERE u.deleted_at IS NULL AND u.data_suspended = false AND (u.tenant_id IS NULL OR t.suspended_at IS NULL)) as active,
              COUNT(*) FILTER (WHERE u.deleted_at IS NOT NULL OR u.data_suspended = true OR (u.tenant_id IS NOT NULL AND t.suspended_at IS NOT NULL)) as suspended,
              COUNT(*) as total
            FROM users u
            LEFT JOIN tenants t ON u.tenant_id = t.id
          `),

          // AI jobs (this month, success vs failed)
          pool.query(`
            SELECT
              COUNT(*) FILTER (WHERE status = 'COMPLETED') as success,
              COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
              COUNT(*) as total
            FROM ai_jobs
            WHERE created_at >= DATE_TRUNC('month', NOW())
          `),

          // RGPD exports (pending vs completed)
          pool.query(`
            SELECT
              COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
              COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
              COUNT(*) as total
            FROM rgpd_requests
            WHERE type = 'EXPORT'
          `),

          // RGPD deletions (pending vs completed)
          pool.query(`
            SELECT
              COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
              COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
              COUNT(*) as total
            FROM rgpd_requests
            WHERE type = 'DELETE'
          `),

          // Security incidents (unresolved)
          pool.query(`
            SELECT
              COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
              COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved,
              COUNT(*) as total
            FROM security_incidents
          `),
        ]);

        const stats = {
          tenants: {
            active: parseInt(tenantsResult.rows[0]?.active || '0'),
            suspended: parseInt(tenantsResult.rows[0]?.suspended || '0'),
            total: parseInt(tenantsResult.rows[0]?.total || '0'),
          },
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
          rgpd: {
            exports: {
              pending: parseInt(rgpdExportsResult.rows[0]?.pending || '0'),
              completed: parseInt(rgpdExportsResult.rows[0]?.completed || '0'),
              total: parseInt(rgpdExportsResult.rows[0]?.total || '0'),
            },
            deletions: {
              pending: parseInt(rgpdDeletionsResult.rows[0]?.pending || '0'),
              completed: parseInt(rgpdDeletionsResult.rows[0]?.completed || '0'),
              total: parseInt(rgpdDeletionsResult.rows[0]?.total || '0'),
            },
          },
          incidents: {
            unresolved: parseInt(incidentsResult.rows[0]?.unresolved || '0'),
            resolved: parseInt(incidentsResult.rows[0]?.resolved || '0'),
            total: parseInt(incidentsResult.rows[0]?.total || '0'),
          },
        };

        logger.info(
          {
            actorId: context.userId,
            scope: context.scope,
          },
          'Global stats fetched'
        );

        return NextResponse.json({ stats });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/stats/global error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
