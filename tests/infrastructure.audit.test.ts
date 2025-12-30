/**
 * Tests for Audit Infrastructure (PgAuditEventWriter, PgAuditEventReader)
 * Purpose: Improve branch coverage from 72.79% to 80%
 *
 * Coverage targets:
 * - PgAuditEventWriter: metadata validation branches
 * - PgAuditEventReader: filtering branches (tenantId, eventType, findByUser error)
 */

import { PgAuditEventWriter } from "@/infrastructure/audit/PgAuditEventWriter";
import { PgAuditEventReader } from "@/infrastructure/audit/PgAuditEventReader";
import type { AuditEvent } from "@/app/ports/AuditEventWriter";
import { newId } from "@/shared/ids";import { ACTOR_SCOPE } from "@/shared/actorScope";import { pool } from "@/infrastructure/db/pg";

const TENANT_ID = newId();
const USER_ID = newId();

// Setup tenant for tests
async function setupTenant() {
  // Delete existing tenant first (idempotent setup)
  const existing = await pool.query("SELECT id FROM tenants WHERE slug = $1", [
    "audit-test-tenant",
  ]);

  if (existing.rows.length > 0) {
    const existingId = existing.rows[0].id;
    await pool.query("DELETE FROM audit_events WHERE tenant_id = $1", [existingId]);
    await pool.query("DELETE FROM tenants WHERE id = $1", [existingId]);
  }

  // Create fresh tenant
  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_ID, "audit-test-tenant", "Audit Test Tenant"]
  );
}

// Cleanup after tests
async function cleanup() {
  await pool.query("DELETE FROM audit_events WHERE tenant_id = $1", [
    TENANT_ID,
  ]);
  await pool.query("DELETE FROM tenants WHERE id = $1", [TENANT_ID]);
}

beforeAll(async () => {
  await setupTenant();
});

afterAll(async () => {
  await cleanup();
});

describe("PgAuditEventWriter - Branch Coverage", () => {
  const writer = new PgAuditEventWriter();

  test("write audit event without metadata (branch: metadata undefined)", async () => {
    const event: AuditEvent = {
      id: newId(),
      eventName: "user.login",
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: USER_ID,
      tenantId: TENANT_ID,
      targetId: undefined,
      metadata: undefined,
    };

    await expect(writer.write(event)).resolves.not.toThrow();
  });

  test("write audit event with valid small metadata (branch: metadata valid)", async () => {
    const event: AuditEvent = {
      id: newId(),
      eventName: "user.updated",
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: USER_ID,
      tenantId: TENANT_ID,
      targetId: USER_ID,
      metadata: { action: "profile_updated" },
    };

    await expect(writer.write(event)).resolves.not.toThrow();
  });

  test("BLOCKER: reject metadata containing @ symbol (branch: forbidden pattern)", async () => {
    const event: AuditEvent = {
      id: newId(),
      eventName: "user.action",
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: USER_ID,
      tenantId: TENANT_ID,
      targetId: undefined,
      metadata: { email: "user@example.com" },
    };

    await expect(writer.write(event)).rejects.toThrow(
      "RGPD_AUDIT_GUARD: metadata contains forbidden patterns or is too large"
    );
  });

  test("BLOCKER: reject metadata too large (branch: size validation)", async () => {
    const event: AuditEvent = {
      id: newId(),
      eventName: "user.action",
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: USER_ID,
      tenantId: TENANT_ID,
      targetId: undefined,
      metadata: { data: "x".repeat(3000) },
    };

    await expect(writer.write(event)).rejects.toThrow(
      "RGPD_AUDIT_GUARD: metadata contains forbidden patterns or is too large"
    );
  });
});

describe("PgAuditEventReader - Branch Coverage", () => {
  const reader = new PgAuditEventReader();
  const writer = new PgAuditEventWriter();

  beforeAll(async () => {
    // Insert test audit events
    await writer.write({
      id: newId(),
      eventName: "user.login",
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: USER_ID,
      tenantId: TENANT_ID,
      targetId: undefined,
      metadata: undefined,
    });

    await writer.write({
      id: newId(),
      eventName: "user.logout",
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: USER_ID,
      tenantId: TENANT_ID,
      targetId: undefined,
      metadata: undefined,
    });

    await writer.write({
      id: newId(),
      eventName: "data.export",
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: USER_ID,
      tenantId: TENANT_ID,
      targetId: USER_ID,
      metadata: undefined,
    });
  });

  test("list events without filters (branch: no tenantId, no eventType)", async () => {
    const events = await reader.list({});

    expect(events.length).toBeGreaterThanOrEqual(3);
  });

  test("list events with tenantId filter (branch: tenantId !== undefined)", async () => {
    const events = await reader.list({ tenantId: TENANT_ID });

    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.every((e) => e.tenantId === TENANT_ID)).toBe(true);
  });

  test("list events with eventType filter (branch: eventType provided)", async () => {
    const events = await reader.list({ eventType: "user.login" });

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.every((e) => e.eventType === "user.login")).toBe(true);
  });

  test("list events with both tenantId and eventType filters", async () => {
    const events = await reader.list({
      tenantId: TENANT_ID,
      eventType: "data.export",
    });

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.every((e) => e.tenantId === TENANT_ID)).toBe(true);
    expect(events.every((e) => e.eventType === "data.export")).toBe(true);
  });

  test("list events with limit and offset", async () => {
    const events = await reader.list({ limit: 2, offset: 0 });

    expect(events.length).toBeLessThanOrEqual(2);
  });

  test("findByUser with valid tenantId (branch: tenantId provided)", async () => {
    const events = await reader.findByUser(TENANT_ID, USER_ID);

    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.every((e) => e.tenantId === TENANT_ID)).toBe(true);
    expect(events.every((e) => e.actorId === USER_ID)).toBe(true);
  });

  test("BLOCKER: findByUser throws if tenantId missing (branch: !tenantId)", async () => {
    await expect(reader.findByUser("", USER_ID)).rejects.toThrow(
      "RGPD VIOLATION: tenantId required for audit event queries"
    );
  });

  test("findByUser with custom limit", async () => {
    const events = await reader.findByUser(TENANT_ID, USER_ID, 1);

    expect(events.length).toBeLessThanOrEqual(1);
  });
});
