/**
 * Jest setup file
 * Load .env.test before running tests
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.test for test environment
config({ path: resolve(__dirname, ".env.test") });

console.log("✅ Loaded .env.test for Jest tests");
console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`);
