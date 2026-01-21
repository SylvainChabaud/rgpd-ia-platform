#!/usr/bin/env npx tsx
/**
 * Hook Stop: Vérification rapide à la fin de session.
 *
 * Ne fait QUE des vérifications rapides (pas de tests/lint) :
 * - Fichiers requis présents
 * - Pas de secrets évidents dans le code
 *
 * Pour le quality gate complet, utiliser : npm run quality-gate
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";

export {};

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Fichiers requis
const REQUIRED_FILES = [
  join(ROOT, "CLAUDE.md"),
  join(ROOT, ".claude", "settings.json"),
];

// Patterns de secrets critiques (seulement les plus évidents)
const CRITICAL_SECRET_PATTERNS = [
  /-----BEGIN PRIVATE KEY-----/,
  /-----BEGIN RSA PRIVATE KEY-----/,
];

// Extensions à scanner
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

// Fichiers exclus
const EXCLUDED_FILES = new Set(["settings.local.json", "settings.json"]);

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory() && !entry.startsWith(".") && entry !== "node_modules") {
        files.push(...getAllFiles(fullPath));
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore permission errors
  }
  return files;
}

function quickCheck(): number {
  // 1. Check required files exist
  for (const path of REQUIRED_FILES) {
    if (!existsSync(path)) {
      console.log(`⚠️ Missing: ${relative(ROOT, path)}`);
      // Don't block, just warn
    }
  }

  // 2. Quick scan for critical secrets (only src/ and app/)
  const dirsToScan = [join(ROOT, "src"), join(ROOT, "app")];

  for (const scanDir of dirsToScan) {
    if (!existsSync(scanDir)) continue;

    const files = getAllFiles(scanDir);
    for (const filePath of files) {
      const ext = extname(filePath).toLowerCase();
      const fileName = filePath.split(/[/\\]/).pop() || "";

      if (!SCAN_EXTENSIONS.has(ext) || EXCLUDED_FILES.has(fileName)) continue;

      try {
        const content = readFileSync(filePath, "utf-8");
        for (const pattern of CRITICAL_SECRET_PATTERNS) {
          if (pattern.test(content)) {
            console.log(`🚨 CRITICAL: Private key found in ${relative(ROOT, filePath)}`);
            return 1; // Block only for critical secrets
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // Success - no critical issues
  return 0;
}

process.exit(quickCheck());
