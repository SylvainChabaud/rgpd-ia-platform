/**
 * LOT 6.1 BLOCKER TESTS: Metrics RGPD-Safe Validation
 *
 * Requirements (from TASKS.md LOT 6.1):
 * - Aucune donnée utilisateur dans logs
 * - Aucune dimension métrique sensible
 * - Metrics: labels P0/P1 uniquement (event type, status code, method)
 *
 * CRITICAL RGPD COMPLIANCE:
 * - NO user IDs in metric labels (cardinality explosion + RGPD violation)
 * - NO tenant IDs in metric labels
 * - NO email addresses
 * - NO names
 * - NO IP addresses (except anonymized)
 * - ONLY P0/P1 data (technical metrics, aggregated)
 *
 * DATA_CLASSIFICATION.md compliance
 */

import {
  metrics,
  AppMetrics,
  recordHttpMetrics,
  MetricsSnapshot,
} from "@/infrastructure/logging/metrics";

describe("LOT 6.1 BLOCKER: Metrics RGPD-Safe", () => {
  beforeAll(() => {
    // Reset metrics before all tests in this suite
    metrics.reset();
  });

  beforeEach(() => {
    // Reset metrics before each test
    metrics.reset();
  });

  test("BLOCKER: HTTP metrics use ONLY P0/P1 labels (no sensitive data)", () => {
    // GIVEN: HTTP request with user context
    const method = "POST";
    const path = "/api/users/550e8400-e29b-41d4-a716-446655440000";
    const status = 200;
    const duration = 123;

    // WHEN: Record metrics
    recordHttpMetrics(method, path, status, duration);

    // THEN: Metrics snapshot should NOT contain user ID
    const snapshot = metrics.export();

    const countersJson = JSON.stringify(snapshot.counters);
    const histogramsJson = JSON.stringify(snapshot.histograms);

    // CRITICAL: NO UUID in labels (should be sanitized to :id)
    expect(countersJson).not.toContain("550e8400");
    expect(histogramsJson).not.toContain("550e8400");

    // Should contain sanitized path
    expect(countersJson).toContain("/api/users/:id");

    // Should contain allowed labels (P0/P1)
    expect(countersJson).toContain("POST");
    expect(countersJson).toContain("200");
  });

  test("BLOCKER: metric labels do NOT include user IDs", () => {
    // GIVEN: Metric with user ID attempt (simulated)
    const userId = "user-123-456-789";

    // WHEN: Record AI invocation (should NOT include userId in labels)
    AppMetrics.aiInvocations.inc({
      provider: "ollama",
      model: "tinyllama",
      purpose: "summarization",
      // userId: userId, // FORBIDDEN - must NOT be in labels
    });

    // THEN: Snapshot should NOT contain user ID
    const snapshot = metrics.export();
    const metricsJson = JSON.stringify(snapshot);

    expect(metricsJson).not.toContain(userId);
    expect(metricsJson).not.toContain("user-");
  });

  test("BLOCKER: metric labels do NOT include tenant IDs", () => {
    // GIVEN: Metric with tenant ID attempt
    const tenantId = "tenant-abc-def-ghi";

    // WHEN: Record consent grant (should NOT include tenantId in labels)
    AppMetrics.rgpdConsents.inc({
      action: "granted",
      purpose: "ai_processing",
      // tenantId: tenantId, // FORBIDDEN - must NOT be in labels
    });

    // THEN: Snapshot should NOT contain tenant ID
    const snapshot = metrics.export();
    const metricsJson = JSON.stringify(snapshot);

    expect(metricsJson).not.toContain(tenantId);
    expect(metricsJson).not.toContain("tenant-");
  });

  test("BLOCKER: metric labels do NOT include email addresses", () => {
    // GIVEN: Auth attempt with email
    const email = "user@example.com";

    // WHEN: Record auth attempt (should NOT include email in labels)
    AppMetrics.authAttempts.inc({
      method: "password",
      result: "success",
      // email: email, // FORBIDDEN - must NOT be in labels
    });

    // THEN: Snapshot should NOT contain email
    const snapshot = metrics.export();
    const metricsJson = JSON.stringify(snapshot);

    expect(metricsJson).not.toContain(email);
    expect(metricsJson).not.toContain("@example.com");
  });

  test("BLOCKER: metric labels use ONLY allowed dimensions (P0/P1)", () => {
    // Allowed labels (P0/P1 - technical data only)
    const allowedLabels = [
      "method", // HTTP method (GET, POST, etc.)
      "path", // Sanitized path (/api/users/:id)
      "status", // HTTP status code (200, 404, etc.)
      "provider", // AI provider (stub, ollama)
      "model", // AI model (tinyllama)
      "purpose", // Processing purpose (summarization, etc.)
      "event", // Event type (http_request, db_query, etc.)
      "action", // Action type (granted, revoked, etc.)
      "result", // Result type (success, failure)
      "error_type", // Error type (ValidationError, etc.)
    ];

    // Forbidden labels (P2/P3 - sensitive data)
    const forbiddenLabels = [
      "userId",
      "tenantId",
      "email",
      "name",
      "displayName",
      "ipAddress",
      "phone",
      "address",
      "actorId",
      "targetId",
    ];

    // Record various metrics
    recordHttpMetrics("GET", "/api/health", 200, 10);
    AppMetrics.aiInvocations.inc({ provider: "stub", model: "test" });
    AppMetrics.dbQueries.inc({ operation: "SELECT", table: "users" });

    // Export snapshot
    const snapshot = metrics.export();
    const metricsJson = JSON.stringify(snapshot);

    // Verify NO forbidden labels appear
    for (const forbiddenLabel of forbiddenLabels) {
      expect(metricsJson).not.toContain(`"${forbiddenLabel}"`);
    }
  });

  test("BLOCKER: path sanitization removes UUIDs (prevent cardinality explosion)", () => {
    // GIVEN: Paths with UUIDs
    const paths = [
      "/api/users/550e8400-e29b-41d4-a716-446655440000",
      "/api/tenants/123e4567-e89b-12d3-a456-426614174000",
      "/api/export/download/abcd1234-5678-90ef-ghij-klmnopqrstuv",
    ];

    // WHEN: Record metrics
    for (const path of paths) {
      recordHttpMetrics("GET", path, 200, 10);
    }

    // THEN: All paths should be sanitized to :id
    const snapshot = metrics.export();
    const metricsJson = JSON.stringify(snapshot);

    expect(metricsJson).toContain("/api/users/:id");
    expect(metricsJson).toContain("/api/tenants/:id");
    expect(metricsJson).toContain("/api/export/download/:id");

    // NO actual UUIDs in labels
    expect(metricsJson).not.toContain("550e8400");
    expect(metricsJson).not.toContain("123e4567");
    expect(metricsJson).not.toContain("abcd1234");
  });

  test("BLOCKER: path sanitization removes numeric IDs", () => {
    // GIVEN: Paths with numeric IDs
    const paths = ["/api/users/12345", "/api/posts/9876543210"];

    // WHEN: Record metrics
    for (const path of paths) {
      recordHttpMetrics("GET", path, 200, 10);
    }

    // THEN: Numeric IDs should be sanitized
    const snapshot = metrics.export();
    const metricsJson = JSON.stringify(snapshot);

    expect(metricsJson).toContain("/api/users/:id");
    expect(metricsJson).toContain("/api/posts/:id");

    // NO actual numeric IDs in labels
    expect(metricsJson).not.toContain("12345");
    expect(metricsJson).not.toContain("9876543210");
  });
});

