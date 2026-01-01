#!/usr/bin/env npx ts-node
/**
 * NPM Security Audit Script
 *
 * EPIC 9 — LOT 9.1 — Pentest & Vulnerability Scanning
 *
 * Runs npm audit and generates structured report for CI/CD integration.
 * Fails build if critical/high vulnerabilities are found.
 *
 * RGPD Compliance:
 * - Art. 32: Mesures techniques sécurité (détection vulnérabilités)
 *
 * Usage:
 *   npx ts-node scripts/security/npm-audit.ts
 *   npx ts-node scripts/security/npm-audit.ts --fail-on=high
 *   npx ts-node scripts/security/npm-audit.ts --json > audit-report.json
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// TYPES
// =============================================================================

interface NpmAuditVulnerability {
  name: string;
  severity: "info" | "low" | "moderate" | "high" | "critical";
  isDirect: boolean;
  via: string[];
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
}

interface NpmAuditReport {
  auditReportVersion: number;
  vulnerabilities: Record<string, NpmAuditVulnerability>;
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
      total: number;
    };
    dependencies: {
      prod: number;
      dev: number;
      optional: number;
      peer: number;
      peerOptional: number;
      total: number;
    };
  };
}

interface AuditResult {
  success: boolean;
  timestamp: string;
  summary: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    info: number;
    total: number;
  };
  vulnerabilities: Array<{
    package: string;
    severity: string;
    fixAvailable: boolean;
    via: string[];
  }>;
  recommendation: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SEVERITY_LEVELS = ["info", "low", "moderate", "high", "critical"] as const;
type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

// Default: fail on high or critical
const DEFAULT_FAIL_ON: SeverityLevel = "high";

// =============================================================================
// MAIN LOGIC
// =============================================================================

function parseArgs(): { failOn: SeverityLevel; json: boolean; fix: boolean } {
  const args = process.argv.slice(2);
  let failOn: SeverityLevel = DEFAULT_FAIL_ON;
  let json = false;
  let fix = false;

  for (const arg of args) {
    if (arg.startsWith("--fail-on=")) {
      const level = arg.split("=")[1] as SeverityLevel;
      if (SEVERITY_LEVELS.includes(level)) {
        failOn = level;
      }
    }
    if (arg === "--json") {
      json = true;
    }
    if (arg === "--fix") {
      fix = true;
    }
  }

  return { failOn, json, fix };
}

function runNpmAudit(): NpmAuditReport | null {
  try {
    const output = execSync("npm audit --json", {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    return JSON.parse(output);
  } catch (error) {
    // npm audit returns non-zero exit code if vulnerabilities found
    if (error instanceof Error && "stdout" in error) {
      try {
        return JSON.parse((error as { stdout: string }).stdout);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function analyzeReport(report: NpmAuditReport): AuditResult {
  const { metadata, vulnerabilities } = report;

  const vulnList = Object.entries(vulnerabilities).map(([pkg, vuln]) => ({
    package: pkg,
    severity: vuln.severity,
    fixAvailable: !!vuln.fixAvailable,
    via: vuln.via,
  }));

  // Sort by severity (critical first)
  vulnList.sort(
    (a, b) =>
      SEVERITY_ORDER[b.severity as SeverityLevel] -
      SEVERITY_ORDER[a.severity as SeverityLevel]
  );

  const summary = metadata.vulnerabilities;

  let recommendation = "";
  if (summary.critical > 0) {
    recommendation = "🚨 CRITICAL: Immediate patching required!";
  } else if (summary.high > 0) {
    recommendation = "⚠️ HIGH: Schedule patching within 24 hours.";
  } else if (summary.moderate > 0) {
    recommendation = "📋 MODERATE: Plan patching within 1 week.";
  } else if (summary.low > 0 || summary.info > 0) {
    recommendation = "ℹ️ LOW/INFO: Review and plan accordingly.";
  } else {
    recommendation = "✅ No vulnerabilities found!";
  }

  return {
    success: summary.critical === 0 && summary.high === 0,
    timestamp: new Date().toISOString(),
    summary: {
      critical: summary.critical,
      high: summary.high,
      moderate: summary.moderate,
      low: summary.low,
      info: summary.info,
      total: summary.total,
    },
    vulnerabilities: vulnList,
    recommendation,
  };
}

function shouldFail(result: AuditResult, failOn: SeverityLevel): boolean {
  const threshold = SEVERITY_ORDER[failOn];

  if (threshold <= SEVERITY_ORDER.critical && result.summary.critical > 0)
    return true;
  if (threshold <= SEVERITY_ORDER.high && result.summary.high > 0) return true;
  if (threshold <= SEVERITY_ORDER.moderate && result.summary.moderate > 0)
    return true;
  if (threshold <= SEVERITY_ORDER.low && result.summary.low > 0) return true;
  if (threshold <= SEVERITY_ORDER.info && result.summary.info > 0) return true;

  return false;
}

function printReport(result: AuditResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("🔒 NPM SECURITY AUDIT REPORT");
  console.log("=".repeat(60));
  console.log(`📅 Timestamp: ${result.timestamp}`);
  console.log("");
  console.log("📊 SUMMARY:");
  console.log(`   Critical: ${result.summary.critical}`);
  console.log(`   High:     ${result.summary.high}`);
  console.log(`   Moderate: ${result.summary.moderate}`);
  console.log(`   Low:      ${result.summary.low}`);
  console.log(`   Info:     ${result.summary.info}`);
  console.log(`   ─────────────────`);
  console.log(`   Total:    ${result.summary.total}`);
  console.log("");
  console.log(`💡 ${result.recommendation}`);

  if (result.vulnerabilities.length > 0) {
    console.log("");
    console.log("🔍 TOP VULNERABILITIES:");
    const top10 = result.vulnerabilities.slice(0, 10);
    for (const vuln of top10) {
      const fixIcon = vuln.fixAvailable ? "✓" : "✗";
      console.log(
        `   [${vuln.severity.toUpperCase().padEnd(8)}] ${vuln.package} (fix: ${fixIcon})`
      );
    }
    if (result.vulnerabilities.length > 10) {
      console.log(`   ... and ${result.vulnerabilities.length - 10} more`);
    }
  }

  console.log("=".repeat(60) + "\n");
}

function saveReport(result: AuditResult): void {
  const reportsDir = path.join(process.cwd(), "reports", "security");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `npm-audit-${new Date().toISOString().split("T")[0]}.json`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
  console.log(`📁 Report saved: ${filepath}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const { failOn, json, fix } = parseArgs();

  console.log("🔍 Running npm audit...");

  if (fix) {
    console.log("🔧 Attempting to fix vulnerabilities...");
    try {
      execSync("npm audit fix", { stdio: "inherit" });
    } catch {
      console.log("⚠️ Some vulnerabilities could not be fixed automatically.");
    }
  }

  const report = runNpmAudit();

  if (!report) {
    console.error("❌ Failed to run npm audit");
    process.exit(1);
  }

  const result = analyzeReport(report);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(result);
    saveReport(result);
  }

  if (shouldFail(result, failOn)) {
    console.error(`❌ Build failed: vulnerabilities found at ${failOn} level or above`);
    process.exit(1);
  }

  console.log("✅ Security audit passed!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
