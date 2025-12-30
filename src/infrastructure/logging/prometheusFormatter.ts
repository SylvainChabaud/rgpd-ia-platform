/**
 * Prometheus Format Exporter
 * LOT 6.1 - Prometheus/Grafana Integration
 *
 * Converts internal metrics to Prometheus text format (OpenMetrics)
 *
 * RGPD Compliance:
 * - NO sensitive labels (user IDs, tenant IDs filtered out)
 * - Only aggregated metrics (P0/P1 dimensions)
 * - No cardinality explosion
 *
 * Format: https://prometheus.io/docs/instrumenting/exposition_formats/
 */

import type { MetricsSnapshot } from './metrics';

/**
 * Converts metrics snapshot to Prometheus text format
 *
 * @param snapshot - Metrics snapshot from metrics registry
 * @returns Prometheus-formatted text (text/plain; version=0.0.4)
 *
 * @example
 * const snapshot = metrics.export();
 * const prometheusText = formatPrometheus(snapshot);
 * // # HELP http_requests_total Total HTTP requests
 * // # TYPE http_requests_total counter
 * // http_requests_total{method="GET",path="/api/users",status="200"} 42
 */
export function formatPrometheus(snapshot: MetricsSnapshot): string {
  const lines: string[] = [];

  // Add timestamp comment
  lines.push(`# Timestamp: ${snapshot.timestamp}`);
  lines.push('');

  // Export counters
  for (const [metricName, labeledValues] of Object.entries(snapshot.counters)) {
    // Add HELP and TYPE directives
    lines.push(`# HELP ${metricName} ${getMetricHelp(metricName)}`);
    lines.push(`# TYPE ${metricName} counter`);

    // Add metric values with labels
    for (const [labelString, value] of Object.entries(labeledValues)) {
      const formattedLabels = labelString ? `{${labelString}}` : '';
      lines.push(`${metricName}${formattedLabels} ${value}`);
    }

    lines.push('');
  }

  // Export histograms as summaries (p50, p95, p99)
  for (const [metricName, stats] of Object.entries(snapshot.histograms)) {
    lines.push(`# HELP ${metricName} ${getMetricHelp(metricName)}`);
    lines.push(`# TYPE ${metricName} summary`);

    // Count and sum
    lines.push(`${metricName}_count ${stats.count}`);
    lines.push(`${metricName}_sum ${stats.sum}`);

    // Quantiles (percentiles)
    lines.push(`${metricName}{quantile="0.5"} ${stats.p50}`);
    lines.push(`${metricName}{quantile="0.95"} ${stats.p95}`);
    lines.push(`${metricName}{quantile="0.99"} ${stats.p99}`);

    // Additional stats (min, max, avg) as separate metrics
    lines.push(`${metricName}_min ${stats.min}`);
    lines.push(`${metricName}_max ${stats.max}`);
    lines.push(`${metricName}_avg ${stats.avg}`);

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get human-readable help text for a metric
 */
function getMetricHelp(metricName: string): string {
  const helpTexts: Record<string, string> = {
    // HTTP metrics
    http_requests_total: 'Total number of HTTP requests',
    http_request_duration_ms: 'HTTP request duration in milliseconds',
    http_errors_total: 'Total number of HTTP errors (status >= 400)',

    // Database metrics
    db_queries_total: 'Total number of database queries',
    db_query_duration_ms: 'Database query duration in milliseconds',
    db_errors_total: 'Total number of database errors',

    // AI/LLM metrics
    ai_invocations_total: 'Total number of AI/LLM invocations',
    ai_invocation_duration_ms: 'AI invocation duration in milliseconds',
    ai_errors_total: 'Total number of AI invocation errors',

    // RGPD metrics
    rgpd_consents_total: 'Total number of RGPD consent operations',
    rgpd_exports_total: 'Total number of RGPD data exports',
    rgpd_deletions_total: 'Total number of RGPD deletion requests',
    rgpd_purges_total: 'Total number of RGPD data purges',

    // Authentication metrics
    auth_attempts_total: 'Total number of authentication attempts',
    auth_failures_total: 'Total number of authentication failures',

    // Job metrics
    jobs_executed_total: 'Total number of background jobs executed',
    job_duration_ms: 'Background job duration in milliseconds',
    job_errors_total: 'Total number of background job errors',
  };

  return helpTexts[metricName] || `Metric ${metricName}`;
}

/**
 * Validate Prometheus format output
 *
 * Basic validation to ensure output is well-formed
 */
export function validatePrometheusFormat(text: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for HELP directives
  if (!text.includes('# HELP')) {
    errors.push('Missing HELP directives');
  }

  // Check for TYPE directives
  if (!text.includes('# TYPE')) {
    errors.push('Missing TYPE directives');
  }

  // Check for metric lines (name + value)
  const metricLinePattern = /^[a-z_][a-z0-9_]*(\{[^}]+\})?\s+[\d.]+$/m;
  if (!metricLinePattern.test(text)) {
    errors.push('No valid metric lines found');
  }

  // Check for forbidden characters (sensitive data leak detection)
  if (text.match(/@/)) {
    errors.push('RGPD VIOLATION: Potential email in metrics');
  }

  // Check for UUID patterns (should use :id sanitization)
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  if (uuidPattern.test(text)) {
    errors.push('RGPD WARNING: UUID detected in metrics (may cause cardinality explosion)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
