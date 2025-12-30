/**
 * Check if current database user is superuser
 */

import { pool } from "../src/infrastructure/db/pg";

async function checkUserRole() {
  const result = await pool.query(`
    SELECT
      usename,
      usesuper,
      usecreatedb,
      usebypassrls
    FROM pg_user
    WHERE usename = current_user
  `);

  console.log("🔍 Current database user:");
  console.log(result.rows[0]);

  if (result.rows[0].usebypassrls) {
    console.log("\n⚠️  USER HAS BYPASSRLS PRIVILEGE - RLS WILL NOT BE ENFORCED!");
  } else {
    console.log("\n✅ User does NOT bypass RLS");
  }

  await pool.end();
}

checkUserRole().catch(console.error);
