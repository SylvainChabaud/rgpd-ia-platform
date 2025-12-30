/**
 * Simple Metrics System - RGPD-Safe
 * LOT 6.1 - Observabilité RGPD-safe
 *
 * RGPD COMPLIANCE:
 * - NO sensitive labels (user IDs, tenant IDs in labels)
 * - Only aggregated counts/durations
 * - P0/P1 dimensions only (event type, status code, method)
 *
 * FUTURE (LOT 6.2):
 * - Integration with Prometheus
 * - Grafana dashboards
 * - Alerting rules
 */

/**
 * Histogram stats type
 */
export interface HistogramStats {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Counter metric
 * Tracks occurrences of events
 */
class Counter {
  private counts: Map<string, number> = new Map();

  inc(labels: Record<string, string> = {}, value: number = 1) {
    const key = this.labelsToKey(labels);
    this.counts.set(key, (this.counts.get(key) || 0) + value);
  }

  get(labels: Record<string, string> = {}): number {
    const key = this.labelsToKey(labels);
    return this.counts.get(key) || 0;
  }

  reset() {
    this.counts.clear();
  }

  getAll(): Map<string, number> {
    return new Map(this.counts);
  }

  private labelsToKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
}

/**
 * Histogram metric
 * Tracks distribution of values (e.g., request durations)
 */
class Histogram {
  private sums: Map<string, number> = new Map();
  private counts: Map<string, number> = new Map();
  private buckets: Map<string, number[]> = new Map();

  observe(value: number, labels: Record<string, string> = {}) {
    const key = this.labelsToKey(labels);

    // Update sum
    this.sums.set(key, (this.sums.get(key) || 0) + value);

    // Update count
    this.counts.set(key, (this.counts.get(key) || 0) + 1);

    // Update buckets (simple implementation)
    if (!this.buckets.has(key)) {
      this.buckets.set(key, []);
    }
    this.buckets.get(key)!.push(value);
  }

  getStats(labels: Record<string, string> = {}) {
    const key = this.labelsToKey(labels);
    const sum = this.sums.get(key) || 0;
    const count = this.counts.get(key) || 0;
    const values = this.buckets.get(key) || [];

    return {
      count,
      sum,
      avg: count > 0 ? sum / count : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99),
    };
  }

  /**
   * Get aggregated stats across ALL labels (for export)
   * RGPD-safe: aggregates all values regardless of labels
   */
  getAllStats() {
    // Aggregate all values from all buckets
    const allValues: number[] = [];
    let totalSum = 0;
    let totalCount = 0;

    for (const [key, values] of this.buckets.entries()) {
      allValues.push(...values);
      totalSum += this.sums.get(key) || 0;
      totalCount += this.counts.get(key) || 0;
    }

    return {
      count: totalCount,
      sum: totalSum,
      avg: totalCount > 0 ? totalSum / totalCount : 0,
      min: allValues.length > 0 ? Math.min(...allValues) : 0,
      max: allValues.length > 0 ? Math.max(...allValues) : 0,
      p50: this.percentile(allValues, 0.5),
      p95: this.percentile(allValues, 0.95),
      p99: this.percentile(allValues, 0.99),
    };
  }

  reset() {
    this.sums.clear();
    this.counts.clear();
    this.buckets.clear();
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private labelsToKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
}

/**
 * Global metrics registry
 */
class MetricsRegistry {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  counter(name: string): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, new Counter());
    }
    return this.counters.get(name)!;
  }

  histogram(name: string): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Histogram());
    }
    return this.histograms.get(name)!;
  }

  /**
   * Export all metrics (for /api/metrics endpoint)
   * RGPD-safe: only aggregated data, no sensitive labels
   */
  export(): MetricsSnapshot {
    const counters: Record<string, Record<string, number>> = {};
    for (const [name, counter] of this.counters.entries()) {
      counters[name] = Object.fromEntries(counter.getAll());
    }

    const histograms: Record<string, HistogramStats> = {};
    for (const [name, histogram] of this.histograms.entries()) {
      // Export aggregated stats across all labels (RGPD-safe)
      histograms[name] = histogram.getAllStats();
    }

    return {
      timestamp: new Date().toISOString(),
      counters,
      histograms,
    };
  }

  reset() {
    for (const counter of this.counters.values()) {
      counter.reset();
    }
    for (const histogram of this.histograms.values()) {
      histogram.reset();
    }
  }
}

export interface MetricsSnapshot {
  timestamp: string;
  counters: Record<string, Record<string, number>>;
  histograms: Record<string, HistogramStats>;
}

/**
 * Global metrics instance
 */
export const metrics = new MetricsRegistry();

/**
 * Standard application metrics
 * RGPD-safe: P0/P1 dimensions only
 */
export const AppMetrics = {
  // HTTP requests
  httpRequests: metrics.counter('http_requests_total'),
  httpDuration: metrics.histogram('http_request_duration_ms'),
  httpErrors: metrics.counter('http_errors_total'),

  // Database
  dbQueries: metrics.counter('db_queries_total'),
  dbDuration: metrics.histogram('db_query_duration_ms'),
  dbErrors: metrics.counter('db_errors_total'),

  // AI/LLM
  aiInvocations: metrics.counter('ai_invocations_total'),
  aiDuration: metrics.histogram('ai_invocation_duration_ms'),
  aiErrors: metrics.counter('ai_errors_total'),

  // RGPD operations
  rgpdConsents: metrics.counter('rgpd_consents_total'),
  rgpdExports: metrics.counter('rgpd_exports_total'),
  rgpdDeletions: metrics.counter('rgpd_deletions_total'),
  rgpdPurges: metrics.counter('rgpd_purges_total'),

  // Authentication
  authAttempts: metrics.counter('auth_attempts_total'),
  authFailures: metrics.counter('auth_failures_total'),

  // Jobs
  jobsExecuted: metrics.counter('jobs_executed_total'),
  jobDuration: metrics.histogram('job_duration_ms'),
  jobErrors: metrics.counter('job_errors_total'),
} as const;

/**
 * Helper: Record HTTP request metrics
 */
export function recordHttpMetrics(
  method: string,
  path: string,
  status: number,
  duration: number
) {
  // Sanitize path (remove IDs to avoid cardinality explosion)
  const sanitizedPath = sanitizePath(path);

  AppMetrics.httpRequests.inc({
    method,
    path: sanitizedPath,
    status: String(status),
  });

  AppMetrics.httpDuration.observe(duration, {
    method,
    path: sanitizedPath,
  });

  if (status >= 400) {
    AppMetrics.httpErrors.inc({
      method,
      path: sanitizedPath,
      status: String(status),
    });
  }
}

/**
 * Sanitize path to remove UUIDs/IDs (prevent cardinality explosion)
 * Example: /api/users/123-456-789 → /api/users/:id
 * Captures:
 * - Standard UUIDs: 550e8400-e29b-41d4-a716-446655440000
 * - UUID-like IDs: abcd1234-5678-90ef-ghij-klmnopqrstuv
 * - Numeric IDs: 12345
 */
function sanitizePath(path: string): string {
  return path
    // UUID-like patterns (alphanumeric segments with dashes)
    .replace(/\/[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/gi, '/:id')
    // Standard UUIDs (8-4-4-4-12 hex format)
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    // Numeric IDs
    .replace(/\/\d+/g, '/:id');
}

export default metrics;
