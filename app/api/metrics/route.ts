/**
 * Metrics Export Endpoint - RGPD-Safe
 * LOT 6.1 - Observabilité RGPD-safe
 * LOT 5.3 - Authentication (PLATFORM admin only)
 *
 * Returns aggregated metrics (P0/P1 only):
 * - HTTP request counts/durations
 * - Database query stats
 * - AI invocation stats
 * - RGPD operation counts
 *
 * SECURITY:
 * - PLATFORM admin only (enforced by withPlatformAdmin middleware)
 * - NO sensitive labels (user IDs, tenant IDs)
 * - Only aggregated counts
 *
 * USAGE:
 *   GET /api/metrics
 *   Headers: Authorization: Bearer <platform-admin-token>
 *   Returns: { timestamp, counters: {...}, histograms: {...} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/infrastructure/logging/metrics';
import { logger, LogEvent } from '@/infrastructure/logging/logger';
import { withAuth } from '@/middleware/auth';
import { withPlatformAdmin } from '@/middleware/rbac';
import { forbiddenError } from '@/lib/errorResponse';
import type { UserContext } from '@/lib/requestContext';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Metrics export handler
 * LOT 5.3: Authentication added - PLATFORM admin only
 */
async function metricsHandler(req: NextRequest) {
  const user = (req as NextRequest & { user?: UserContext }).user;

  // Extra safety check (withPlatformAdmin middleware should already enforce this)
  if (!user || user.scope !== ACTOR_SCOPE.PLATFORM) {
    logger.warn(
      {
        event: LogEvent.HTTP_ERROR,
        path: '/api/metrics',
        userId: user?.userId,
        scope: user?.scope,
      },
      'Unauthorized metrics access attempt'
    );

    return NextResponse.json(
      forbiddenError('PLATFORM admin access required for metrics'),
      { status: 403 }
    );
  }
  try {
    // Export all metrics
    const snapshot = metrics.export();

    // Log metrics export (P1 event with admin userId)
    logger.debug(
      {
        event: LogEvent.METRICS_EXPORT,
        userId: user.userId,
        scope: user.scope,
      },
      'Metrics exported by PLATFORM admin'
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
        userId: user?.userId,
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

// Apply middleware stack: auth → platform admin check
export const GET = withAuth(withPlatformAdmin(metricsHandler));
