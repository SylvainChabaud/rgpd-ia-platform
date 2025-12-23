import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const rootDir = join(process.cwd(), "src");

function listFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (entry.startsWith(".")) continue;
      files.push(...listFiles(fullPath));
      continue;
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizePath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/");
}

test("no LLM client usage outside gateway", () => {
  const files = listFiles(rootDir);
  const bannedClientPatterns = [
    /\bopenai\b/i,
    /\banthropic\b/i,
    /\bollama\b/i,
    /\blitellm\b/i,
  ];
  const bannedUrlPatterns = [
    /api\.openai\.com/i,
    /api\.anthropic\.com/i,
    /ollama/i,
    /litellm/i,
  ];

  for (const file of files) {
    const relPath = normalizePath(file).replace(
      normalizePath(rootDir) + "/",
      "src/"
    );
    if (relPath.startsWith("src/ai/gateway/")) {
      continue;
    }
    const content = readFileSync(file, "utf8");
    for (const pattern of bannedClientPatterns) {
      if (pattern.test(content)) {
        throw new Error(`LLM client usage detected in ${relPath}`);
      }
    }
    if (/fetch\s*\(/i.test(content)) {
      for (const urlPattern of bannedUrlPatterns) {
        if (urlPattern.test(content)) {
          throw new Error(`LLM fetch usage detected in ${relPath}`);
        }
      }
    }
  }
});

test("app layer only imports invokeLLM for AI", () => {
  const appDir = join(rootDir, "app");
  const files = listFiles(appDir);
  const importPattern = /from\s+["']([^"']+)["']/g;
  const dynamicImportPattern = /import\(\s*["']([^"']+)["']\s*\)/g;

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const paths: string[] = [];
    for (const match of content.matchAll(importPattern)) {
      paths.push(match[1]);
    }
    for (const match of content.matchAll(dynamicImportPattern)) {
      paths.push(match[1]);
    }

    for (const importPath of paths) {
      const normalized = normalizePath(importPath);
      const isAiImport =
        normalized.startsWith("@/ai/") || normalized.includes("/ai/");
      if (!isAiImport) continue;
      const isAllowed =
        normalized === "@/ai/gateway/invokeLLM" ||
        normalized.endsWith("/ai/gateway/invokeLLM") ||
        normalized.endsWith("/ai/gateway/invokeLLM.ts") ||
        normalized.endsWith("/ai/gateway/invokeLLM.js");
      if (!isAllowed) {
        throw new Error(
          `Disallowed AI import in app layer: ${normalized} (${file})`
        );
      }
    }
  }
});
