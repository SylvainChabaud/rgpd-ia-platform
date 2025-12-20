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
  ssl: false, // activer en prod si nécessaire
});

pool.on("error", (err) => {
  // err est typé Error → on reste conforme
  console.error("PostgreSQL pool error", {
    name: err.name,
    message: err.message,
  });
});