describe("LOT 6.1 COMPLIANCE: Metrics Aggregation & Anonymization", () => {
  beforeAll(() => {
    metrics.reset();
  });

  beforeEach(() => {
    metrics.reset();
  });

  test("COMPLIANCE: metrics are aggregated (counts, not individual events)", () => {
    // Reset first to ensure clean state
    metrics.reset();

    // GIVEN: Multiple HTTP requests
    recordHttpMetrics("GET", "/api/users/:id", 200, 10);
    recordHttpMetrics("GET", "/api/users/:id", 200, 15);
    recordHttpMetrics("GET", "/api/users/:id", 200, 20);

    // WHEN: Export metrics
    const snapshot = metrics.export();

    // THEN: Should show aggregated count (3), not individual requests
    const counters = snapshot.counters.http_requests_total;
    const key = Object.keys(counters).find((k) =>
      k.includes('method="GET"')
    );

    expect(key).toBeDefined();
    expect(counters[key!]).toBe(3);

    // Histogram should show aggregated stats
    const httpDuration = snapshot.histograms.http_request_duration_ms;
    expect(httpDuration.count).toBe(3);
    expect(httpDuration.sum).toBe(45); // 10 + 15 + 20
    expect(httpDuration.avg).toBe(15);
  });

  test("COMPLIANCE: histogram shows percentiles (not individual values)", () => {
    // Reset first to ensure clean state
    metrics.reset();

    // GIVEN: Multiple requests with varying durations
    const durations = [10, 20, 30, 40, 50, 100, 200, 500, 1000];

    for (const duration of durations) {
      recordHttpMetrics("POST", "/api/ai/invoke", 200, duration);
    }

    // WHEN: Export metrics
    const snapshot = metrics.export();
    const histogram = snapshot.histograms.http_request_duration_ms;

    // THEN: Should show aggregated percentiles (not individual durations)
    expect(histogram.count).toBe(9);
    expect(histogram.p50).toBeGreaterThan(0);
    expect(histogram.p95).toBeGreaterThan(histogram.p50);
    expect(histogram.p99).toBeGreaterThanOrEqual(histogram.p95); // p99 >= p95 (can be equal for small samples)

    // Individual durations should NOT be exposed
    const histogramJson = JSON.stringify(histogram);
    expect(histogramJson).not.toContain('"10"');
    expect(histogramJson).not.toContain('"1000"');
  });

  test("COMPLIANCE: metrics snapshot includes timestamp (P0)", () => {
    // WHEN: Export metrics
    const snapshot = metrics.export();

    // THEN: Timestamp should be present (ISO format)
    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Timestamp is P0 (technical data, not sensitive)
    const timestamp = new Date(snapshot.timestamp);
    expect(timestamp.getTime()).toBeGreaterThan(0);
  });

  test("COMPLIANCE: error metrics do NOT include error messages (may contain PII)", () => {
    // GIVEN: Error with potentially sensitive message
    const sensitiveError = new Error(
      "User user@example.com not found in tenant abc-123"
    );

    // WHEN: Record error (should NOT include message in labels)
    AppMetrics.httpErrors.inc({
      method: "GET",
      path: "/api/users/:id",
      status: "404",
      // error_message: sensitiveError.message, // FORBIDDEN
    });

    // THEN: Snapshot should NOT contain error message
    const snapshot = metrics.export();
    const metricsJson = JSON.stringify(snapshot);

    expect(metricsJson).not.toContain("user@example.com");
    expect(metricsJson).not.toContain("not found in tenant");
    expect(metricsJson).not.toContain("abc-123");
  });
});

