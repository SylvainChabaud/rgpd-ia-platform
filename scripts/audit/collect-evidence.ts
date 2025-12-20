/**
 * Evidence collector (EPIC 7). Produces static, audit-ready artifacts.
 * This script MUST NOT call external services and MUST NOT include sensitive data.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const outDir = "audit-artifacts";
mkdirSync(outDir, { recursive: true });

function run(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString("utf-8");
  } catch (e) {
    return `FAILED: ${cmd}`;
  }
}

writeFileSync(join(outDir, "tests.txt"), run("pnpm test"), "utf-8");
writeFileSync(join(outDir, "timestamp.txt"), new Date().toISOString(), "utf-8");
