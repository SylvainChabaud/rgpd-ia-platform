/**
 * Security Incident Domain Tests
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 *
 * Tests for SecurityIncident entity and business rules:
 * - CNIL notification requirements (Art. 33)
 * - Users notification requirements (Art. 34)
 * - Deadline calculations
 *
 * RGPD Compliance:
 * - Art. 33: Notification CNIL 72h
 * - Art. 34: Notification personnes si risque élevé
 */

import { describe, it, expect } from "@jest/globals";
import {
  createSecurityIncident,
  isCnilNotificationRequired,
  isUsersNotificationRequired,
  getCnilDeadline,
  isCnilDeadlineApproaching,
  isCnilDeadlineOverdue,
  SEVERITY_ORDER,
  RISK_LEVEL_ORDER,
  type SecurityIncident,
  type CreateSecurityIncidentInput,
} from "@/domain/incident";
import { ACTOR_SCOPE } from "@/shared/actorScope";

// =============================================================================
// FACTORY FUNCTION TESTS
// =============================================================================

describe("SecurityIncident - Factory", () => {
  it("should create incident with required fields", () => {
    const input: CreateSecurityIncidentInput = {
      severity: "HIGH",
      type: "UNAUTHORIZED_ACCESS",
      title: "Test Incident",
      description: "Test description",
    };

    const incident = createSecurityIncident(input);

    expect(incident.severity).toBe("HIGH");
    expect(incident.type).toBe("UNAUTHORIZED_ACCESS");
    expect(incident.title).toBe("Test Incident");
    expect(incident.description).toBe("Test description");
  });

  it("should set default values", () => {
    const incident = createSecurityIncident({
      severity: "LOW",
      type: "OTHER",
      title: "Test",
      description: "Test",
    });

    expect(incident.tenantId).toBeNull();
    expect(incident.dataCategories).toEqual([]);
    expect(incident.usersAffected).toBe(0);
    expect(incident.recordsAffected).toBe(0);
    expect(incident.riskLevel).toBe("UNKNOWN");
    expect(incident.cnilNotified).toBe(false);
    expect(incident.cnilNotifiedAt).toBeNull();
    expect(incident.usersNotified).toBe(false);
    expect(incident.usersNotifiedAt).toBeNull();
    expect(incident.resolvedAt).toBeNull();
    expect(incident.detectedBy).toBe(ACTOR_SCOPE.SYSTEM);
  });

  it("should accept optional fields", () => {
    const incident = createSecurityIncident({
      severity: "CRITICAL",
      type: "CROSS_TENANT_ACCESS",
      title: "Cross-tenant violation",
      description: "Details",
      tenantId: "tenant-123",
      dataCategories: ["P1", "P2"],
      usersAffected: 100,
      recordsAffected: 5000,
      riskLevel: "HIGH",
      detectedBy: "MONITORING",
      sourceIp: "192.168.1.1",
      createdBy: "user-456",
    });

    expect(incident.tenantId).toBe("tenant-123");
    expect(incident.dataCategories).toEqual(["P1", "P2"]);
    expect(incident.usersAffected).toBe(100);
    expect(incident.recordsAffected).toBe(5000);
    expect(incident.riskLevel).toBe("HIGH");
    expect(incident.detectedBy).toBe("MONITORING");
    expect(incident.sourceIp).toBe("192.168.1.1");
    expect(incident.createdBy).toBe("user-456");
  });
});

// =============================================================================
// CNIL NOTIFICATION TESTS (Art. 33)
// =============================================================================

