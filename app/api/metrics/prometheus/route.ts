/**
 * Prometheus Metrics Endpoint
 * LOT 6.1 - Prometheus Integration
 *
 * Returns metrics in Prometheus text format (OpenMetrics)
 *
 * SECURITY:
 * - TODO LOT 5.3: Add authentication (internal/monitoring only)
 * - NO sensitive data in labels (RGPD-safe)
 *
 * USAGE:
 *   GET /api/metrics/prometheus
 *   Content-Type: text/plain; version=0.0.4
 *
 * Prometheus scrape config:
 *   scrape_configs:
 *     - job_name: 'rgpd-platform'
 *       static_configs:
 *         - targets: ['localhost:3000']
 *       metrics_path: '/api/metrics/prometheus'
 */

import { NextResponse } from 'next/server';
import { metrics } from '@/infrastructure/logging/metrics';
import { formatPrometheus, validatePrometheusFormat } from '@/infrastructure/logging/prometheusFormatter';
import { logger, LogEvent } from '@/infrastructure/logging/logger';

/**
 * Prometheus metrics export handler
 *
 * Returns metrics in Prometheus text format
 */
export async function GET() {
  try {
    // Export metrics snapshot
    const snapshot = metrics.export();

    // Format as Prometheus text
    const prometheusText = formatPrometheus(snapshot);

    // Validate format (RGPD safety check)
    const validation = validatePrometheusFormat(prometheusText);
    if (!validation.valid) {
      logger.error(
        {
          event: LogEvent.METRICS_EXPORT,
          errors: validation.errors.join(', '),
        },
        'Prometheus format validation failed'
      );

      return NextResponse.json(
        {
          error: 'Metrics validation failed',
          details: validation.errors,
        },
        { status: 500 }
      );
    }

    // Log successful export (debug level)
    logger.debug(
      {
        event: LogEvent.METRICS_EXPORT,
        format: 'prometheus',
      },
      'Prometheus metrics exported'
    );

    // Return Prometheus text format
    return new NextResponse(prometheusText, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      {
        event: LogEvent.HTTP_ERROR,
        path: '/api/metrics/prometheus',
        error: errorMessage,
      },
      'Prometheus metrics export failed'
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
