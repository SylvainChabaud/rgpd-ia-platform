/**
 * Evidence collector (EPIC 7, LOT 7.1). Produces static, audit-ready artifacts.
 * This script MUST NOT call external services and MUST NOT include sensitive data.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const outDir = "audit-artifacts";
mkdirSync(outDir, { recursive: true });

console.log("========================================");
console.log("RGPD Platform - Evidence Collector");
console.log("========================================");
console.log("");

interface ExecError extends Error {
  status?: number;
  stdout?: string;
}

function run(cmd: string, description: string): { output: string; exitCode: number } {
  console.log(`[${description}] Running: ${cmd}`);
  try {
    const output = execSync(cmd, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
    });
    console.log(`✅ ${description}: OK`);
    return { output, exitCode: 0 };
  } catch (error) {
    const e = error as ExecError;
    console.log(`❌ ${description}: FAILED (exit code: ${e.status ?? "unknown"})`);
    return { output: e.stdout ?? e.message ?? "FAILED", exitCode: e.status ?? 1 };
  }
}

// Timestamp
const timestamp = new Date().toISOString();
console.log(`Timestamp: ${timestamp}`);
writeFileSync(join(outDir, "timestamp.txt"), timestamp, "utf-8");

// Git commit (traceability)
const gitCommit = run("git rev-parse HEAD", "Git commit SHA");
writeFileSync(join(outDir, "git-commit.txt"), gitCommit.output.trim(), "utf-8");

const gitBranch = run("git rev-parse --abbrev-ref HEAD", "Git branch");
writeFileSync(join(outDir, "git-branch.txt"), gitBranch.output.trim(), "utf-8");

console.log("");
console.log("========================================");
console.log("Collecting Evidence");
console.log("========================================");
console.log("");

// 1. Run all tests (with coverage)
console.log("1/6 - Running full test suite...");
const testsResult = run("pnpm test -- --coverage --coverageDirectory=audit-artifacts/coverage", "Full test suite");
writeFileSync(join(outDir, "tests.log"), testsResult.output, "utf-8");

// 2. Run RGPD tests specifically
console.log("");
console.log("2/6 - Running RGPD tests...");
const rgpdTestsResult = run("bash scripts/audit/run-rgpd-tests.sh", "RGPD tests");
writeFileSync(join(outDir, "rgpd-tests-runner.log"), rgpdTestsResult.output, "utf-8");

// 3. Scan secrets
console.log("");
console.log("3/6 - Scanning for hardcoded secrets...");
const secretsScanResult = run("bash scripts/audit/scan-secrets.sh", "Secrets scan");
writeFileSync(join(outDir, "scan-secrets-result.txt"), secretsScanResult.output, "utf-8");

// 4. Lint
console.log("");
console.log("4/6 - Running linter...");
const lintResult = run("pnpm lint", "Linter");
writeFileSync(join(outDir, "lint-result.txt"), lintResult.output, "utf-8");

// 5. Typecheck
console.log("");
console.log("5/6 - Running type checker...");
const typecheckResult = run("pnpm typecheck", "Type checker");
writeFileSync(join(outDir, "typecheck-result.txt"), typecheckResult.output, "utf-8");

// 6. Collect metadata
console.log("");
console.log("6/6 - Collecting metadata...");

// Package.json info
const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
const metadata = {
  timestamp,
  git: {
    commit: gitCommit.output.trim(),
    branch: gitBranch.output.trim(),
  },
  project: {
    name: packageJson.name || "rgpd-ia-platform",
    version: packageJson.version || "1.0.0",
  },
  evidence: {
    tests: {
      status: testsResult.exitCode === 0 ? "passed" : "failed",
      exitCode: testsResult.exitCode,
    },
    rgpdTests: {
      status: rgpdTestsResult.exitCode === 0 ? "passed" : "failed",
      exitCode: rgpdTestsResult.exitCode,
    },
    secretsScan: {
      status: secretsScanResult.exitCode === 0 ? "passed" : "failed",
      exitCode: secretsScanResult.exitCode,
    },
    lint: {
      status: lintResult.exitCode === 0 ? "passed" : "failed",
      exitCode: lintResult.exitCode,
    },
    typecheck: {
      status: typecheckResult.exitCode === 0 ? "passed" : "failed",
      exitCode: typecheckResult.exitCode,
    },
  },
};

writeFileSync(join(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

// Generate compliance checklist
const checklist = `# Compliance Checklist (DoD)

**Generated**: ${timestamp}
**Git commit**: ${gitCommit.output.trim()}
**Branch**: ${gitBranch.output.trim()}

## Definition of Done (DoD)

- [${metadata.evidence.tests.status === "passed" ? "x" : " "}] Tests fonctionnels passants
- [${metadata.evidence.rgpdTests.status === "passed" ? "x" : " "}] Tests RGPD passants
- [${metadata.evidence.lint.status === "passed" ? "x" : " "}] Lint OK
- [${metadata.evidence.typecheck.status === "passed" ? "x" : " "}] Typecheck OK
- [${metadata.evidence.secretsScan.status === "passed" ? "x" : " "}] Scan secrets OK (0 violation)
- [ ] Frontières architecture respectées (review manuelle)
- [ ] Aucun appel IA hors Gateway LLM (review manuelle)
- [ ] Aucune donnée sensible logs (review manuelle)
- [ ] Classification données respectée (review manuelle)
- [ ] Comportement échec défini (review manuelle)
- [ ] Traçabilité RGPD minimale (review manuelle)

## Evidence Artifacts

| Artifact | Status | Location |
|----------|--------|----------|
| Full test suite | ${metadata.evidence.tests.status} | \`audit-artifacts/tests.log\` |
| RGPD tests | ${metadata.evidence.rgpdTests.status} | \`audit-artifacts/rgpd-tests-runner.log\` |
| Secrets scan | ${metadata.evidence.secretsScan.status} | \`audit-artifacts/scan-secrets-result.txt\` |
| Lint | ${metadata.evidence.lint.status} | \`audit-artifacts/lint-result.txt\` |
| Typecheck | ${metadata.evidence.typecheck.status} | \`audit-artifacts/typecheck-result.txt\` |
| Test coverage | — | \`audit-artifacts/coverage/\` |
| Metadata | — | \`audit-artifacts/metadata.json\` |

## References

- **Registre des traitements**: [docs/rgpd/registre-traitements.md](../docs/rgpd/registre-traitements.md)
- **DPIA Gateway LLM**: [docs/rgpd/dpia.md](../docs/rgpd/dpia.md)
- **Runbook incident**: [docs/runbooks/incident.md](../docs/runbooks/incident.md)
- **Evidence cartography**: [docs/audit/evidence.md](../docs/audit/evidence.md)
- **TASKS.md**: [TASKS.md](../TASKS.md)
`;

writeFileSync(join(outDir, "compliance-checklist.md"), checklist, "utf-8");

console.log("");
console.log("========================================");
console.log("Evidence Collection Complete");
console.log("========================================");
console.log("");
console.log("Artifacts generated:");
console.log("  - audit-artifacts/timestamp.txt");
console.log("  - audit-artifacts/git-commit.txt");
console.log("  - audit-artifacts/git-branch.txt");
console.log("  - audit-artifacts/metadata.json");
console.log("  - audit-artifacts/compliance-checklist.md");
console.log("  - audit-artifacts/tests.log");
console.log("  - audit-artifacts/rgpd-tests-runner.log");
console.log("  - audit-artifacts/scan-secrets-result.txt");
console.log("  - audit-artifacts/lint-result.txt");
console.log("  - audit-artifacts/typecheck-result.txt");
console.log("  - audit-artifacts/coverage/ (test coverage)");
console.log("");

// Overall status
const allPassed =
  metadata.evidence.tests.status === "passed" &&
  metadata.evidence.rgpdTests.status === "passed" &&
  metadata.evidence.secretsScan.status === "passed" &&
  metadata.evidence.lint.status === "passed" &&
  metadata.evidence.typecheck.status === "passed";

if (allPassed) {
  console.log("✅ All evidence collection checks passed");
  console.log("========================================");
  process.exit(0);
} else {
  console.log("❌ Some evidence collection checks failed");
  console.log("========================================");
  process.exit(1);
}
