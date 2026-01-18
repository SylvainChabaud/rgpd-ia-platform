/**
 * Audit Stats Endpoint
 * LOT 11.3 - Audit & Monitoring
 *
 * GET /api/audit/stats
 * Returns audit retention statistics for RGPD compliance monitoring
 *
 * RGPD compliance:
 * - Art. 5.1.e: Storage limitation (12 months retention)
 * - CNIL Recommendation: 6-12 months for audit logs
 * - PLATFORM admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext, isPlatformAdmin } from '@/lib/requestContext';
import { pool } from '@/infrastructure/db/pg';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError } from '@/lib/errorResponse';

const RETENTION_MONTHS = 12;

/**
 * GET /api/audit/stats - Get audit retention statistics
 *
 * Returns:
 * - totalEvents: Total number of audit events
 * - oldestEventAge: Age of oldest event in days
 * - rgpdCompliant: Whether all events are within retention period
 * - retentionMonths: Configured retention period
 */
export const GET = withLogging(
  withAuth(
    async (req: NextRequest) => {
      try {
        const context = requireContext(req);

        // PLATFORM admin only
        if (!isPlatformAdmin(context)) {
          return NextResponse.json(
            forbiddenError('Platform admin access required'),
            { status: 403 }
          );
        }

        // Get total events count
        const countResult = await pool.query(
          'SELECT COUNT(*) as total FROM audit_events'
        );
        const totalEvents = parseInt(countResult.rows[0].total, 10);

        // Get oldest event age in days
        const oldestResult = await pool.query(`
          SELECT
            EXTRACT(DAY FROM (NOW() - MIN(created_at))) as oldest_age_days
          FROM audit_events
        `);
        const oldestEventAge = oldestResult.rows[0].oldest_age_days
          ? Math.floor(parseFloat(oldestResult.rows[0].oldest_age_days))
          : null;

        // Check if compliant (all events < 12 months = 365 days)
        const maxAgeDays = RETENTION_MONTHS * 30; // ~365 days
        const rgpdCompliant = oldestEventAge === null || oldestEventAge <= maxAgeDays;

        logger.info({
          actorId: context.userId,
          totalEvents,
          oldestEventAge,
          rgpdCompliant,
        }, 'Audit stats retrieved');

        return NextResponse.json({
          totalEvents,
          oldestEventAge,
          rgpdCompliant,
          retentionMonths: RETENTION_MONTHS,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/audit/stats error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
