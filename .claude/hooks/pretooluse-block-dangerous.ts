#!/usr/bin/env npx tsx
/**
 * Hook PreToolUse: Bloque les commandes dangereuses.
 * Pattern bloqué: sudo uniquement
 * Note: curl, wget, ssh sont autorisés pour ce projet (développement)
 */

import { readFileSync } from "fs";

// Force module isolation
export {};

const EXIT_DENY = 2;
const DANGEROUS_PATTERNS = [/\bsudo\b/i];

function extractCommandFromPayload(payload: string): string {
  try {
    const obj = JSON.parse(payload);
    return (
      obj?.tool_input?.command ||
      obj?.command ||
      obj?.input?.command ||
      ""
    );
  } catch {
    return "";
  }
}

function runDangerousCheck(): number {
  let payload = "";

  try {
    payload = readFileSync(0, "utf-8");
  } catch {
    payload = "";
  }

  const searchText = (extractCommandFromPayload(payload) || "") + "\n" + payload;

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(searchText)) {
      console.log(`❌ BLOCKED dangerous pattern: ${pattern}`);
      return EXIT_DENY;
    }
  }

  return 0;
}

process.exit(runDangerousCheck());
