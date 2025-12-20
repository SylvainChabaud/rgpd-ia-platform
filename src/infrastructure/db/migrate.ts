import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pool } from "@/infrastructure/db/pg";

export async function runMigrations(
  migrationsDir = "migrations"
): Promise<void> {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const f of files) {
    const sql = readFileSync(join(migrationsDir, f), "utf-8");
    await pool.query(sql);
  }
}
