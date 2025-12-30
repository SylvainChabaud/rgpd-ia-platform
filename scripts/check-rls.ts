/**
 * Diagnostic script to check RLS configuration
 */

import { pool } from "../src/infrastructure/db/pg";

async function checkRLS() {
  console.log("🔍 Checking RLS configuration...\n");

  // Check RLS enabled + FORCE RLS for each table
  const tables = ["consents", "ai_jobs", "audit_events", "rgpd_requests", "users"];

  for (const table of tables) {
    const result = await pool.query(
      `SELECT
        relname,
        relrowsecurity AS rls_enabled,
        relforcerowsecurity AS force_rls
       FROM pg_class
       WHERE relname = $1`,
      [table]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Table ${table} NOT FOUND`);
      continue;
    }

    const { relname, rls_enabled, force_rls } = result.rows[0];
    const rlsStatus = rls_enabled ? "✅ ENABLED" : "❌ DISABLED";
    const forceStatus = force_rls ? "✅ FORCED" : "⚠️  NOT FORCED";

    console.log(`Table: ${relname}`);
    console.log(`  RLS: ${rlsStatus}`);
    console.log(`  FORCE: ${forceStatus}`);

    // List policies for this table
    const policies = await pool.query(
      `SELECT policyname, cmd
       FROM pg_policies
       WHERE tablename = $1`,
      [table]
    );

    if (policies.rows.length === 0) {
      console.log(`  ⚠️  NO POLICIES DEFINED`);
    } else {
      console.log(`  Policies (${policies.rows.length}):`);
      policies.rows.forEach((p) => {
        console.log(`    - ${p.policyname} (${p.cmd})`);
      });
    }

    console.log("");
  }

  // Test current_tenant_id() function
  console.log("🧪 Testing current_tenant_id() function...\n");

  const withoutContext = await pool.query("SELECT current_tenant_id()");
  console.log(
    `Without context: ${withoutContext.rows[0].current_tenant_id} (expected: 00000000-0000-0000-0000-000000000000)`
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SET LOCAL app.current_tenant_id = '11111111-2222-3333-4444-555555555555'"
    );
    const withContext = await client.query("SELECT current_tenant_id()");
    console.log(
      `With context: ${withContext.rows[0].current_tenant_id} (expected: 11111111-2222-3333-4444-555555555555)`
    );
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }

  await pool.end();
}

checkRLS().catch(console.error);
