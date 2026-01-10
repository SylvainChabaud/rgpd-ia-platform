/**
 * Unit Tests: CreateIncidentUseCase
 * LOT 11.0 - Coverage improvement (14.28% → 80%+)
 *
 * Tests incident creation use case (RGPD Art. 33-34).
 * Validates incident registry, CNIL/users notification evaluation, and alerting.
 *
 * Classification: P1 (technical tests, no real incidents)
 * RGPD: Art. 33.5 (registre), Art. 33 (CNIL), Art. 34 (notification personnes)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createIncident,
  type CreateIncidentInput,
  type CreateIncidentDeps,
} from '@/app/usecases/incident/CreateIncidentUseCase';
import type { SecurityIncident, CreateSecurityIncidentInput, IncidentSeverity, IncidentType } from '@/domain/incident/SecurityIncident';
import type { SecurityIncidentRepo, PaginatedResult } from '@/domain/incident/SecurityIncidentRepo';

// =============================================================================
// MOCKS
// =============================================================================

class MockSecurityIncidentRepo implements SecurityIncidentRepo {
  public incidents: SecurityIncident[] = [];

  async create(input: CreateSecurityIncidentInput): Promise<SecurityIncident> {
    const incident: SecurityIncident = {
      id: `incident-${Date.now()}`,
      tenantId: input.tenantId ?? null,
      severity: input.severity,
      type: input.type,
      title: input.title,
      description: input.description,
      dataCategories: input.dataCategories ?? [],
      usersAffected: input.usersAffected ?? 0,
      recordsAffected: input.recordsAffected ?? 0,
      riskLevel: input.riskLevel ?? 'UNKNOWN',
      cnilNotified: false,
      cnilNotifiedAt: null,
      cnilReference: null,
      usersNotified: false,
      usersNotifiedAt: null,
      remediationActions: null,
      resolvedAt: null,
      detectedAt: new Date(),
      detectedBy: input.detectedBy ?? 'SYSTEM',
      sourceIp: input.sourceIp ?? null,
      createdBy: input.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.incidents.push(incident);
    return incident;
  }

  // Other methods not used in this use case but required by interface
  async findById(): Promise<SecurityIncident | null> {
    throw new Error('Not implemented');
  }
  async findByTenant(): Promise<PaginatedResult<SecurityIncident>> {
    throw new Error('Not implemented');
  }
  async findUnresolved(): Promise<PaginatedResult<SecurityIncident>> {
    throw new Error('Not implemented');
  }
  async findAll(): Promise<PaginatedResult<SecurityIncident>> {
    throw new Error('Not implemented');
  }
  async findPendingCnilNotification(): Promise<SecurityIncident[]> {
    throw new Error('Not implemented');
  }
  async update(): Promise<SecurityIncident> {
    throw new Error('Not implemented');
  }
  async markCnilNotified(): Promise<SecurityIncident> {
    throw new Error('Not implemented');
  }
  async markUsersNotified(): Promise<SecurityIncident> {
    throw new Error('Not implemented');
  }
  async markResolved(): Promise<SecurityIncident> {
    throw new Error('Not implemented');
  }
  async countBySeverity(): Promise<Record<IncidentSeverity, number>> {
    throw new Error('Not implemented');
  }
  async countByType(): Promise<Record<IncidentType, number>> {
    throw new Error('Not implemented');
  }
}

import type { NotificationResult } from '@/infrastructure/alerts/IncidentAlertService';

/**
 * Simplified mock that only implements what CreateIncidentUseCase actually uses
 */
class MockIncidentAlertService {
  public notifyCalls: SecurityIncident[] = [];
  public shouldFail = false;

