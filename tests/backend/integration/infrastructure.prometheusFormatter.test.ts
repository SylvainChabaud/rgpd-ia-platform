/**
 * Tests for Prometheus formatter
 * LOT 6.1 - Prometheus/Grafana Integration
 *
 * These tests cover the Prometheus text format export
 * and validation functions.
 */

import {
  formatPrometheus,
  validatePrometheusFormat,
} from "@/infrastructure/logging/prometheusFormatter";
import type { MetricsSnapshot } from "@/infrastructure/logging/metrics";

describe("prometheusFormatter", () => {
  describe("formatPrometheus", () => {
    it("should format counters correctly", () => {
      const snapshot: MetricsSnapshot = {
        timestamp: "2024-01-01T00:00:00.000Z",
        counters: {
          http_requests_total: {
            'method="GET",path="/api/users",status="200"': 42,
            'method="POST",path="/api/users",status="201"': 10,
          },
        },
        histograms: {},
      };

      const result = formatPrometheus(snapshot);

      expect(result).toContain("# Timestamp: 2024-01-01T00:00:00.000Z");
      expect(result).toContain("# HELP http_requests_total Total number of HTTP requests");
      expect(result).toContain("# TYPE http_requests_total counter");
      expect(result).toContain('http_requests_total{method="GET",path="/api/users",status="200"} 42');
      expect(result).toContain('http_requests_total{method="POST",path="/api/users",status="201"} 10');
    });

    it("should format counters without labels", () => {
      const snapshot: MetricsSnapshot = {
        timestamp: "2024-01-01T00:00:00.000Z",
        counters: {
          simple_counter: {
            "": 100,
          },
        },
        histograms: {},
      };

      const result = formatPrometheus(snapshot);

      expect(result).toContain("simple_counter 100");
      expect(result).not.toContain("simple_counter{}");
    });

    it("should format histograms as summaries", () => {
      const snapshot: MetricsSnapshot = {
        timestamp: "2024-01-01T00:00:00.000Z",
        counters: {},
        histograms: {
          http_request_duration_ms: {
            count: 1000,
            sum: 50000,
            min: 10,
            max: 500,
            avg: 50,
            p50: 45,
            p95: 200,
            p99: 400,
          },
        },
      };

      const result = formatPrometheus(snapshot);

      expect(result).toContain("# HELP http_request_duration_ms HTTP request duration in milliseconds");
      expect(result).toContain("# TYPE http_request_duration_ms summary");
      expect(result).toContain("http_request_duration_ms_count 1000");
      expect(result).toContain("http_request_duration_ms_sum 50000");
      expect(result).toContain('http_request_duration_ms{quantile="0.5"} 45');
      expect(result).toContain('http_request_duration_ms{quantile="0.95"} 200');
      expect(result).toContain('http_request_duration_ms{quantile="0.99"} 400');
      expect(result).toContain("http_request_duration_ms_min 10");
      expect(result).toContain("http_request_duration_ms_max 500");
      expect(result).toContain("http_request_duration_ms_avg 50");
    });

    it("should use fallback help text for unknown metrics", () => {
      const snapshot: MetricsSnapshot = {
        timestamp: "2024-01-01T00:00:00.000Z",
        counters: {
          custom_unknown_metric: {
            "": 1,
          },
        },
        histograms: {},
      };

      const result = formatPrometheus(snapshot);

      expect(result).toContain("# HELP custom_unknown_metric Metric custom_unknown_metric");
    });

    it("should handle empty snapshot", () => {
      const snapshot: MetricsSnapshot = {
        timestamp: "2024-01-01T00:00:00.000Z",
        counters: {},
        histograms: {},
      };

      const result = formatPrometheus(snapshot);

      expect(result).toContain("# Timestamp: 2024-01-01T00:00:00.000Z");
      expect(result).not.toContain("# HELP");
      expect(result).not.toContain("# TYPE");
    });

    it("should handle all known metric help texts", () => {
      const knownMetrics = [
        "http_requests_total",
        "http_request_duration_ms",
        "http_errors_total",
        "db_queries_total",
        "db_query_duration_ms",
        "db_errors_total",
        "ai_invocations_total",
        "ai_invocation_duration_ms",
        "ai_errors_total",
        "rgpd_consents_total",
        "rgpd_exports_total",
        "rgpd_deletions_total",
        "rgpd_purges_total",
        "auth_attempts_total",
        "auth_failures_total",
        "jobs_executed_total",
        "job_duration_ms",
        "job_errors_total",
      ];

      const counters: Record<string, Record<string, number>> = {};
      for (const metric of knownMetrics) {
        counters[metric] = { "": 1 };
      }

      const snapshot: MetricsSnapshot = {
        timestamp: "2024-01-01T00:00:00.000Z",
        counters,
        histograms: {},
      };

      const result = formatPrometheus(snapshot);

      // Verify all known metrics have proper help text (not fallback)
      for (const metric of knownMetrics) {
        expect(result).toContain(`# HELP ${metric}`);
        expect(result).not.toContain(`# HELP ${metric} Metric ${metric}`);
      }
    });
  });

  describe("validatePrometheusFormat", () => {
    it("should validate correct Prometheus format", () => {
      const text = `# HELP http_requests_total Total requests
# TYPE http_requests_total counter
http_requests_total 42`;

      const result = validatePrometheusFormat(text);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing HELP directive", () => {
      const text = `# TYPE http_requests_total counter
http_requests_total 42`;

      const result = validatePrometheusFormat(text);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing HELP directives");
    });

    it("should detect missing TYPE directive", () => {
      const text = `# HELP http_requests_total Total requests
http_requests_total 42`;

      const result = validatePrometheusFormat(text);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing TYPE directives");
    });

    it("should detect no valid metric lines", () => {
      const text = `# HELP http_requests_total Total requests
# TYPE http_requests_total counter
invalid line here`;

      const result = validatePrometheusFormat(text);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No valid metric lines found");
    });

    it("should detect RGPD violation - email in metrics", () => {
      const text = `# HELP http_requests_total Total requests
# TYPE http_requests_total counter
http_requests_total{user="test@example.com"} 42`;

      const result = validatePrometheusFormat(text);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("RGPD VIOLATION: Potential email in metrics");
    });

    it("should detect UUID in metrics", () => {
      const text = `# HELP http_requests_total Total requests
# TYPE http_requests_total counter
http_requests_total{user_id="550e8400-e29b-41d4-a716-446655440000"} 42`;

      const result = validatePrometheusFormat(text);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("RGPD WARNING: UUID detected in metrics (may cause cardinality explosion)");
    });

    it("should detect multiple validation errors", () => {
      const text = `some random text with email@example.com and uuid 550e8400-e29b-41d4-a716-446655440000`;

      const result = validatePrometheusFormat(text);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing HELP directives");
      expect(result.errors).toContain("Missing TYPE directives");
      expect(result.errors).toContain("No valid metric lines found");
      expect(result.errors).toContain("RGPD VIOLATION: Potential email in metrics");
      expect(result.errors).toContain("RGPD WARNING: UUID detected in metrics (may cause cardinality explosion)");
    });
  });
});
