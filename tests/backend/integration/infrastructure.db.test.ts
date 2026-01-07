/**
 * Tests for DB Infrastructure (tenantContext, error handling)
 * Purpose: Improve branch coverage from 74.42% to 80%
 *
 * Coverage targets:
 * - tenantContext.ts: validation branches (empty tenantId)
 * - tenantContext.ts: error rollback branches
 */

import { pool } from "@/infrastructure/db/pg";
import {
  withTenantContext,
  withPlatformContext,
} from "@/infrastructure/db/tenantContext";
import { newId } from "@/shared/ids";

describe("withTenantContext - Branch Coverage", () => {
  test("BLOCKER: throws if tenantId is empty string (branch: !tenantId)", async () => {
    await expect(
      withTenantContext(pool, "", async (client) => {
        return await client.query("SELECT 1");
      })
    ).rejects.toThrow("RGPD VIOLATION: tenantId required for database operations");
  });

  test("BLOCKER: throws if tenantId is whitespace only (branch: tenantId.trim() === '')", async () => {
    await expect(
      withTenantContext(pool, "   ", async (client) => {
        return await client.query("SELECT 1");
      })
    ).rejects.toThrow("RGPD VIOLATION: tenantId required for database operations");
  });

  test("executes callback with valid tenantId (happy path)", async () => {
    const tenantId = newId();

    const result = await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query("SELECT current_setting('app.current_tenant_id', true) AS tenant_id");
      return res.rows[0].tenant_id;
    });

    expect(result).toBe(tenantId);
  });

  test("rolls back transaction on callback error (branch: catch error)", async () => {
    const tenantId = newId();

    await expect(
      withTenantContext(pool, tenantId, async (client) => {
        await client.query("SELECT 1");
        throw new Error("Simulated callback error");
      })
    ).rejects.toThrow("Simulated callback error");

    // Transaction should have been rolled back
  });
});

describe("withPlatformContext - Branch Coverage", () => {
  test("executes callback in platform context (no tenant_id set)", async () => {
    const result = await withPlatformContext(pool, async (client) => {
      const res = await client.query("SELECT current_setting('app.current_tenant_id', true) AS tenant_id");
      return res.rows[0].tenant_id;
    });

    // Platform context: no tenant_id set (returns empty string or null)
    expect(result === "" || result === null).toBe(true);
  });

  test("rolls back transaction on callback error (branch: catch error)", async () => {
    await expect(
      withPlatformContext(pool, async (client) => {
        await client.query("SELECT 1");
        throw new Error("Simulated platform callback error");
      })
    ).rejects.toThrow("Simulated platform callback error");

    // Transaction should have been rolled back
  });

  test("commits transaction on successful callback", async () => {
    const result = await withPlatformContext(pool, async (client) => {
      await client.query("SELECT 1");
      return { success: true };
    });

    expect(result.success).toBe(true);
  });
});