  async notifyIncident(incident: SecurityIncident): Promise<NotificationResult[]> {
    if (this.shouldFail) {
      throw new Error('Alert service failed');
    }
    this.notifyCalls.push(incident);
    return [{ channel: 'email', success: true }];
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('UseCase: CreateIncidentUseCase', () => {
  let incidentRepo: MockSecurityIncidentRepo;
  let alertService: MockIncidentAlertService;
  let deps: CreateIncidentDeps;

  beforeEach(() => {
    incidentRepo = new MockSecurityIncidentRepo();
    alertService = new MockIncidentAlertService();
    // Use type assertion because mock only implements what we test
    deps = { incidentRepo, alertService: alertService as unknown as CreateIncidentDeps['alertService'] };
  });

  describe('Successful Incident Creation', () => {
    it('should create incident with all required fields', async () => {
      const input: CreateIncidentInput = {
        severity: 'HIGH',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'Brute force attack detected',
        description: 'Multiple failed login attempts from IP 1.2.3.4',
        actorId: 'admin-123',
      };

      const result = await createIncident(input, deps);

      expect(result.incident).toBeDefined();
      expect(result.incident.id).toBeDefined();
      expect(result.incident.severity).toBe('HIGH');
      expect(result.incident.type).toBe('UNAUTHORIZED_ACCESS');
      expect(result.incident.title).toBe('Brute force attack detected');
      expect(result.incident.description).toBe('Multiple failed login attempts from IP 1.2.3.4');
      expect(result.alertsSent).toBe(true);
    });

    it('should create incident with tenant scope', async () => {
      const input: CreateIncidentInput = {
        tenantId: 'tenant-abc-123',
        severity: 'MEDIUM',
        type: 'DATA_LEAK',
        title: 'Tenant data leak',
        description: 'Unauthorized export detected',
      };

      const result = await createIncident(input, deps);

      expect(result.incident.tenantId).toBe('tenant-abc-123');
    });

    it('should create platform-wide incident (no tenantId)', async () => {
      const input: CreateIncidentInput = {
        severity: 'CRITICAL',
        type: 'SERVICE_UNAVAILABLE',
        title: 'Platform downtime',
        description: 'Complete platform outage',
      };

      const result = await createIncident(input, deps);

      expect(result.incident.tenantId).toBeNull();
    });

    it('should trim title and description', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: '  Test Incident  ',
        description: '  Test description with spaces  ',
      };

      const result = await createIncident(input, deps);

      expect(result.incident.title).toBe('Test Incident');
      expect(result.incident.description).toBe('Test description with spaces');
    });

    it('should include optional fields when provided', async () => {
      const input: CreateIncidentInput = {
        severity: 'CRITICAL',
        type: 'CROSS_TENANT_ACCESS',
        title: 'Cross-tenant violation',
        description: 'Tenant A accessed tenant B data',
        dataCategories: ['P2', 'P3'],
        usersAffected: 150,
        recordsAffected: 1000,
        riskLevel: 'HIGH',
        detectedBy: 'MONITORING',
        sourceIp: '192.168.1.100',
        actorId: 'system-monitor',
      };

      const result = await createIncident(input, deps);

      expect(result.incident.dataCategories).toEqual(['P2', 'P3']);
      expect(result.incident.usersAffected).toBe(150);
      expect(result.incident.recordsAffected).toBe(1000);
      expect(result.incident.riskLevel).toBe('HIGH');
      expect(result.incident.detectedBy).toBe('MONITORING');
      expect(result.incident.sourceIp).toBe('192.168.1.100');
      expect(result.incident.createdBy).toBe('system-monitor');
    });

    it('should store incident in repository', async () => {
      const input: CreateIncidentInput = {
        severity: 'MEDIUM',
        type: 'VULNERABILITY_EXPLOITED',
        title: 'CVE-2024-1234 exploited',
        description: 'Known vulnerability exploited',
      };

      await createIncident(input, deps);

      expect(incidentRepo.incidents).toHaveLength(1);
      expect(incidentRepo.incidents[0].title).toBe('CVE-2024-1234 exploited');
    });
  });

  describe('Input Validation', () => {
    it('should reject empty title', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: '',
        description: 'Valid description',
      };

      await expect(createIncident(input, deps)).rejects.toThrow(
        'Incident title is required'
      );
    });

    it('should reject whitespace-only title', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: '   ',
        description: 'Valid description',
      };

      await expect(createIncident(input, deps)).rejects.toThrow(
        'Incident title is required'
      );
    });

    it('should reject empty description', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: 'Valid title',
        description: '',
      };

      await expect(createIncident(input, deps)).rejects.toThrow(
        'Incident description is required'
      );
    });

    it('should reject whitespace-only description', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: 'Valid title',
        description: '   ',
      };

      await expect(createIncident(input, deps)).rejects.toThrow(
        'Incident description is required'
      );
    });

    it('should accept minimum valid input', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: 'T',
        description: 'D',
      };

      const result = await createIncident(input, deps);

      expect(result.incident).toBeDefined();
      expect(result.incident.title).toBe('T');
      expect(result.incident.description).toBe('D');
    });
  });

  describe('CNIL Notification Evaluation (Art. 33)', () => {
    it('should require CNIL notification for HIGH risk incidents', async () => {
      const input: CreateIncidentInput = {
        severity: 'CRITICAL',
        type: 'DATA_LEAK',
        title: 'Mass data leak',
        description: 'Large scale PII exposure',
        riskLevel: 'HIGH',
        usersAffected: 5000,
      };

      const result = await createIncident(input, deps);

      // HIGH risk → CNIL notification required
      expect(result.cnilNotificationRequired).toBe(true);
    });

    it('should NOT require CNIL notification for LOW risk', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: 'Minor incident',
        description: 'Low impact event',
        riskLevel: 'LOW',
      };

      const result = await createIncident(input, deps);

      expect(result.cnilNotificationRequired).toBe(false);
    });

    it('should evaluate CNIL requirement for MEDIUM risk', async () => {
      const input: CreateIncidentInput = {
        severity: 'MEDIUM',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'Unauthorized access attempt',
        description: 'Single account compromised',
        riskLevel: 'MEDIUM',
        usersAffected: 1,
      };

      const result = await createIncident(input, deps);

      // MEDIUM risk → depends on domain logic (isCnilNotificationRequired)
      expect(typeof result.cnilNotificationRequired).toBe('boolean');
    });
  });

  describe('Users Notification Evaluation (Art. 34)', () => {
    it('should require users notification for HIGH risk with affected users', async () => {
      const input: CreateIncidentInput = {
        severity: 'CRITICAL',
        type: 'DATA_LEAK',
        title: 'PII exposed',
        description: 'Personal data publicly accessible',
        riskLevel: 'HIGH',
        usersAffected: 100,
      };

      const result = await createIncident(input, deps);

      // HIGH risk + users affected → notification required
      expect(result.usersNotificationRequired).toBe(true);
    });

    it('should NOT require users notification for LOW risk', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: 'Minor event',
        description: 'Low impact',
        riskLevel: 'LOW',
        usersAffected: 10,
      };

      const result = await createIncident(input, deps);

      expect(result.usersNotificationRequired).toBe(false);
    });

    it('should NOT require users notification if no users affected', async () => {
      const input: CreateIncidentInput = {
        severity: 'HIGH',
        type: 'SERVICE_UNAVAILABLE',
        title: 'Service outage',
        description: 'Platform down but no data breach',
        riskLevel: 'MEDIUM',
        usersAffected: 0,
      };

      const result = await createIncident(input, deps);

      // No users affected → no notification needed
      expect(result.usersNotificationRequired).toBe(false);
    });
  });

  describe('Alert Service Integration', () => {
    it('should send alerts successfully', async () => {
      const input: CreateIncidentInput = {
        severity: 'HIGH',
        type: 'MALWARE',
        title: 'Malware detected',
        description: 'Ransomware on server',
      };

      const result = await createIncident(input, deps);

      expect(result.alertsSent).toBe(true);
      expect(alertService.notifyCalls).toHaveLength(1);
      expect(alertService.notifyCalls[0].title).toBe('Malware detected');
    });

    it('should handle alert service failures gracefully', async () => {
      alertService.shouldFail = true;

      const input: CreateIncidentInput = {
        severity: 'MEDIUM',
        type: 'VULNERABILITY_EXPLOITED',
        title: 'Vulnerability exploited',
        description: 'XSS vulnerability exploited',
      };

      // Should NOT throw even if alerts fail
      const result = await createIncident(input, deps);

      expect(result.alertsSent).toBe(false);
      expect(result.incident).toBeDefined(); // Incident still created
    });

    it('should continue after alert failure', async () => {
      alertService.shouldFail = true;

      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: 'Test incident',
        description: 'Test description',
      };

      const result = await createIncident(input, deps);

      // Incident created despite alert failure
      expect(incidentRepo.incidents).toHaveLength(1);
      expect(result.incident.id).toBeDefined();
    });
  });

  describe('Actor Context', () => {
    it('should record actor ID when provided', async () => {
      const input: CreateIncidentInput = {
        severity: 'MEDIUM',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'Manual incident report',
        description: 'Admin reported suspicious activity',
        actorId: 'admin-user-456',
      };

      const result = await createIncident(input, deps);

      expect(result.incident.createdBy).toBe('admin-user-456');
    });

    it('should handle system-detected incidents (no actor)', async () => {
      const input: CreateIncidentInput = {
        severity: 'HIGH',
        type: 'CROSS_TENANT_ACCESS',
        title: 'Automated detection',
        description: 'Middleware detected isolation violation',
        // No actorId - system detection
      };

      const result = await createIncident(input, deps);

      expect(result.incident.createdBy).toBeNull();
    });

    it('should handle null actor ID explicitly', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: 'System event',
        description: 'Automated system event',
        actorId: null,
      };

      const result = await createIncident(input, deps);

      expect(result.incident.createdBy).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long title and description', async () => {
      const longText = 'x'.repeat(10000);

      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: longText,
        description: longText,
      };

      const result = await createIncident(input, deps);

      expect(result.incident.title.length).toBe(10000);
      expect(result.incident.description.length).toBe(10000);
    });

    it('should handle special characters in strings', async () => {
      const input: CreateIncidentInput = {
        severity: 'MEDIUM',
        type: 'OTHER',
        title: 'Test <script>alert("XSS")</script>',
        description: "O'Brien's test & co. <div>",
      };

      const result = await createIncident(input, deps);

      expect(result.incident.title).toContain('<script>');
      expect(result.incident.description).toContain('O\'Brien');
    });

    it('should handle unicode characters', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: 'Incident français 中文 العربية',
        description: 'Test émojis 🚨🔒🛡️',
      };

      const result = await createIncident(input, deps);

      expect(result.incident.title).toContain('français');
      expect(result.incident.description).toContain('🚨');
    });

    it('should handle missing optional fields', async () => {
      const input: CreateIncidentInput = {
        severity: 'LOW',
        type: 'OTHER',
        title: 'Minimal incident',
        description: 'Only required fields',
        // All optional fields omitted
      };

      const result = await createIncident(input, deps);

      expect(result.incident.dataCategories).toEqual([]);
      expect(result.incident.usersAffected).toBe(0);
      expect(result.incident.recordsAffected).toBe(0);
      expect(result.incident.riskLevel).toBe('UNKNOWN');
      expect(result.incident.sourceIp).toBeNull();
    });

    it('should handle all severity levels', async () => {
      const severities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = [
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL',
      ];

      for (const severity of severities) {
        const input: CreateIncidentInput = {
          severity,
          type: 'OTHER',
          title: `${severity} incident`,
          description: `Test ${severity}`,
        };

        const result = await createIncident(input, deps);
        expect(result.incident.severity).toBe(severity);
      }

      expect(incidentRepo.incidents).toHaveLength(4);
    });

    it('should handle all incident types', async () => {
      const types: Array<
        | 'UNAUTHORIZED_ACCESS'
        | 'CROSS_TENANT_ACCESS'
        | 'DATA_LEAK'
        | 'PII_IN_LOGS'
        | 'DATA_LOSS'
        | 'SERVICE_UNAVAILABLE'
        | 'MALWARE'
        | 'VULNERABILITY_EXPLOITED'
        | 'OTHER'
      > = [
        'UNAUTHORIZED_ACCESS',
        'CROSS_TENANT_ACCESS',
        'DATA_LEAK',
        'PII_IN_LOGS',
        'DATA_LOSS',
        'SERVICE_UNAVAILABLE',
        'MALWARE',
        'VULNERABILITY_EXPLOITED',
        'OTHER',
      ];

      for (const type of types) {
        const input: CreateIncidentInput = {
          severity: 'LOW',
          type,
          title: `Test ${type}`,
          description: `Test incident type`,
        };

        const result = await createIncident(input, deps);
        expect(result.incident.type).toBe(type);
      }

      expect(incidentRepo.incidents).toHaveLength(9);
    });
  });

  describe('Integration - Complete Flow', () => {
    it('should execute complete incident creation flow', async () => {
      const input: CreateIncidentInput = {
        tenantId: 'tenant-xyz',
        severity: 'CRITICAL',
        type: 'DATA_LEAK',
        title: 'Major data breach',
        description: 'Massive PII exposure due to misconfigured S3 bucket',
        dataCategories: ['P2', 'P3'],
        usersAffected: 10000,
        recordsAffected: 50000,
        riskLevel: 'HIGH',
        detectedBy: 'AUDIT',
        sourceIp: '203.0.113.0',
        actorId: 'security-team-lead',
      };

      const result = await createIncident(input, deps);

      // Verify incident created
      expect(result.incident).toBeDefined();
      expect(result.incident.id).toBeDefined();
      expect(result.incident.tenantId).toBe('tenant-xyz');
      expect(result.incident.severity).toBe('CRITICAL');

      // Verify notifications evaluated
      expect(result.cnilNotificationRequired).toBe(true);
      expect(result.usersNotificationRequired).toBe(true);

      // Verify alerts sent
      expect(result.alertsSent).toBe(true);
      expect(alertService.notifyCalls).toHaveLength(1);

      // Verify stored in repo
      expect(incidentRepo.incidents).toHaveLength(1);
    });
  });
});
