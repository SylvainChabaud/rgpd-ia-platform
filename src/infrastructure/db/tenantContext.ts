/**
 * Tenant Context for Row-Level Security (RLS)
 *
 * Purpose: Set PostgreSQL session variable for RLS policies
 * Classification: P1 (technical infrastructure)
 * RGPD Ref: Art. 32 (mesures techniques - défense en profondeur)
 *
 * Usage:
 * ```typescript
 * import { withTenantContext } from "@/infrastructure/db/tenantContext";
 *
 * const result = await withTenantContext(pool, tenantId, async (client) => {
 *   return await client.query("SELECT * FROM consents WHERE user_id = $1", [userId]);
 * });
 * ```
 */

import { Pool, PoolClient } from "pg";

/**
 * Execute a callback with tenant context set for RLS
 *
 * Sets `app.current_tenant_id` session variable before executing the callback.
 * This enables Row-Level Security policies to filter data by tenant.
 *
 * @param pool - PostgreSQL connection pool
 * @param tenantId - Tenant ID to set in session context
 * @param callback - Async function to execute with tenant context
 * @returns Result of the callback
 *
 * @throws Error if tenantId is empty or invalid
 */
export async function withTenantContext<T>(
  pool: Pool,
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!tenantId || tenantId.trim() === "") {
    throw new Error("RGPD VIOLATION: tenantId required for database operations");
  }

  const client = await pool.connect();
  try {
    // Set tenant context for RLS policies
    // Using SET LOCAL ensures the setting is transaction-scoped only
    await client.query("BEGIN");
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);

    // Execute callback with tenant context active
    const result = await callback(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a callback with platform (superuser) context
 *
 * No tenant_id is set, allowing access to all data (platform scope).
 * Use with extreme caution - only for platform admin operations.
 *
 * @param pool - PostgreSQL connection pool
 * @param callback - Async function to execute with platform context
 * @returns Result of the callback
 */
export async function withPlatformContext<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // No tenant_id set - platform context (all tenants visible)
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if RLS is enabled on a table
 *
 * Utility function for testing/validation purposes.
 *
 * @param pool - PostgreSQL connection pool
 * @param tableName - Name of the table to check
 * @returns true if RLS is enabled, false otherwise
 */
export async function isRLSEnabled(
  pool: Pool,
  tableName: string
): Promise<boolean> {
  const result = await pool.query(
    `SELECT relrowsecurity
     FROM pg_class
     WHERE relname = $1`,
    [tableName]
  );

  if (result.rows.length === 0) {
    throw new Error(`Table ${tableName} not found`);
  }

  return result.rows[0].relrowsecurity === true;
}

/**
 * List all RLS policies for a table
 *
 * Utility function for testing/debugging purposes.
 *
 * @param pool - PostgreSQL connection pool
 * @param tableName - Name of the table
 * @returns Array of policy names
 */
export async function listRLSPolicies(
  pool: Pool,
  tableName: string
): Promise<string[]> {
  const result = await pool.query(
    `SELECT policyname
     FROM pg_policies
     WHERE tablename = $1`,
    [tableName]
  );

  return result.rows.map((row) => row.policyname);
}
