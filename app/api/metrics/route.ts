/**
 * Metrics Export Endpoint - RGPD-Safe
 * LOT 6.1 - Observabilité RGPD-safe
 *
 * Returns aggregated metrics (P0/P1 only):
 * - HTTP request counts/durations
 * - Database query stats
 * - AI invocation stats
 * - RGPD operation counts
 *
 * SECURITY:
 * - Internal use only (add auth in production)
 * - NO sensitive labels (user IDs, tenant IDs)
 * - Only aggregated counts
 *
 * USAGE:
 *   GET /api/metrics
 *   Returns: { timestamp, counters: {...}, histograms: {...} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/infrastructure/logging/metrics';
import { logger, LogEvent } from '@/infrastructure/logging/logger';

/**
 * Metrics export handler
 * TODO LOT 5.3: Add authentication (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    // Export all metrics
    const snapshot = metrics.export();

    // Log metrics export (P1 event)
    logger.debug(
      {
        event: LogEvent.METRICS_EXPORT,
      },
      'Metrics exported'
    );

    return NextResponse.json(snapshot, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      {
        event: LogEvent.HTTP_ERROR,
        path: '/api/metrics',
        error: errorMessage,
      },
      'Metrics export failed'
    );

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
