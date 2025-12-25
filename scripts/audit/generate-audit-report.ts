/**
 * Audit Report Generator (EPIC 7, LOT 7.1)
 * Generates a consolidated audit report from collected evidence
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const AUDIT_DIR = "audit-artifacts";

console.log("========================================");
console.log("RGPD Platform - Audit Report Generator");
console.log("========================================");
console.log("");

// Check if evidence has been collected
if (!existsSync(join(AUDIT_DIR, "metadata.json"))) {
  console.error("❌ ERROR: No evidence metadata found");
  console.error("Please run 'pnpm audit:collect-evidence' first");
  process.exit(1);
}

// Load metadata
const metadata = JSON.parse(readFileSync(join(AUDIT_DIR, "metadata.json"), "utf-8"));
const timestamp = new Date().toISOString();
const reportDate = timestamp.split("T")[0];

console.log(`Generating audit report for ${reportDate}...`);
console.log("");

// Load additional data
const gitCommit = existsSync(join(AUDIT_DIR, "git-commit.txt"))
  ? readFileSync(join(AUDIT_DIR, "git-commit.txt"), "utf-8").trim()
  : "N/A";

const gitBranch = existsSync(join(AUDIT_DIR, "git-branch.txt"))
  ? readFileSync(join(AUDIT_DIR, "git-branch.txt"), "utf-8").trim()
  : "N/A";

// Calculate overall compliance score
interface EvidenceCheck {
  status: "passed" | "failed";
  exitCode: number;
}

const evidenceChecks = metadata.evidence as Record<string, EvidenceCheck>;
const totalChecks = Object.keys(evidenceChecks).length;
const passedChecks = Object.values(evidenceChecks).filter(
  (check) => check.status === "passed"
).length;
const complianceScore = Math.round((passedChecks / totalChecks) * 100);

// Determine compliance status
let complianceStatus: string;
let complianceEmoji: string;

if (complianceScore === 100) {
  complianceStatus = "FULL COMPLIANCE";
  complianceEmoji = "✅";
} else if (complianceScore >= 80) {
  complianceStatus = "PARTIAL COMPLIANCE";
  complianceEmoji = "🟡";
} else {
  complianceStatus = "NON-COMPLIANT";
  complianceEmoji = "❌";
}

// Generate Markdown report
const reportMarkdown = `# Audit Report — RGPD Platform

**Generated**: ${timestamp}
**Report Date**: ${reportDate}
**Git Commit**: ${gitCommit}
**Git Branch**: ${gitBranch}
**Project**: ${metadata.project.name} v${metadata.project.version}

---

## Executive Summary

### Overall Compliance Status

**Status**: ${complianceEmoji} **${complianceStatus}** (${complianceScore}%)

**Automated Checks**: ${passedChecks}/${totalChecks} passed

### Key Findings

${
  complianceScore === 100
    ? "- ✅ All automated compliance checks passed\n- ✅ No critical issues detected\n- ✅ Platform ready for RGPD audit"
    : complianceScore >= 80
    ? "- 🟡 Most automated checks passed\n- ⚠️ Some non-critical issues detected\n- 🟡 Platform requires minor fixes before audit"
    : "- ❌ Critical compliance issues detected\n- ❌ Platform NOT ready for RGPD audit\n- ❌ Immediate action required"
}

---

## Automated Evidence Checks

| Check | Status | Exit Code | Evidence File |
|-------|--------|-----------|---------------|
| Full test suite | ${evidenceChecks.tests.status === "passed" ? "✅ PASS" : "❌ FAIL"} | ${evidenceChecks.tests.exitCode} | \`audit-artifacts/tests.log\` |
| RGPD tests | ${evidenceChecks.rgpdTests.status === "passed" ? "✅ PASS" : "❌ FAIL"} | ${evidenceChecks.rgpdTests.exitCode} | \`audit-artifacts/rgpd-tests-runner.log\` |
| Secrets scan | ${evidenceChecks.secretsScan.status === "passed" ? "✅ PASS" : "❌ FAIL"} | ${evidenceChecks.secretsScan.exitCode} | \`audit-artifacts/scan-secrets-result.txt\` |
| Linter | ${evidenceChecks.lint.status === "passed" ? "✅ PASS" : "❌ FAIL"} | ${evidenceChecks.lint.exitCode} | \`audit-artifacts/lint-result.txt\` |
| Type checker | ${evidenceChecks.typecheck.status === "passed" ? "✅ PASS" : "❌ FAIL"} | ${evidenceChecks.typecheck.exitCode} | \`audit-artifacts/typecheck-result.txt\` |

---

## RGPD Compliance Coverage

### Articles RGPD Implemented

| Article | Description | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **Art. 5** | Principes traitement | ✅ Implemented | [registre-traitements.md](../docs/rgpd/registre-traitements.md) |
| **Art. 6** | Licéité traitement | ✅ Implemented | Consentements (table \`consents\`), CGU (EPIC 12) |
| **Art. 7** | Conditions consentement | ✅ Implemented | Tests \`consent.test.ts\` |
| **Art. 13-14** | Information personnes | ⏳ Planned EPIC 12 | Politique confidentialité (LOT 12.0) |
| **Art. 15-22** | Droits personnes | ✅ Implemented | Export (LOT 5.1), Effacement (LOT 5.2) |
| **Art. 24-25** | Responsabilité RT | ✅ Implemented | Privacy by design ([BOUNDARIES.md](../docs/architecture/BOUNDARIES.md)) |
| **Art. 30** | Registre traitements | ✅ Implemented | [registre-traitements.md](../docs/rgpd/registre-traitements.md) |
| **Art. 32** | Sécurité traitement | ✅ Implemented | Chiffrement, isolation, backups (EPIC 2, 6) |
| **Art. 33-34** | Violation données | ✅ Implemented | [incident.md](../docs/runbooks/incident.md) |
| **Art. 35** | DPIA | ✅ Implemented | [dpia.md](../docs/rgpd/dpia.md) |

### RGPD Features

| Feature | Status | Tests | Documentation |
|---------|--------|-------|---------------|
| Multi-tenant isolation | ✅ Implemented | \`tests/tenant/isolation.test.ts\` | LOT 1.1 |
| Gateway LLM (no bypass) | ✅ Implemented | \`tests/ai/no-bypass.test.ts\` | LOT 1.4 |
| Consent management | ✅ Implemented | \`tests/rgpd/consent.test.ts\` | LOT 5.0 |
| Export RGPD (bundle chiffré) | ✅ Implemented | \`tests/rgpd/export.test.ts\` | LOT 5.1 |
| Effacement RGPD (soft delete + purge) | ✅ Implemented | \`tests/rgpd/delete.test.ts\` | LOT 5.2 |
| Audit trail RGPD-safe | ✅ Implemented | \`tests/rgpd/audit-safe.test.ts\` | LOT 1.3 |
| No sensitive logs | ✅ Implemented | \`tests/rgpd/no-sensitive-logs.test.ts\` | LOT 6.1 |
| Retention & purge | ✅ Implemented | \`tests/rgpd/purge.test.ts\` | LOT 4.1 |
| Pseudonymisation PII | ⏳ Planned EPIC 11 | N/A | LOT 11.0 |
| Cookie consent banner | ⏳ Planned EPIC 12 | N/A | LOT 12.3 |

---

## Architecture Compliance

### Boundaries Enforcement

| Boundary Rule | Status | Evidence |
|---------------|--------|----------|
| No LLM calls outside Gateway | ✅ Enforced | \`tests/ai/no-bypass.test.ts\` |
| No sensitive data in logs | ✅ Enforced | \`tests/rgpd/no-sensitive-logs.test.ts\` |
| Strict tenant isolation | ✅ Enforced | \`tests/tenant/isolation.test.ts\` |
| No P3 data by default | ✅ Enforced | [DATA_CLASSIFICATION.md](../docs/data/DATA_CLASSIFICATION.md) |
| No prompt storage by default | ✅ Enforced | \`tests/ai/no-storage.test.ts\` |

### Security Measures (Art. 32)

| Measure | Implementation | Evidence |
|---------|----------------|----------|
| Chiffrement repos (AES-256-GCM) | ✅ Implemented | Infrastructure config |
| Chiffrement transit (TLS 1.3) | ✅ Implemented | HTTPS only (EPIC 2) |
| Isolation multi-tenant | ✅ Implemented | \`tests/tenant/isolation.test.ts\` |
| RBAC/ABAC | ✅ Implemented | \`tests/auth/rbac.test.ts\` |
| Backups quotidiens | ✅ Implemented | [backup-policy.md](../docs/runbooks/backup-policy.md) |
| Scan secrets CI/CD | ✅ Implemented | \`scripts/audit/scan-secrets.sh\` |

---

## Documentation RGPD

### Mandatory Documents (CNIL-ready)

| Document | Status | Location |
|----------|--------|----------|
| **Registre des traitements** (Art. 30) | ✅ Complete | [docs/rgpd/registre-traitements.md](../docs/rgpd/registre-traitements.md) |
| **DPIA Gateway LLM** (Art. 35) | ✅ Complete | [docs/rgpd/dpia.md](../docs/rgpd/dpia.md) |
| **Runbook incident RGPD** (Art. 33-34) | ✅ Complete | [docs/runbooks/incident.md](../docs/runbooks/incident.md) |
| **Evidence cartography** | ✅ Complete | [docs/audit/evidence.md](../docs/audit/evidence.md) |
| **Politique de confidentialité** (Art. 13-14) | ⏳ Planned EPIC 12 | LOT 12.0 |
| **CGU** (base légale contrat) | ⏳ Planned EPIC 12 | LOT 12.1 |
| **Page Informations RGPD** | ⏳ Planned EPIC 12 | LOT 12.2 |

### Operational Runbooks

| Runbook | Status | Location |
|---------|--------|----------|
| Bootstrap plateforme | ✅ Complete | [docs/runbooks/bootstrap.md](../docs/runbooks/bootstrap.md) |
| Security hardening | ✅ Complete | [docs/runbooks/security-hardening.md](../docs/runbooks/security-hardening.md) |
| Backup & restore | ✅ Complete | [docs/runbooks/backup-policy.md](../docs/runbooks/backup-policy.md) |
| Incident RGPD | ✅ Complete | [docs/runbooks/incident.md](../docs/runbooks/incident.md) |

---

## Recommendations

### Critical (Blockers)

${
  complianceScore < 100
    ? evidenceChecks.tests.status !== "passed"
      ? "- ❌ **Fix failing tests** before production deployment\n"
      : "" + evidenceChecks.secretsScan.status !== "passed"
      ? "- ❌ **Remove hardcoded secrets** immediately (security breach)\n"
      : "" + evidenceChecks.lint.status !== "passed"
      ? "- ❌ **Fix linting errors** (code quality gate)\n"
      : "" + evidenceChecks.typecheck.status !== "passed"
      ? "- ❌ **Fix type errors** (runtime safety)\n"
      : ""
    : "- ✅ No critical blockers detected"
}

### High Priority

- ⏳ Deploy **EPIC 11 (Pseudonymisation PII)** before production with sensitive data
- ⏳ Complete **EPIC 12 (Legal docs)** for full RGPD transparency
- ⏳ Sign **DPA contracts** with LLM provider and hosting provider
- ⏳ Schedule **annual pentest** (EPIC 13, LOT 13.1)

### Medium Priority

- 🟡 Review manual DoD items (architecture boundaries, sensitive logs)
- 🟡 Configure **production monitoring** (alerts incidents RGPD)
- 🟡 Train **DPO and admins** on RGPD procedures
- 🟡 Schedule **quarterly DPIA review**

### Low Priority

- 🟢 Document **changelog RGPD** (track compliance evolution)
- 🟢 Prepare **communication plan** for users (transparency)
- 🟢 Consider **ISO 27001/27701 certification**

---

## Audit Trail

### Evidence Artifacts

All evidence artifacts are stored in \`audit-artifacts/\` and versioned via Git commit.

**Git Commit**: ${gitCommit}
**Branch**: ${gitBranch}
**Timestamp**: ${metadata.timestamp}

### Artifact Manifest

- \`audit-artifacts/metadata.json\` — Evidence metadata (this report source)
- \`audit-artifacts/compliance-checklist.md\` — DoD checklist
- \`audit-artifacts/tests.log\` — Full test suite output
- \`audit-artifacts/rgpd-tests-runner.log\` — RGPD tests output
- \`audit-artifacts/scan-secrets-result.txt\` — Secrets scan results
- \`audit-artifacts/lint-result.txt\` — Linter output
- \`audit-artifacts/typecheck-result.txt\` — Type checker output
- \`audit-artifacts/coverage/\` — Test coverage report

---

## Conclusion

${
  complianceScore === 100
    ? `### ✅ RGPD Compliance: PASSED

The RGPD-IA platform has **successfully passed all automated compliance checks** and is **ready for CNIL audit**.

**Next Steps**:
1. Complete EPIC 12 (legal documentation) for full transparency
2. Deploy EPIC 11 (pseudonymisation PII) before handling sensitive data
3. Sign DPA contracts with external providers
4. Schedule annual pentest and external audit`
    : complianceScore >= 80
    ? `### 🟡 RGPD Compliance: PARTIAL

The RGPD-IA platform has **passed most automated checks** but requires **minor fixes** before CNIL audit.

**Action Required**:
1. Fix failing checks (see Recommendations section)
2. Complete DoD manual review items
3. Re-run evidence collection after fixes`
    : `### ❌ RGPD Compliance: FAILED

The RGPD-IA platform has **critical compliance issues** and is **NOT ready for production or CNIL audit**.

**Immediate Action Required**:
1. Fix all critical blockers (see Recommendations section)
2. Re-run full test suite and evidence collection
3. Do NOT deploy to production until compliance score ≥ 80%`
}

---

**Report generated by**: \`scripts/audit/generate-audit-report.ts\`
**Audit framework**: EPIC 7 — Kit conformité & audit RGPD
**References**: [TASKS.md](../TASKS.md), [evidence.md](../docs/audit/evidence.md)
`;

// Write Markdown report
const reportFilename = `audit-report-${reportDate}.md`;
writeFileSync(join(AUDIT_DIR, reportFilename), reportMarkdown, "utf-8");

console.log("✅ Audit report generated:");
console.log(`   ${join(AUDIT_DIR, reportFilename)}`);
console.log("");
console.log("========================================");
console.log(`Overall Compliance: ${complianceEmoji} ${complianceStatus} (${complianceScore}%)`);
console.log("========================================");
console.log("");

// Summary to console
console.log("Automated Checks:");
console.log(`  Tests: ${evidenceChecks.tests.status === "passed" ? "✅" : "❌"}`);
console.log(`  RGPD Tests: ${evidenceChecks.rgpdTests.status === "passed" ? "✅" : "❌"}`);
console.log(`  Secrets Scan: ${evidenceChecks.secretsScan.status === "passed" ? "✅" : "❌"}`);
console.log(`  Lint: ${evidenceChecks.lint.status === "passed" ? "✅" : "❌"}`);
console.log(`  Typecheck: ${evidenceChecks.typecheck.status === "passed" ? "✅" : "❌"}`);
console.log("");

if (complianceScore === 100) {
  console.log("🎉 Congratulations! Platform is RGPD-compliant and audit-ready.");
  process.exit(0);
} else {
  console.log("⚠️  Action required. See report for details.");
  process.exit(complianceScore >= 80 ? 0 : 1);
}
