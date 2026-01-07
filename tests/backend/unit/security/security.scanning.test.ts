/**
 * Security Scanning Tests
 *
 * EPIC 9 — LOT 9.1 — Pentest & Vulnerability Scanning
 *
 * Tests to verify security scanning infrastructure is properly configured.
 *
 * RGPD Compliance:
 * - Art. 32: Vérification configuration sécurité
 */

import { describe, it, expect } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";

describe("Security Scanning Configuration", () => {
  const rootDir = process.cwd();

  describe("NPM Audit Script", () => {
    const scriptPath = path.join(rootDir, "scripts/security/npm-audit.ts");

    it("should have npm-audit.ts script", () => {
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    it("should define severity levels", () => {
      const content = fs.readFileSync(scriptPath, "utf-8");
      expect(content).toContain("critical");
      expect(content).toContain("high");
      expect(content).toContain("moderate");
      expect(content).toContain("low");
    });

    it("should have fail-on configuration", () => {
      const content = fs.readFileSync(scriptPath, "utf-8");
      expect(content).toContain("--fail-on");
      expect(content).toContain("DEFAULT_FAIL_ON");
    });

    it("should generate JSON reports", () => {
      const content = fs.readFileSync(scriptPath, "utf-8");
      expect(content).toContain("--json");
      expect(content).toContain("reportsDir");
      expect(content).toContain("saveReport");
    });
  });

  describe("OWASP ZAP Configuration", () => {
    const configPath = path.join(rootDir, "scripts/security/owasp-zap-config.yaml");

    it("should have ZAP configuration file", () => {
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it("should configure passive scan rules", () => {
      const content = fs.readFileSync(configPath, "utf-8");
      expect(content).toContain("passiveScan:");
      expect(content).toContain("rules:");
    });

    it("should configure active scan rules", () => {
      const content = fs.readFileSync(configPath, "utf-8");
      expect(content).toContain("activeScan:");
      expect(content).toContain("SQL Injection");
      expect(content).toContain("Cross Site Scripting");
    });

    it("should have RGPD-specific checks", () => {
      const content = fs.readFileSync(configPath, "utf-8");
      expect(content).toContain("PII in Response Body");
      expect(content).toContain("Tenant ID Leak");
    });

    it("should configure reporting", () => {
      const content = fs.readFileSync(configPath, "utf-8");
      expect(content).toContain("reporting:");
      expect(content).toContain("html");
      expect(content).toContain("json");
    });
  });

  describe("Security Scan Script", () => {
    const scriptPath = path.join(rootDir, "scripts/security/run-security-scan.sh");

    it("should have main security scan script", () => {
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    it("should support multiple scan types", () => {
      const content = fs.readFileSync(scriptPath, "utf-8");
      expect(content).toContain("npm");
      expect(content).toContain("zap");
      expect(content).toContain("trivy");
      expect(content).toContain("all");
    });

    it("should generate reports directory", () => {
      const content = fs.readFileSync(scriptPath, "utf-8");
      expect(content).toContain("REPORTS_DIR");
      expect(content).toContain("mkdir -p");
    });

    it("should reference RGPD compliance", () => {
      const content = fs.readFileSync(scriptPath, "utf-8");
      expect(content).toContain("Art. 32");
      expect(content).toContain("RGPD");
    });
  });

  describe("GitHub Actions Workflow", () => {
    const workflowPath = path.join(rootDir, ".github/workflows/security-scan.yml");

    it("should have security scan workflow", () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    it("should run on pull requests", () => {
      const content = fs.readFileSync(workflowPath, "utf-8");
      expect(content).toContain("pull_request:");
    });

    it("should have scheduled runs", () => {
      const content = fs.readFileSync(workflowPath, "utf-8");
      expect(content).toContain("schedule:");
      expect(content).toContain("cron:");
    });

    it("should include all scan jobs", () => {
      const content = fs.readFileSync(workflowPath, "utf-8");
      expect(content).toContain("npm-audit:");
      expect(content).toContain("zap-scan:");
      expect(content).toContain("trivy-scan:");
    });

    it("should upload scan artifacts", () => {
      const content = fs.readFileSync(workflowPath, "utf-8");
      expect(content).toContain("actions/upload-artifact");
    });

    it("should include dependency review for PRs", () => {
      const content = fs.readFileSync(workflowPath, "utf-8");
      expect(content).toContain("dependency-review:");
      expect(content).toContain("fail-on-severity: high");
    });
  });
});

describe("Security Thresholds", () => {
  it("should fail on high severity by default", () => {
    const npmAuditPath = path.join(process.cwd(), "scripts/security/npm-audit.ts");
    const content = fs.readFileSync(npmAuditPath, "utf-8");
    
    // Check default fail-on is "high"
    expect(content).toContain('DEFAULT_FAIL_ON: SeverityLevel = "high"');
  });

  it("should have RGPD-critical rules at HIGH threshold in ZAP", () => {
    const zapConfigPath = path.join(process.cwd(), "scripts/security/owasp-zap-config.yaml");
    const content = fs.readFileSync(zapConfigPath, "utf-8");
    
    // SQL Injection should be HIGH
    expect(content).toContain("id: 40018");
    expect(content).toContain("threshold: HIGH");
    
    // Information Disclosure in URL should be HIGH (PII protection)
    expect(content).toContain("id: 10024");
  });
});
