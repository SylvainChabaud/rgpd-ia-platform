import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pool } from "@/infrastructure/db/pg";
import { logger } from "@/infrastructure/logging/logger";

/**
 * LOT 4.0: Idempotent migration system with version tracking
 *
 * Expectations:
 * - Migration files named: NNN_description.sql (e.g., 001_init.sql)
 * - Each migration responsible for its own transaction (BEGIN/COMMIT)
 * - schema_migrations table tracks applied versions
 * - Migrations run in ascending version order
 * - Already applied migrations are skipped
 *
 * RGPD compliance:
 * - No sensitive data in migrations
 * - Logs contain version numbers only (P1)
 */

export async function runMigrations(
  migrationsDir = "migrations"
): Promise<void> {
  // Ensure schema_migrations table exists (bootstrap)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Get already applied migrations
  const appliedResult = await pool.query<{ version: number }>(
    "SELECT version FROM schema_migrations ORDER BY version"
  );
  const appliedVersions = new Set(
    appliedResult.rows.map((row) => row.version)
  );

  // Get migration files and extract versions
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const f of files) {
    // Extract version from filename (e.g., "002_lot4.sql" -> 2)
    const match = f.match(/^(\d+)_/);
    if (!match) {
      logger.warn({ event: 'migration_skip_malformed', filename: f }, 'Skipping malformed migration filename');
      continue;
    }

    const version = parseInt(match[1], 10);

    // Skip if already applied
    if (appliedVersions.has(version)) {
      logger.info({ event: 'migration_skip', version }, 'Migration already applied, skipping');
      continue;
    }

    // Read and execute migration
    logger.info({ event: 'migration_start', version, filename: f }, 'Applying migration');
    const sql = readFileSync(join(migrationsDir, f), "utf-8");

    try {
      await pool.query(sql);
      logger.info({ event: 'migration_success', version }, 'Migration applied successfully');
    } catch (error) {
      // Log error without exposing SQL content (RGPD P1)
      logger.error({
        event: 'migration_failed',
        version,
        filename: f,
        error: error instanceof Error ? error.message : String(error),
      }, 'Migration failed');
      throw error;
    }
  }

  logger.info({ event: 'migrations_completed' }, 'All migrations completed');
}
