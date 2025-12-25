#!/usr/bin/env tsx
/**
 * Manual migration runner
 *
 * Usage:
 *   tsx scripts/migrate.ts
 *
 * Requires: DATABASE_URL environment variable
 *
 * RGPD compliance:
 * - Logs migration versions only (P1)
 * - No sensitive data in migrations
 */

import { runMigrations } from "@/infrastructure/db/migrate";
import { pool } from "@/infrastructure/db/pg";

async function main() {
  try {
    console.log("Starting database migrations...");
    await runMigrations();
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
