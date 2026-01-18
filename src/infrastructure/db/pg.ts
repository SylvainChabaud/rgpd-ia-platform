import { Pool } from "pg";
import "dotenv/config";

/**
 * Pool PostgreSQL centralisé
 * - usage infra uniquement
 * - aucune logique métier
 * - logs strictement techniques (P1)
 */

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SECURITY: Enable SSL in production (OWASP A02:2021 - Cryptographic Failures)
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false,
});

pool.on("error", (err) => {
  // err est typé Error → on reste conforme
  console.error("PostgreSQL pool error", {
    name: err.name,
    message: err.message,
  });
});