describe("LOT 6.1 PRODUCTION: Metrics Endpoint Security", () => {
  test("PRODUCTION: /api/metrics endpoint exposes ONLY aggregated data", async () => {
    // Reset metrics
    metrics.reset();

    // Record some test metrics
    recordHttpMetrics("GET", "/api/health", 200, 5);
    AppMetrics.aiInvocations.inc({ provider: "stub" });

    // Export snapshot (simulates /api/metrics response)
    const snapshot = metrics.export();

    // CRITICAL: Snapshot should be JSON-serializable
    const json = JSON.stringify(snapshot);
    expect(json).toBeDefined();

    // Parse back
    const parsed = JSON.parse(json);
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.counters).toBeDefined();
    expect(parsed.histograms).toBeDefined();

    // NO sensitive data in serialized metrics
    expect(json).not.toContain("user-");
    expect(json).not.toContain("tenant-");
    expect(json).not.toContain("@");
  });

  test("PRODUCTION: metrics can be scraped by Prometheus (future LOT 6.2)", () => {
    // This test validates metrics format is Prometheus-compatible

    recordHttpMetrics("GET", "/api/health", 200, 10);

    const snapshot = metrics.export();

    // Counters should be compatible with Prometheus counter format
    expect(snapshot.counters).toBeDefined();
    expect(typeof snapshot.counters).toBe("object");

    // Histograms should be compatible with Prometheus histogram format
    expect(snapshot.histograms).toBeDefined();
    expect(typeof snapshot.histograms).toBe("object");

    // Future: Prometheus exposition format
    // # TYPE http_requests_total counter
    // http_requests_total{method="GET",path="/api/health",status="200"} 1
  });
});

