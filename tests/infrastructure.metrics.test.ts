/**
 * Tests for Metrics Infrastructure
 * Purpose: Improve branch coverage from 74.56% to 80%
 *
 * Coverage targets:
 * - metrics.ts: Counter, Histogram, MetricsRegistry (48.88% → 100%)
 * - All branches: labelsToKey, percentile, getAllStats, sanitizePath, recordHttpMetrics
 */

import {
  metrics,
  AppMetrics,
  recordHttpMetrics,
} from "@/infrastructure/logging/metrics";

describe("Counter - Branch Coverage", () => {
  beforeEach(() => {
    metrics.reset();
  });

  test("inc without labels (default empty object)", () => {
    const counter = metrics.counter("test_counter");
    counter.inc();
    expect(counter.get()).toBe(1);
  });

  test("inc with labels", () => {
    const counter = metrics.counter("test_counter_labeled");
    counter.inc({ method: "GET", status: "200" });
    expect(counter.get({ method: "GET", status: "200" })).toBe(1);
  });

  test("inc with custom value", () => {
    const counter = metrics.counter("test_counter_value");
    counter.inc({}, 5);
    expect(counter.get()).toBe(5);
  });

  test("inc increments existing value", () => {
    const counter = metrics.counter("test_counter_increment");
    counter.inc({ status: "200" }, 1);
    counter.inc({ status: "200" }, 2);
    expect(counter.get({ status: "200" })).toBe(3);
  });

  test("get returns 0 for unknown labels (branch: counts.get() || 0)", () => {
    const counter = metrics.counter("test_counter_unknown");
    expect(counter.get({ method: "POST" })).toBe(0);
  });

  test("reset clears all counts", () => {
    const counter = metrics.counter("test_counter_reset");
    counter.inc({ status: "200" });
    counter.reset();
    expect(counter.get({ status: "200" })).toBe(0);
  });

  test("getAll returns all label combinations", () => {
    const counter = metrics.counter("test_counter_all");
    counter.inc({ method: "GET", status: "200" });
    counter.inc({ method: "POST", status: "201" });

    const all = counter.getAll();
    expect(all.size).toBe(2);
  });

  test("labelsToKey sorts labels alphabetically", () => {
    const counter = metrics.counter("test_counter_sort");
    counter.inc({ z: "last", a: "first" });

    // Labels should be sorted: a="first",z="last"
    expect(counter.get({ z: "last", a: "first" })).toBe(1);
    expect(counter.get({ a: "first", z: "last" })).toBe(1); // Same key
  });
});

describe("Histogram - Branch Coverage", () => {
  beforeEach(() => {
    metrics.reset();
  });

  test("observe without labels", () => {
    const hist = metrics.histogram("test_histogram");
    hist.observe(100);

    const stats = hist.getStats();
    expect(stats.count).toBe(1);
    expect(stats.sum).toBe(100);
    expect(stats.avg).toBe(100);
  });

  test("observe with labels", () => {
    const hist = metrics.histogram("test_histogram_labeled");
    hist.observe(50, { method: "GET" });
    hist.observe(150, { method: "GET" });

    const stats = hist.getStats({ method: "GET" });
    expect(stats.count).toBe(2);
    expect(stats.sum).toBe(200);
    expect(stats.avg).toBe(100);
  });

  test("observe creates bucket if not exists (branch: !buckets.has)", () => {
    const hist = metrics.histogram("test_histogram_bucket");
    hist.observe(10, { path: "/api/test" });

    const stats = hist.getStats({ path: "/api/test" });
    expect(stats.count).toBe(1);
  });

  test("getStats with empty values (branch: count === 0, values.length === 0)", () => {
    const hist = metrics.histogram("test_histogram_empty");

    const stats = hist.getStats({ method: "POST" });
    expect(stats.count).toBe(0);
    expect(stats.sum).toBe(0);
    expect(stats.avg).toBe(0); // count > 0 ? sum / count : 0
    expect(stats.min).toBe(0); // values.length > 0 ? Math.min(...values) : 0
    expect(stats.max).toBe(0);
  });

  test("getStats calculates min/max correctly", () => {
    const hist = metrics.histogram("test_histogram_minmax");
    hist.observe(10);
    hist.observe(50);
    hist.observe(30);

    const stats = hist.getStats();
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(50);
    expect(stats.avg).toBe(30); // (10 + 50 + 30) / 3
  });

  test("getStats calculates percentiles (p50, p95, p99)", () => {
    const hist = metrics.histogram("test_histogram_percentiles");
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    values.forEach((v) => hist.observe(v));

    const stats = hist.getStats();
    expect(stats.p50).toBeGreaterThan(0);
    expect(stats.p95).toBeGreaterThan(stats.p50);
    expect(stats.p99).toBeGreaterThanOrEqual(stats.p95);
  });

  test("getAllStats aggregates across all labels", () => {
    const hist = metrics.histogram("test_histogram_all_stats");
    hist.observe(10, { method: "GET" });
    hist.observe(20, { method: "POST" });
    hist.observe(30, { method: "GET" });

    const allStats = hist.getAllStats();
    expect(allStats.count).toBe(3);
    expect(allStats.sum).toBe(60);
    expect(allStats.avg).toBe(20);
  });

  test("getAllStats with empty buckets (branch: allValues.length === 0)", () => {
    const hist = metrics.histogram("test_histogram_all_empty");

    const allStats = hist.getAllStats();
    expect(allStats.count).toBe(0);
    expect(allStats.sum).toBe(0);
    expect(allStats.avg).toBe(0);
    expect(allStats.min).toBe(0);
    expect(allStats.max).toBe(0);
  });

  test("reset clears all buckets", () => {
    const hist = metrics.histogram("test_histogram_reset");
    hist.observe(100);
    hist.reset();

    const stats = hist.getStats();
    expect(stats.count).toBe(0);
  });

  test("percentile with empty values (branch: values.length === 0)", () => {
    const hist = metrics.histogram("test_histogram_percentile_empty");

    const stats = hist.getStats();
    expect(stats.p50).toBe(0);
    expect(stats.p95).toBe(0);
    expect(stats.p99).toBe(0);
  });
});

