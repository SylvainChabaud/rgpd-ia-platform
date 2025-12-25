/**
 * Health Check Endpoint - RGPD-Safe
 * LOT 6.1 - Observabilité RGPD-safe
 *
 * Returns:
 * - Application status
 * - Database connectivity
 * - Uptime
 * - NO sensitive data
 *
 * USAGE:
 *   GET /api/health
 *   Returns: { status: 'ok', uptime: 12345, checks: {...} }
 */

import { NextResponse } from 'next/server';
import { pool } from '@/infrastructure/db/pg';
import { logger, LogEvent } from '@/infrastructure/logging/logger';

// Track application start time
const startTime = Date.now();

/**
 * Health check handler
 * Public endpoint - no authentication required
 */
export async function GET() {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // Check 1: Database connectivity
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    checks.database = {
      status: 'unhealthy',
      error: errorMessage,
    };
    logger.error(
      {
        event: LogEvent.HEALTH_CHECK,
        component: 'database',
        error: errorMessage,
      },
      'Database health check failed'
    );
  }

  // Check 2: Application uptime
  const uptime = Date.now() - startTime;
  checks.application = {
    status: 'healthy',
    latency: uptime,
  };

  // Determine overall status
  const isHealthy = Object.values(checks).every((check) => check.status === 'healthy');
  const overallStatus = isHealthy ? 'ok' : 'degraded';

  // Log health check (sampling: only log failures)
  if (!isHealthy) {
    logger.warn(
      {
        event: LogEvent.HEALTH_CHECK,
        status: overallStatus,
        checks,
      },
      'Health check degraded'
    );
  }

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime,
    checks,
  };

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