describe("SecurityIncident - CNIL Notification (Art. 33)", () => {
  const baseIncident: SecurityIncident = {
    id: "incident-1",
    tenantId: null,
    severity: "MEDIUM",
    type: "OTHER",
    title: "Test",
    description: "Test",
    dataCategories: [],
    usersAffected: 0,
    recordsAffected: 0,
    riskLevel: "LOW",
    cnilNotified: false,
    cnilNotifiedAt: null,
    cnilReference: null,
    usersNotified: false,
    usersNotifiedAt: null,
    remediationActions: null,
    resolvedAt: null,
    detectedAt: new Date(),
    detectedBy: ACTOR_SCOPE.SYSTEM,
    sourceIp: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should require CNIL notification for HIGH risk", () => {
    const incident = { ...baseIncident, riskLevel: "HIGH" as const };
    expect(isCnilNotificationRequired(incident)).toBe(true);
  });

  it("should require CNIL notification for MEDIUM risk", () => {
    const incident = { ...baseIncident, riskLevel: "MEDIUM" as const };
    expect(isCnilNotificationRequired(incident)).toBe(true);
  });

  it("should not require CNIL notification for LOW risk", () => {
    const incident = { ...baseIncident, riskLevel: "LOW" as const };
    expect(isCnilNotificationRequired(incident)).toBe(false);
  });

  it("should require CNIL notification for CRITICAL severity", () => {
    const incident = { ...baseIncident, severity: "CRITICAL" as const };
    expect(isCnilNotificationRequired(incident)).toBe(true);
  });

  it("should require CNIL notification for CROSS_TENANT_ACCESS", () => {
    const incident = { ...baseIncident, type: "CROSS_TENANT_ACCESS" as const };
    expect(isCnilNotificationRequired(incident)).toBe(true);
  });

  it("should not require CNIL notification for NONE risk", () => {
    const incident = { ...baseIncident, riskLevel: "NONE" as const };
    expect(isCnilNotificationRequired(incident)).toBe(false);
  });
});

// =============================================================================
// USERS NOTIFICATION TESTS (Art. 34)
// =============================================================================

describe("SecurityIncident - Users Notification (Art. 34)", () => {
  const baseIncident: SecurityIncident = {
    id: "incident-1",
    tenantId: null,
    severity: "HIGH",
    type: "DATA_LEAK",
    title: "Test",
    description: "Test",
    dataCategories: ["P2"],
    usersAffected: 1000,
    recordsAffected: 5000,
    riskLevel: "MEDIUM",
    cnilNotified: false,
    cnilNotifiedAt: null,
    cnilReference: null,
    usersNotified: false,
    usersNotifiedAt: null,
    remediationActions: null,
    resolvedAt: null,
    detectedAt: new Date(),
    detectedBy: ACTOR_SCOPE.SYSTEM,
    sourceIp: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should require users notification for HIGH risk only", () => {
    const highRisk = { ...baseIncident, riskLevel: "HIGH" as const };
    const mediumRisk = { ...baseIncident, riskLevel: "MEDIUM" as const };
    const lowRisk = { ...baseIncident, riskLevel: "LOW" as const };

    expect(isUsersNotificationRequired(highRisk)).toBe(true);
    expect(isUsersNotificationRequired(mediumRisk)).toBe(false);
    expect(isUsersNotificationRequired(lowRisk)).toBe(false);
  });
});

// =============================================================================
// DEADLINE CALCULATION TESTS
// =============================================================================