describe("MetricsRegistry - Branch Coverage", () => {
  beforeEach(() => {
    metrics.reset();
  });

  test("counter creates new counter if not exists (branch: !counters.has)", () => {
    const counter1 = metrics.counter("new_counter");
    const counter2 = metrics.counter("new_counter");

    expect(counter1).toBe(counter2); // Same instance
  });

  test("histogram creates new histogram if not exists (branch: !histograms.has)", () => {
    const hist1 = metrics.histogram("new_histogram");
    const hist2 = metrics.histogram("new_histogram");

    expect(hist1).toBe(hist2); // Same instance
  });

  test("export returns all counters and histograms", () => {
    const counter = metrics.counter("export_counter");
    counter.inc({ status: "200" });

    const hist = metrics.histogram("export_histogram");
    hist.observe(100);

    const snapshot = metrics.export();
    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.counters["export_counter"]).toBeDefined();
    expect(snapshot.histograms["export_histogram"]).toBeDefined();
  });

  test("reset clears all counters and histograms", () => {
    metrics.counter("test_counter").inc();
    metrics.histogram("test_histogram").observe(100);

    metrics.reset();

    expect(metrics.counter("test_counter").get()).toBe(0);
    expect(metrics.histogram("test_histogram").getStats().count).toBe(0);
  });
});

describe("AppMetrics - Standard Metrics", () => {
  beforeEach(() => {
    metrics.reset();
  });

  test("httpRequests counter is defined", () => {
    AppMetrics.httpRequests.inc({ method: "GET" });
    expect(AppMetrics.httpRequests.get({ method: "GET" })).toBe(1);
  });

  test("httpDuration histogram is defined", () => {
    AppMetrics.httpDuration.observe(50);
    expect(AppMetrics.httpDuration.getStats().count).toBe(1);
  });

  test("rgpdConsents counter tracks RGPD operations", () => {
    AppMetrics.rgpdConsents.inc({ action: "grant" });
    expect(AppMetrics.rgpdConsents.get({ action: "grant" })).toBe(1);
  });
});

describe("recordHttpMetrics - Branch Coverage", () => {
  beforeEach(() => {
    metrics.reset();
  });

  test("records HTTP request with status < 400 (no error)", () => {
    recordHttpMetrics("GET", "/api/users", 200, 50);

    const requests = AppMetrics.httpRequests.get({
      method: "GET",
      path: "/api/users",
      status: "200",
    });
    expect(requests).toBe(1);

    // No error should be recorded
    const errors = AppMetrics.httpErrors.get({
      method: "GET",
      path: "/api/users",
      status: "200",
    });
    expect(errors).toBe(0);
  });

  test("records HTTP error with status >= 400 (branch: status >= 400)", () => {
    recordHttpMetrics("POST", "/api/auth", 401, 100);

    const errors = AppMetrics.httpErrors.get({
      method: "POST",
      path: "/api/auth",
      status: "401",
    });
    expect(errors).toBe(1);
  });

  test("sanitizes UUID in path (branch: UUID replacement)", () => {
    recordHttpMetrics(
      "GET",
      "/api/users/550e8400-e29b-41d4-a716-446655440000",
      200,
      50
    );

    const requests = AppMetrics.httpRequests.get({
      method: "GET",
      path: "/api/users/:id",
      status: "200",
    });
    expect(requests).toBe(1);
  });

  test("sanitizes UUID-like ID in path (alphanumeric with dashes)", () => {
    recordHttpMetrics(
      "GET",
      "/api/exports/abcd1234-5678-90ef-ghij-klmnopqrstuv",
      200,
      30
    );

    const requests = AppMetrics.httpRequests.get({
      method: "GET",
      path: "/api/exports/:id",
      status: "200",
    });
    expect(requests).toBe(1);
  });

  test("sanitizes numeric ID in path (branch: numeric replacement)", () => {
    recordHttpMetrics("DELETE", "/api/consents/12345", 204, 20);

    const requests = AppMetrics.httpRequests.get({
      method: "DELETE",
      path: "/api/consents/:id",
      status: "204",
    });
    expect(requests).toBe(1);
  });

  test("sanitizes multiple IDs in path", () => {
    recordHttpMetrics(
      "GET",
      "/api/tenants/123/users/456/consents/789",
      200,
      40
    );

    const requests = AppMetrics.httpRequests.get({
      method: "GET",
      path: "/api/tenants/:id/users/:id/consents/:id",
      status: "200",
    });
    expect(requests).toBe(1);
  });

  test("records duration in histogram", () => {
    recordHttpMetrics("GET", "/api/ping", 200, 25);

    const stats = AppMetrics.httpDuration.getStats({
      method: "GET",
      path: "/api/ping",
    });
    expect(stats.count).toBe(1);
    expect(stats.sum).toBe(25);
  });
});