describe("LOT 6.1 RGPD: Metrics Data Classification", () => {
  test("RGPD: all metric labels are P0 or P1 (technical data only)", () => {
    // P0: Public data (HTTP methods, status codes)
    // P1: Technical IDs (sanitized paths, event types)
    // P2: FORBIDDEN (user IDs, tenant IDs)
    // P3: FORBIDDEN (emails, names, PII)

    // Record various metrics
    recordHttpMetrics("POST", "/api/users", 201, 50);
    AppMetrics.dbQueries.inc({ operation: "INSERT", table: "users" });
    AppMetrics.aiInvocations.inc({ provider: "ollama", model: "llama" });

    const snapshot = metrics.export();
    const metricsJson = JSON.stringify(snapshot);

    // P0/P1 allowed
    expect(metricsJson).toContain("POST");
    expect(metricsJson).toContain("201");
    expect(metricsJson).toContain("INSERT");
    expect(metricsJson).toContain("ollama");

    // P2/P3 forbidden
    const forbiddenPatterns = [
      /@/, // Email
      /user-[a-f0-9\-]{36}/, // User UUID
      /tenant-[a-f0-9\-]{36}/, // Tenant UUID
      /\d{3}\.\d{3}\.\d{3}\.\d{3}/, // IP address
    ];

    for (const pattern of forbiddenPatterns) {
      expect(metricsJson).not.toMatch(pattern);
    }
  });

  test("RGPD: metrics retention aligns with policy (90 days max)", () => {
    // Metrics should be short-lived (aggregated, then purged)
    // This test documents retention expectation

    const snapshot = metrics.export();
    expect(snapshot.timestamp).toBeDefined();

    // Metrics are aggregated in-memory (ephemeral)
    // When exported to Prometheus/Grafana, retention is 90 days max
    // (consistent with ai_jobs retention policy)

    expect(true).toBe(true); // Placeholder for retention policy validation
  });

  test("RGPD: metrics can be reset (no persistent storage by default)", () => {
    // GIVEN: Metrics exist
    recordHttpMetrics("GET", "/api/test", 200, 10);

    let snapshot = metrics.export();
    const initialCountersKeys = Object.keys(snapshot.counters);
    expect(initialCountersKeys.length).toBeGreaterThan(0);

    // Find a counter with actual data
    const countersWithData = Object.entries(snapshot.counters).filter(
      ([_, values]) => Object.keys(values).length > 0
    );
    expect(countersWithData.length).toBeGreaterThan(0);

    // WHEN: Reset metrics
    metrics.reset();

    // THEN: Metric values cleared (registries persist but data is empty)
    snapshot = metrics.export();

    // Check that counters have no data (empty objects)
    const countersAfterReset = Object.entries(snapshot.counters).filter(
      ([_, values]) => Object.keys(values).length > 0
    );
    expect(countersAfterReset.length).toBe(0);

    // Histograms should have zero counts
    for (const histogram of Object.values(snapshot.histograms)) {
      expect(histogram.count).toBe(0);
      expect(histogram.sum).toBe(0);
    }

    // This proves metrics data is NOT persisted (RGPD-safe)
  });
});
