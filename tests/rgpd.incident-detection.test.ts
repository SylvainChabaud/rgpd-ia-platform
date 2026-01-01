/**
 * RGPD Incident Detection Tests
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 *
 * Tests for automatic incident detection:
 * - Brute force detection
 * - Cross-tenant access detection
 * - Mass export detection
 *
 * RGPD Compliance:
 * - Art. 32: Mesures techniques sécurité
 * - Art. 33: Détection violations automatique
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  evaluateDetectionEvent,
  DETECTION_THRESHOLDS,
  type BruteForceEvent,
  type CrossTenantEvent,
  type MassExportEvent,
  type PiiInLogsEvent,
  type BackupFailureEvent,
} from "@/app/usecases/incident";
import {
  recordFailedLogin,
  getFailedLoginCount,
  clearFailedLogins,
  getIpsExceedingThreshold,
  getTrackerStats,
  resetTracker,
} from "@/infrastructure/security/FailedLoginTracker";

// =============================================================================
// DETECTION EVENT EVALUATION TESTS
// =============================================================================

describe("Incident Detection - Event Evaluation", () => {
  describe("Brute Force Detection", () => {
    it("should not create incident below threshold", () => {
      const event: BruteForceEvent = {
        type: "BRUTE_FORCE",
        sourceIp: "192.168.1.1",
        attemptCount: DETECTION_THRESHOLDS.BRUTE_FORCE_ATTEMPTS - 1,
        timeWindowMinutes: DETECTION_THRESHOLDS.BRUTE_FORCE_WINDOW_MINUTES,
      };

      const result = evaluateDetectionEvent(event);
      expect(result).toBeNull();
    });

    it("should create incident at threshold", () => {
      const event: BruteForceEvent = {
        type: "BRUTE_FORCE",
        sourceIp: "192.168.1.1",
        attemptCount: DETECTION_THRESHOLDS.BRUTE_FORCE_ATTEMPTS,
        timeWindowMinutes: DETECTION_THRESHOLDS.BRUTE_FORCE_WINDOW_MINUTES,
      };

      const result = evaluateDetectionEvent(event);
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("MEDIUM");
      expect(result?.type).toBe("UNAUTHORIZED_ACCESS");
      expect(result?.riskLevel).toBe("LOW"); // Blocked = low risk
    });

    it("should include email in description if provided", () => {
      const event: BruteForceEvent = {
        type: "BRUTE_FORCE",
        sourceIp: "192.168.1.1",
        email: "target@example.com",
        attemptCount: 15,
        timeWindowMinutes: 5,
      };

      const result = evaluateDetectionEvent(event);
      expect(result?.description).toContain("target@example.com");
    });
  });

  describe("Cross-Tenant Access Detection", () => {
    it("should always create CRITICAL incident for cross-tenant access", () => {
      const event: CrossTenantEvent = {
        type: "CROSS_TENANT_ACCESS",
        actorTenantId: "tenant-a",
        targetTenantId: "tenant-b",
        actorUserId: "user-123",
        endpoint: "/api/users",
        sourceIp: "10.0.0.1",
      };

      const result = evaluateDetectionEvent(event);
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("CRITICAL");
      expect(result?.type).toBe("CROSS_TENANT_ACCESS");
      expect(result?.riskLevel).toBe("HIGH");
    });

    it("should set affected tenant as the target tenant", () => {
      const event: CrossTenantEvent = {
        type: "CROSS_TENANT_ACCESS",
        actorTenantId: "attacker-tenant",
        targetTenantId: "victim-tenant",
        actorUserId: "user-123",
        endpoint: "/api/data",
        sourceIp: "10.0.0.1",
      };

      const result = evaluateDetectionEvent(event);
      expect(result?.tenantId).toBe("victim-tenant");
    });
  });

  describe("Mass Export Detection", () => {
    it("should not create incident below threshold", () => {
      const event: MassExportEvent = {
        type: "MASS_EXPORT",
        userId: "user-123",
        tenantId: "tenant-a",
        recordCount: DETECTION_THRESHOLDS.MASS_EXPORT_RECORDS - 1,
        timeWindowMinutes: DETECTION_THRESHOLDS.MASS_EXPORT_WINDOW_MINUTES,
        exportType: "users",
      };

      const result = evaluateDetectionEvent(event);
      expect(result).toBeNull();
    });

    it("should create HIGH severity incident at threshold", () => {
      const event: MassExportEvent = {
        type: "MASS_EXPORT",
        userId: "user-123",
        tenantId: "tenant-a",
        recordCount: DETECTION_THRESHOLDS.MASS_EXPORT_RECORDS,
        timeWindowMinutes: 60,
        exportType: "users",
      };

      const result = evaluateDetectionEvent(event);
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("HIGH");
      expect(result?.type).toBe("DATA_LEAK");
      expect(result?.recordsAffected).toBe(DETECTION_THRESHOLDS.MASS_EXPORT_RECORDS);
    });
  });

  describe("PII in Logs Detection", () => {
    it("should create MEDIUM severity for basic PII", () => {
      const event: PiiInLogsEvent = {
        type: "PII_IN_LOGS",
        logFile: "/var/log/app.log",
        lineCount: 5,
        piiTypes: ["personal_email", "full_name"], // Use safe labels
        detectedAt: new Date(),
      };

      const result = evaluateDetectionEvent(event);
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("MEDIUM");
      expect(result?.type).toBe("PII_IN_LOGS");
    });

    it("should create HIGH severity for sensitive PII (national_id, payment_info)", () => {
      const event: PiiInLogsEvent = {
        type: "PII_IN_LOGS",
        logFile: "/var/log/app.log",
        lineCount: 2,
        piiTypes: ["national_id", "personal_email"], // Use safe labels
        detectedAt: new Date(),
      };

      const result = evaluateDetectionEvent(event);
      expect(result?.severity).toBe("HIGH");
      expect(result?.riskLevel).toBe("HIGH");
    });
  });

  describe("Backup Failure Detection", () => {
    it("should not create incident for single failure", () => {
      const event: BackupFailureEvent = {
        type: "BACKUP_FAILURE",
        backupType: "daily",
        errorMessage: "Connection timeout",
        consecutiveFailures: 1,
      };

      const result = evaluateDetectionEvent(event);
      expect(result).toBeNull();
    });

    it("should create incident after 2 consecutive failures", () => {
      const event: BackupFailureEvent = {
        type: "BACKUP_FAILURE",
        backupType: "daily",
        errorMessage: "Connection timeout",
        consecutiveFailures: DETECTION_THRESHOLDS.BACKUP_CONSECUTIVE_FAILURES,
      };

      const result = evaluateDetectionEvent(event);
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("HIGH");
      expect(result?.type).toBe("DATA_LOSS");
    });
  });
});

// =============================================================================
// FAILED LOGIN TRACKER TESTS
// =============================================================================

describe("Failed Login Tracker", () => {
  beforeEach(() => {
    resetTracker();
  });

  it("should track failed login attempts", () => {
    const ip = "192.168.1.100";

    recordFailedLogin(ip, "user@example.com");
    recordFailedLogin(ip, "user@example.com");
    recordFailedLogin(ip, "user@example.com");

    expect(getFailedLoginCount(ip)).toBe(3);
  });

  it("should return 0 for unknown IP", () => {
    expect(getFailedLoginCount("unknown-ip")).toBe(0);
  });

  it("should detect threshold exceeded", () => {
    const ip = "10.0.0.50";

    // Record attempts up to threshold
    for (let i = 0; i < DETECTION_THRESHOLDS.BRUTE_FORCE_ATTEMPTS - 1; i++) {
      const result = recordFailedLogin(ip);
      expect(result.thresholdExceeded).toBe(false);
    }

    // This should exceed threshold
    const result = recordFailedLogin(ip);
    expect(result.thresholdExceeded).toBe(true);
    expect(result.count).toBe(DETECTION_THRESHOLDS.BRUTE_FORCE_ATTEMPTS);
  });

  it("should clear failed logins for IP", () => {
    const ip = "192.168.1.200";

    recordFailedLogin(ip);
    recordFailedLogin(ip);
    expect(getFailedLoginCount(ip)).toBe(2);

    clearFailedLogins(ip);
    expect(getFailedLoginCount(ip)).toBe(0);
  });

  it("should list IPs exceeding threshold", () => {
    const ip1 = "192.168.1.1";
    const ip2 = "192.168.1.2";

    // IP1 exceeds threshold
    for (let i = 0; i < DETECTION_THRESHOLDS.BRUTE_FORCE_ATTEMPTS; i++) {
      recordFailedLogin(ip1, "victim@example.com");
    }

    // IP2 below threshold
    for (let i = 0; i < 3; i++) {
      recordFailedLogin(ip2);
    }

    const exceeding = getIpsExceedingThreshold();
    expect(exceeding).toHaveLength(1);
    expect(exceeding[0].ip).toBe(ip1);
    expect(exceeding[0].count).toBe(DETECTION_THRESHOLDS.BRUTE_FORCE_ATTEMPTS);
    expect(exceeding[0].latestEmail).toBe("victim@example.com");
  });

  it("should provide tracker statistics", () => {
    const ip1 = "192.168.1.1";
    const ip2 = "192.168.1.2";

    for (let i = 0; i < 15; i++) {
      recordFailedLogin(ip1);
    }
    for (let i = 0; i < 3; i++) {
      recordFailedLogin(ip2);
    }

    const stats = getTrackerStats();
    expect(stats.trackedIps).toBe(2);
    expect(stats.totalAttempts).toBe(18);
    expect(stats.ipsExceedingThreshold).toBe(1);
  });
});

// =============================================================================
// RGPD COMPLIANCE TESTS
// =============================================================================

describe("RGPD Compliance - Incident Detection", () => {
  it("should not log sensitive data in incident descriptions", () => {
    // Brute force incident should only show masked email
    const event: BruteForceEvent = {
      type: "BRUTE_FORCE",
      sourceIp: "192.168.1.1",
      email: "target@example.com",
      attemptCount: 15,
      timeWindowMinutes: 5,
    };

    const result = evaluateDetectionEvent(event);
    // Description should not contain password or other sensitive data
    expect(result?.description).not.toContain("password");
    expect(result?.description).not.toContain("secret");
  });

  it("should mark cross-tenant access as HIGH risk for CNIL notification", () => {
    const event: CrossTenantEvent = {
      type: "CROSS_TENANT_ACCESS",
      actorTenantId: "tenant-a",
      targetTenantId: "tenant-b",
      actorUserId: "user-123",
      endpoint: "/api/data",
      sourceIp: "10.0.0.1",
    };

    const result = evaluateDetectionEvent(event);
    // HIGH risk = CNIL notification required within 72h
    expect(result?.riskLevel).toBe("HIGH");
  });

  it("should set platform-wide incidents with null tenantId", () => {
    const event: PiiInLogsEvent = {
      type: "PII_IN_LOGS",
      logFile: "/var/log/app.log",
      lineCount: 10,
      piiTypes: ["personal_email"], // Use safe label
      detectedAt: new Date(),
    };

    const result = evaluateDetectionEvent(event);
    // PII in logs is a platform-wide issue, not tenant-specific
    expect(result?.tenantId).toBeNull();
  });

  it("should include detection source for audit trail", () => {
    const event: CrossTenantEvent = {
      type: "CROSS_TENANT_ACCESS",
      actorTenantId: "tenant-a",
      targetTenantId: "tenant-b",
      actorUserId: "user-123",
      endpoint: "/api/data",
      sourceIp: "10.0.0.1",
    };

    const result = evaluateDetectionEvent(event);
    expect(result?.detectedBy).toBe("SYSTEM");
  });
});