describe("SecurityIncident - CNIL Deadline Calculations", () => {
  it("should calculate 72h deadline from detection", () => {
    const detectedAt = new Date("2026-01-01T10:00:00Z");
    const incident: SecurityIncident = {
      id: "incident-1",
      tenantId: null,
      severity: "HIGH",
      type: "DATA_LEAK",
      title: "Test",
      description: "Test",
      dataCategories: [],
      usersAffected: 0,
      recordsAffected: 0,
      riskLevel: "HIGH",
      cnilNotified: false,
      cnilNotifiedAt: null,
      cnilReference: null,
      usersNotified: false,
      usersNotifiedAt: null,
      remediationActions: null,
      resolvedAt: null,
      detectedAt,
      detectedBy: ACTOR_SCOPE.SYSTEM,
      sourceIp: null,
      createdBy: null,
      createdAt: detectedAt,
      updatedAt: detectedAt,
    };

    const deadline = getCnilDeadline(incident);
    expect(deadline.toISOString()).toBe("2026-01-04T10:00:00.000Z");
  });

  it("should detect deadline approaching (< 24h)", () => {
    const now = new Date();
    const detectedAt = new Date(now.getTime() - 60 * 60 * 60 * 1000); // 60 hours ago

    const incident: SecurityIncident = {
      id: "incident-1",
      tenantId: null,
      severity: "HIGH",
      type: "DATA_LEAK",
      title: "Test",
      description: "Test",
      dataCategories: [],
      usersAffected: 0,
      recordsAffected: 0,
      riskLevel: "HIGH",
      cnilNotified: false,
      cnilNotifiedAt: null,
      cnilReference: null,
      usersNotified: false,
      usersNotifiedAt: null,
      remediationActions: null,
      resolvedAt: null,
      detectedAt,
      detectedBy: ACTOR_SCOPE.SYSTEM,
      sourceIp: null,
      createdBy: null,
      createdAt: detectedAt,
      updatedAt: detectedAt,
    };

    expect(isCnilDeadlineApproaching(incident)).toBe(true);
    expect(isCnilDeadlineOverdue(incident)).toBe(false);
  });

  it("should detect deadline overdue (> 72h)", () => {
    const now = new Date();
    const detectedAt = new Date(now.getTime() - 80 * 60 * 60 * 1000); // 80 hours ago

    const incident: SecurityIncident = {
      id: "incident-1",
      tenantId: null,
      severity: "HIGH",
      type: "DATA_LEAK",
      title: "Test",
      description: "Test",
      dataCategories: [],
      usersAffected: 0,
      recordsAffected: 0,
      riskLevel: "HIGH",
      cnilNotified: false,
      cnilNotifiedAt: null,
      cnilReference: null,
      usersNotified: false,
      usersNotifiedAt: null,
      remediationActions: null,
      resolvedAt: null,
      detectedAt,
      detectedBy: ACTOR_SCOPE.SYSTEM,
      sourceIp: null,
      createdBy: null,
      createdAt: detectedAt,
      updatedAt: detectedAt,
    };

    expect(isCnilDeadlineOverdue(incident)).toBe(true);
  });

  it("should not flag approaching/overdue if already notified", () => {
    const now = new Date();
    const detectedAt = new Date(now.getTime() - 80 * 60 * 60 * 1000);

    const incident: SecurityIncident = {
      id: "incident-1",
      tenantId: null,
      severity: "HIGH",
      type: "DATA_LEAK",
      title: "Test",
      description: "Test",
      dataCategories: [],
      usersAffected: 0,
      recordsAffected: 0,
      riskLevel: "HIGH",
      cnilNotified: true, // Already notified
      cnilNotifiedAt: new Date(),
      cnilReference: "CNIL-123",
      usersNotified: false,
      usersNotifiedAt: null,
      remediationActions: null,
      resolvedAt: null,
      detectedAt,
      detectedBy: ACTOR_SCOPE.SYSTEM,
      sourceIp: null,
      createdBy: null,
      createdAt: detectedAt,
      updatedAt: detectedAt,
    };

    expect(isCnilDeadlineApproaching(incident)).toBe(false);
    expect(isCnilDeadlineOverdue(incident)).toBe(false);
  });

  it("should not flag if notification not required", () => {
    const now = new Date();
    const detectedAt = new Date(now.getTime() - 80 * 60 * 60 * 1000);

    const incident: SecurityIncident = {
      id: "incident-1",
      tenantId: null,
      severity: "LOW",
      type: "OTHER",
      title: "Test",
      description: "Test",
      dataCategories: [],
      usersAffected: 0,
      recordsAffected: 0,
      riskLevel: "LOW", // No notification required
      cnilNotified: false,
      cnilNotifiedAt: null,
      cnilReference: null,
      usersNotified: false,
      usersNotifiedAt: null,
      remediationActions: null,
      resolvedAt: null,
      detectedAt,
      detectedBy: ACTOR_SCOPE.SYSTEM,
      sourceIp: null,
      createdBy: null,
      createdAt: detectedAt,
      updatedAt: detectedAt,
    };

    expect(isCnilDeadlineApproaching(incident)).toBe(false);
    expect(isCnilDeadlineOverdue(incident)).toBe(false);
  });
});

// =============================================================================
// ORDERING TESTS
// =============================================================================

describe("SecurityIncident - Ordering", () => {
  it("should have correct severity order", () => {
    expect(SEVERITY_ORDER.CRITICAL).toBeGreaterThan(SEVERITY_ORDER.HIGH);
    expect(SEVERITY_ORDER.HIGH).toBeGreaterThan(SEVERITY_ORDER.MEDIUM);
    expect(SEVERITY_ORDER.MEDIUM).toBeGreaterThan(SEVERITY_ORDER.LOW);
  });

  it("should have correct risk level order", () => {
    expect(RISK_LEVEL_ORDER.HIGH).toBeGreaterThan(RISK_LEVEL_ORDER.MEDIUM);
    expect(RISK_LEVEL_ORDER.MEDIUM).toBeGreaterThan(RISK_LEVEL_ORDER.LOW);
    expect(RISK_LEVEL_ORDER.LOW).toBeGreaterThan(RISK_LEVEL_ORDER.NONE);
    expect(RISK_LEVEL_ORDER.NONE).toBeGreaterThan(RISK_LEVEL_ORDER.UNKNOWN);
  });
});
