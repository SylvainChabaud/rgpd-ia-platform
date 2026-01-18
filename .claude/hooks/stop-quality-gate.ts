#!/usr/bin/env npx tsx
/**
 * Hook Stop: Exécute le quality gate avant la fin de session.
 * Bloque si le quality gate échoue.
 */

import { existsSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

// Force module isolation
export {};

function runQualityGateCheck(): number {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const gatePath = join(projectDir, "tools", "quality-gate.ts");

  if (!existsSync(gatePath)) {
    console.log(`⚠️ Quality gate not found: ${gatePath}`);
    console.log("ℹ️ Skipping quality gate check (file missing)");
    return 0; // Ne pas bloquer si le fichier n'existe pas encore
  }

  const result = spawnSync("npx", ["tsx", gatePath], {
    cwd: projectDir,
    stdio: "inherit",
    shell: true,
  });

  return result.status ?? 1;
}

process.exit(runQualityGateCheck());
