#!/usr/bin/env npx tsx
/**
 * Hook PreToolUse: Bloque les commandes destructives.
 * Patterns bloqués: rm -rf, mkfs, dd
 */

import { readFileSync } from "fs";

// Force module isolation
export {};

const EXIT_DENY = 2;
const DESTRUCTIVE_PATTERNS = [/\brm\s+-rf\b/i, /\bmkfs\b/i, /\bdd\b/i];

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

function runDestructiveCheck(): number {
  let payload = "";

  try {
    payload = readFileSync(0, "utf-8");
  } catch {
    payload = "";
  }

  const searchText = (extractCommandFromPayload(payload) || "") + "\n" + payload;

  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(searchText)) {
      console.log(`❌ BLOCKED destructive pattern: ${pattern}`);
      return EXIT_DENY;
    }
  }

  return 0;
}

process.exit(runDestructiveCheck());
