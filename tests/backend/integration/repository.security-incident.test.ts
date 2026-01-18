/**
 * Integration Tests: PgSecurityIncidentRepo
 * Coverage: src/infrastructure/repositories/PgSecurityIncidentRepo.ts
 *
 * RGPD: Art. 33-34 - Incident Response & CNIL Notification
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgSecurityIncidentRepo } from '@/infrastructure/repositories/PgSecurityIncidentRepo';
import { pool } from '@/infrastructure/db/pg';
import { randomUUID } from 'crypto';
import type { CreateSecurityIncidentInput } from '@/domain/incident/SecurityIncident';

describe('PgSecurityIncidentRepo', () => {
  let repo: PgSecurityIncidentRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000301';

  beforeEach(async () => {
    repo = new PgSecurityIncidentRepo();

    // Clean security incidents first (not included in cleanup_test_data)
    await pool.query(`DELETE FROM security_incidents WHERE tenant_id = $1 OR tenant_id IS NULL`, [TENANT_ID]);

    // Clean test data
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID]]);

    // Clean up tenant by slug (in case of leftover from previous run with different ID)
    await pool.query(`DELETE FROM tenants WHERE slug = $1`, ['incident-test']);

    // Create test tenant (no ON CONFLICT since we just cleaned up)
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)`,
      [TENANT_ID, 'incident-test', 'Incident Test']
    );
  });

  describe('create', () => {
    it('should create security incident with all fields', async () => {
      const input: CreateSecurityIncidentInput = {
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Test breach',
        description: 'Test description',
        dataCategories: ['P2', 'P3'],
        usersAffected: 10,
        recordsAffected: 50,
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
        sourceIp: '192.168.1.1',
      };

      const incident = await repo.create(input);

      expect(incident.id).toBeDefined();
      expect(incident.tenantId).toBe(TENANT_ID);
      expect(incident.severity).toBe('HIGH');
      expect(incident.type).toBe('DATA_LEAK');
      expect(incident.cnilNotified).toBe(false);
      expect(incident.usersNotified).toBe(false);
    });

    it('should create platform-level incident (no tenantId)', async () => {
      const input: CreateSecurityIncidentInput = {
        tenantId: null,
        severity: 'HIGH',
        type: 'VULNERABILITY_EXPLOITED',
        title: 'Platform breach',
        description: 'Critical platform issue',
        dataCategories: ['P2'],
        usersAffected: 1000,
        recordsAffected: 5000,
        riskLevel: 'HIGH',
        detectedBy: 'AUDIT',
      };

      const incident = await repo.create(input);

      expect(incident.tenantId).toBeNull();
      expect(incident.severity).toBe('HIGH');
    });

    it('should default data categories to empty array', async () => {
      const input: CreateSecurityIncidentInput = {
        tenantId: TENANT_ID,
        severity: 'LOW',
        type: 'OTHER',
        title: 'Minor violation',
        description: 'Test',
        riskLevel: 'LOW',
        detectedBy: 'USER',
      };

      const incident = await repo.create(input);

      expect(incident.dataCategories).toEqual([]);
      expect(incident.usersAffected).toBe(0);
      expect(incident.recordsAffected).toBe(0);
    });
  });

  describe('findById', () => {
    it('should retrieve incident by ID', async () => {
      const created = await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'Test incident',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'SYSTEM',
      });

      const found = await repo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Test incident');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.findById(randomUUID());

      expect(found).toBeNull();
    });
  });

  describe('list', () => {
    it('should list all incidents with pagination', async () => {
      // Create 3 incidents
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Incident 1',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'Incident 2',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'SYSTEM',
      });

      const result = await repo.findAll({}, { limit: 10, offset: 0 });

      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(10);
    });

    it('should filter by tenantId', async () => {
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Tenant incident',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const result = await repo.findAll(
        { tenantId: TENANT_ID },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((incident) => {
        expect(incident.tenantId).toBe(TENANT_ID);
      });
    });

    it('should filter by severity', async () => {
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'VULNERABILITY_EXPLOITED',
        title: 'Critical incident',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'AUDIT',
      });

      const result = await repo.findAll(
        { severity: 'HIGH' },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((incident) => {
        expect(incident.severity).toBe('HIGH');
      });
    });

    it('should filter by unresolved incidents', async () => {
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Unresolved incident',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const result = await repo.findAll(
        { resolved: false },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((incident) => {
        expect(incident.resolvedAt).toBeNull();
      });
    });

    it('should return empty array if no incidents', async () => {
      const result = await repo.findAll(
        { tenantId: randomUUID() },
        { limit: 10, offset: 0 }
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('update', () => {
    it('should update incident fields', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Original title',
        description: 'Original description',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const updated = await repo.update(incident.id, {
        title: 'Updated title',
        remediationActions: 'Actions taken',
      });

      expect(updated.title).toBe('Updated title');
      expect(updated.remediationActions).toBe('Actions taken');
      expect(updated.description).toBe('Original description'); // unchanged
    });

    it('should mark incident as resolved', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'OTHER',
        title: 'Test',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'USER',
      });

      const updated = await repo.markResolved(incident.id, 'Issue fixed');

      expect(updated.resolvedAt).not.toBeNull();
      expect(updated.remediationActions).toBe('Issue fixed');
    });
  });

  describe('CNIL notification', () => {
    it('should mark incident as CNIL notified', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'High severity breach',
        description: 'Requires CNIL notification',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const updated = await repo.markCnilNotified(incident.id, 'CNIL-REF-2024-001');

      expect(updated.cnilNotified).toBe(true);
      expect(updated.cnilNotifiedAt).not.toBeNull();
      expect(updated.cnilReference).toBe('CNIL-REF-2024-001');
    });
  });

  describe('Users notification', () => {
    it('should mark incident as users notified', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'User data breach',
        description: 'Requires user notification',
        usersAffected: 50,
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const updated = await repo.markUsersNotified(incident.id);

      expect(updated.usersNotified).toBe(true);
      expect(updated.usersNotifiedAt).not.toBeNull();
    });
  });

  describe('Pending CNIL notification', () => {
    it('should list incidents requiring CNIL notification', async () => {
      // High severity, not notified
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Pending CNIL',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const pending = await repo.findPendingCnilNotification();

      expect(pending.length).toBeGreaterThanOrEqual(1);
      pending.forEach((incident) => {
        expect(['HIGH', 'HIGH']).toContain(incident.severity);
        expect(incident.cnilNotified).toBe(false);
      });
    });
  });

  describe('Advanced Filtering', () => {
    it('should filter by incident type', async () => {
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'CROSS_TENANT_ACCESS',
        title: 'Cross-tenant violation',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const result = await repo.findAll(
        { type: 'CROSS_TENANT_ACCESS' },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((incident) => {
        expect(incident.type).toBe('CROSS_TENANT_ACCESS');
      });
    });

    it('should filter by risk level', async () => {
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Critical risk',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'AUDIT',
      });

      const result = await repo.findAll(
        { riskLevel: 'HIGH' },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((incident) => {
        expect(incident.riskLevel).toBe('HIGH');
      });
    });

    it('should filter by CNIL notification status', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'CNIL notified incident',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      await repo.markCnilNotified(incident.id, 'CNIL-001');

      const result = await repo.findAll(
        { cnilNotified: true },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((inc) => {
        expect(inc.cnilNotified).toBe(true);
      });
    });

    it('should filter by users notification status', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Users notified incident',
        description: 'Test',
        usersAffected: 100,
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      await repo.markUsersNotified(incident.id);

      const result = await repo.findAll(
        { usersNotified: true },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((inc) => {
        expect(inc.usersNotified).toBe(true);
      });
    });

    it('should filter by date range (detectedFrom)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'OTHER',
        title: 'Recent incident',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'SYSTEM',
      });

      const result = await repo.findAll(
        { detectedAfter: yesterday },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((incident) => {
        expect(incident.detectedAt.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
      });
    });

    it('should filter by date range (detectedTo)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await repo.create({
        tenantId: TENANT_ID,
        severity: 'LOW',
        type: 'OTHER',
        title: 'Old incident',
        description: 'Test',
        riskLevel: 'LOW',
        detectedBy: 'USER',
      });

      const result = await repo.findAll(
        { detectedBefore: tomorrow },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((incident) => {
        expect(incident.detectedAt.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
      });
    });

    it('should filter platform incidents (tenantId null)', async () => {
      await repo.create({
        tenantId: null,
        severity: 'HIGH',
        type: 'VULNERABILITY_EXPLOITED',
        title: 'Platform-wide issue',
        description: 'Affects all tenants',
        riskLevel: 'HIGH',
        detectedBy: 'AUDIT',
      });

      const result = await repo.findAll(
        { tenantId: null },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((incident) => {
        expect(incident.tenantId).toBeNull();
      });
    });

    it('should combine multiple filters', async () => {
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Multi-filter test',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const result = await repo.findAll(
        {
          tenantId: TENANT_ID,
          severity: 'HIGH',
          type: 'DATA_LEAK',
          resolved: false,
        },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((incident) => {
        expect(incident.tenantId).toBe(TENANT_ID);
        expect(incident.severity).toBe('HIGH');
        expect(incident.type).toBe('DATA_LEAK');
        expect(incident.resolvedAt).toBeNull();
      });
    });
  });

  describe('All Incident Types Coverage', () => {
    const allIncidentTypes = [
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

    allIncidentTypes.forEach((type) => {
      it(`should create and retrieve ${type} incident`, async () => {
        const incident = await repo.create({
          tenantId: TENANT_ID,
          severity: 'MEDIUM',
          type: type as CreateSecurityIncidentInput['type'],
          title: `Test ${type}`,
          description: `Testing ${type} incident type`,
          riskLevel: 'MEDIUM',
          detectedBy: 'SYSTEM',
        });

        expect(incident.type).toBe(type);

        const found = await repo.findById(incident.id);
        expect(found?.type).toBe(type);
      });
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should handle page 1 with pageSize 1', async () => {
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'LOW',
        type: 'OTHER',
        title: 'Pagination test 1',
        description: 'Test',
        riskLevel: 'LOW',
        detectedBy: 'USER',
      });

      await repo.create({
        tenantId: TENANT_ID,
        severity: 'LOW',
        type: 'OTHER',
        title: 'Pagination test 2',
        description: 'Test',
        riskLevel: 'LOW',
        detectedBy: 'USER',
      });

      const result = await repo.findAll(
        { tenantId: TENANT_ID },
        { limit: 1, offset: 0 }
      );

      expect(result.data.length).toBe(1);
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(1);
    });

    it('should handle page 2', async () => {
      // Create 3 incidents
      for (let i = 0; i < 3; i++) {
        await repo.create({
          tenantId: TENANT_ID,
          severity: 'LOW',
          type: 'OTHER',
          title: `Pagination test ${i}`,
          description: 'Test',
          riskLevel: 'LOW',
          detectedBy: 'USER',
        });
      }

      const result = await repo.findAll(
        { tenantId: TENANT_ID },
        { limit: 2, offset: 2 }
      );

      expect(result.offset).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.total).toBeGreaterThanOrEqual(3);
    });

    it('should return empty items for page beyond total', async () => {
      const result = await repo.findAll(
        { tenantId: TENANT_ID },
        { limit: 10, offset: 9990 }
      );

      expect(result.data).toEqual([]);
      expect(result.offset).toBe(9990);
    });
  });

  describe('Platform vs Tenant Context', () => {
    it('should retrieve platform incident (tenantId null)', async () => {
      const platformIncident = await repo.create({
        tenantId: null,
        severity: 'HIGH',
        type: 'SERVICE_UNAVAILABLE',
        title: 'Platform outage',
        description: 'Critical platform issue',
        riskLevel: 'HIGH',
        detectedBy: 'MONITORING',
      });

      const found = await repo.findById(platformIncident.id);

      expect(found).not.toBeNull();
      expect(found?.tenantId).toBeNull();
      expect(found?.severity).toBe('HIGH');
    });

    it('should retrieve tenant incident', async () => {
      const tenantIncident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Tenant breach',
        description: 'Tenant-specific issue',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const found = await repo.findById(tenantIncident.id);

      expect(found).not.toBeNull();
      expect(found?.tenantId).toBe(TENANT_ID);
    });
  });

  describe('Risk Assessment Tracking', () => {
    it('should update risk level from UNKNOWN to CRITICAL', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Risk assessment test',
        description: 'Initial risk unknown',
        riskLevel: 'UNKNOWN',
        detectedBy: 'SYSTEM',
      });

      expect(incident.riskLevel).toBe('UNKNOWN');

      const updated = await repo.update(incident.id, {
        riskLevel: 'HIGH',
        remediationActions: 'Risk assessed as critical',
      });

      expect(updated.riskLevel).toBe('HIGH');
    });

    it('should track risk level changes (NONE to HIGH)', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'OTHER',
        title: 'Risk test',
        description: 'Test',
        riskLevel: 'NONE',
        detectedBy: 'USER',
      });

      const updated = await repo.update(incident.id, {
        riskLevel: 'HIGH',
      });

      expect(updated.riskLevel).toBe('HIGH');
    });
  });

  describe('Audit Trail', () => {
    it('should allow null createdBy (system-generated)', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'LOW',
        type: 'OTHER',
        title: 'System-generated',
        description: 'Test',
        riskLevel: 'LOW',
        detectedBy: 'SYSTEM',
      });

      expect(incident.createdBy).toBeNull();
    });
  });

  describe('CNIL 72h Compliance', () => {
    it('should list incidents detected within 72h not yet CNIL notified', async () => {
      const now = new Date();

      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Recent breach',
        description: 'Within 72h window',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const pending = await repo.findPendingCnilNotification();

      expect(pending.length).toBeGreaterThanOrEqual(1);
      pending.forEach((incident) => {
        expect(incident.cnilNotified).toBe(false);
        expect(['HIGH', 'HIGH']).toContain(incident.severity);

        const hoursSinceDetection =
          (now.getTime() - incident.detectedAt.getTime()) / (1000 * 60 * 60);
        expect(hoursSinceDetection).toBeLessThan(72);
      });
    });

    it('should include MEDIUM risk level in CNIL pending list', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'OTHER',
        title: 'Medium risk level',
        description: 'MEDIUM risk requires CNIL notification',
        riskLevel: 'MEDIUM',
        detectedBy: 'USER',
      });

      const pending = await repo.findPendingCnilNotification();

      const mediumRiskIncident = pending.find(inc => inc.id === incident.id);
      expect(mediumRiskIncident).toBeDefined();
      expect(mediumRiskIncident?.riskLevel).toBe('MEDIUM');
    });

    it('should exclude already CNIL notified incidents from pending list', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Already notified',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'PENTEST',
      });

      await repo.markCnilNotified(incident.id, 'CNIL-002');

      const pending = await repo.findPendingCnilNotification();
      const notifiedIncident = pending.find(inc => inc.id === incident.id);

      expect(notifiedIncident).toBeUndefined();
    });
  });

  describe('Data Categories Tracking', () => {
    it('should store multiple data categories', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Multi-category breach',
        description: 'Test',
        dataCategories: ['P0', 'P1', 'P2', 'P3'],
        usersAffected: 100,
        recordsAffected: 500,
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      expect(incident.dataCategories).toHaveLength(4);
      expect(incident.dataCategories).toContain('P0');
      expect(incident.dataCategories).toContain('P2');

      const found = await repo.findById(incident.id);
      expect(found?.dataCategories).toHaveLength(4);
    });

    it('should handle empty data categories array', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'LOW',
        type: 'SERVICE_UNAVAILABLE',
        title: 'No data affected',
        description: 'Test',
        dataCategories: [],
        riskLevel: 'LOW',
        detectedBy: 'SYSTEM',
      });

      expect(incident.dataCategories).toEqual([]);
    });
  });

  describe('Users and Records Affected', () => {
    it('should track large number of affected users', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Mass breach',
        description: 'Large-scale incident',
        usersAffected: 10000,
        recordsAffected: 50000,
        riskLevel: 'HIGH',
        detectedBy: 'MONITORING',
      });

      expect(incident.usersAffected).toBe(10000);
      expect(incident.recordsAffected).toBe(50000);
    });

    it('should default to 0 if not provided', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'LOW',
        type: 'OTHER',
        title: 'Minor issue',
        description: 'Test',
        riskLevel: 'LOW',
        detectedBy: 'USER',
      });

      expect(incident.usersAffected).toBe(0);
      expect(incident.recordsAffected).toBe(0);
    });
  });

  describe('Source IP Tracking', () => {
    it('should track source IP for security incidents', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'Unauthorized access attempt',
        description: 'Test',
        sourceIp: '192.168.1.100',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      expect(incident.sourceIp).toBe('192.168.1.100');

      const found = await repo.findById(incident.id);
      expect(found?.sourceIp).toBe('192.168.1.100');
    });

    it('should allow null sourceIp', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'OTHER',
        title: 'No IP tracked',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'USER',
      });

      expect(incident.sourceIp).toBeNull();
    });
  });

  describe('Resolution and Remediation', () => {
    it('should mark incident as resolved with remediation actions', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Resolved incident',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const updated = await repo.markResolved(
        incident.id,
        'Patched vulnerability, rotated credentials, notified users'
      );

      expect(updated.resolvedAt).not.toBeNull();
      expect(updated.remediationActions).toContain('Patched vulnerability');
    });

    it('should filter resolved incidents', async () => {
      const incident = await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'OTHER',
        title: 'Resolved test',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'USER',
      });

      await repo.markResolved(incident.id, 'Fixed');

      const result = await repo.findAll(
        { resolved: true },
        { limit: 10, offset: 0 }
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((inc) => {
        expect(inc.resolvedAt).not.toBeNull();
      });
    });
  });

  /**
   * LOT 11.0 — Test helper methods to reach 80% coverage
   */
  describe('findByTenant', () => {
    it('should find all incidents for a specific tenant', async () => {
      const OTHER_TENANT = '00000000-0000-0000-0000-000000000402';

      await pool.query(
        `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [OTHER_TENANT, 'other-tenant', 'Other Tenant']
      );

      // Create incidents for different tenants
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'DATA_LEAK',
        title: 'Tenant 1 incident',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'SYSTEM',
      });

      await repo.create({
        tenantId: OTHER_TENANT,
        severity: 'HIGH',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'Tenant 2 incident',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const result = await repo.findByTenant(TENANT_ID, { limit: 10, offset: 0 });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((inc) => {
        expect(inc.tenantId).toBe(TENANT_ID);
      });
    });

    it('should support pagination', async () => {
      // Create multiple incidents
      for (let i = 0; i < 3; i++) {
        await repo.create({
          tenantId: TENANT_ID,
          severity: 'LOW',
          type: 'OTHER',
          title: `Incident ${i}`,
          description: 'Test',
          riskLevel: 'LOW',
          detectedBy: 'SYSTEM',
        });
      }

      const result = await repo.findByTenant(TENANT_ID, { limit: 2, offset: 0 });

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });
  });

  describe('findUnresolved', () => {
    it('should find only unresolved incidents', async () => {
      // Create resolved incident
      const resolved = await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'DATA_LEAK',
        title: 'Resolved incident',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'SYSTEM',
      });

      await repo.markResolved(resolved.id, 'Fixed');

      // Create unresolved incident
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'Unresolved incident',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'USER',
      });

      const result = await repo.findUnresolved({}, { limit: 10, offset: 0 });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((inc) => {
        expect(inc.resolvedAt).toBeNull();
      });
    });

    it('should combine unresolved filter with other filters', async () => {
      // Create HIGH severity unresolved
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'High severity unresolved',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      // Create MEDIUM severity unresolved
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'OTHER',
        title: 'Medium severity unresolved',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'SYSTEM',
      });

      const result = await repo.findUnresolved(
        { severity: 'HIGH', tenantId: TENANT_ID },
        { limit: 10, offset: 0 }
      );

      result.data.forEach((inc) => {
        expect(inc.resolvedAt).toBeNull();
        expect(inc.severity).toBe('HIGH');
        expect(inc.tenantId).toBe(TENANT_ID);
      });
    });

    it('should respect pagination', async () => {
      const result = await repo.findUnresolved({}, { limit: 5, offset: 0 });

      expect(result.limit).toBe(5);
      expect(result.offset).toBe(0);
      expect(result.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('countBySeverity', () => {
    it('should count incidents by severity for a tenant', async () => {
      // Create incidents with different severities
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'LOW',
        type: 'OTHER',
        title: 'Low severity',
        description: 'Test',
        riskLevel: 'LOW',
        detectedBy: 'SYSTEM',
      });

      await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'DATA_LEAK',
        title: 'Medium severity',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'SYSTEM',
      });

      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'High severity',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const counts = await repo.countBySeverity(TENANT_ID);

      expect(counts).toHaveProperty('LOW');
      expect(counts).toHaveProperty('MEDIUM');
      expect(counts).toHaveProperty('HIGH');
      expect(counts).toHaveProperty('CRITICAL');
      expect(counts.LOW).toBeGreaterThanOrEqual(1);
      expect(counts.MEDIUM).toBeGreaterThanOrEqual(1);
      expect(counts.HIGH).toBeGreaterThanOrEqual(1);
    });

    it('should count platform incidents (null tenant)', async () => {
      await repo.create({
        tenantId: null,
        severity: 'CRITICAL',
        type: 'MALWARE',
        title: 'Platform incident',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const counts = await repo.countBySeverity(null);

      expect(counts.CRITICAL).toBeGreaterThanOrEqual(1);
    });

    it('should count all incidents when no tenant specified', async () => {
      const counts = await repo.countBySeverity();

      expect(counts).toHaveProperty('LOW');
      expect(counts).toHaveProperty('MEDIUM');
      expect(counts).toHaveProperty('HIGH');
      expect(counts).toHaveProperty('CRITICAL');
    });
  });

  describe('countByType', () => {
    it('should count incidents by type for a tenant', async () => {
      // Create incidents with different types
      await repo.create({
        tenantId: TENANT_ID,
        severity: 'MEDIUM',
        type: 'DATA_LEAK',
        title: 'Data leak',
        description: 'Test',
        riskLevel: 'MEDIUM',
        detectedBy: 'SYSTEM',
      });

      await repo.create({
        tenantId: TENANT_ID,
        severity: 'HIGH',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'Unauthorized access',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      await repo.create({
        tenantId: TENANT_ID,
        severity: 'LOW',
        type: 'PII_IN_LOGS',
        title: 'PII in logs',
        description: 'Test',
        riskLevel: 'LOW',
        detectedBy: 'SYSTEM',
      });

      const counts = await repo.countByType(TENANT_ID);

      expect(counts).toHaveProperty('DATA_LEAK');
      expect(counts).toHaveProperty('UNAUTHORIZED_ACCESS');
      expect(counts).toHaveProperty('PII_IN_LOGS');
      expect(counts.DATA_LEAK).toBeGreaterThanOrEqual(1);
      expect(counts.UNAUTHORIZED_ACCESS).toBeGreaterThanOrEqual(1);
      expect(counts.PII_IN_LOGS).toBeGreaterThanOrEqual(1);
    });

    it('should count platform incidents by type (null tenant)', async () => {
      await repo.create({
        tenantId: null,
        severity: 'CRITICAL',
        type: 'MALWARE',
        title: 'Platform malware',
        description: 'Test',
        riskLevel: 'HIGH',
        detectedBy: 'SYSTEM',
      });

      const counts = await repo.countByType(null);

      expect(counts.MALWARE).toBeGreaterThanOrEqual(1);
    });

    it('should count all incidents by type when no tenant specified', async () => {
      const counts = await repo.countByType();

      expect(counts).toHaveProperty('UNAUTHORIZED_ACCESS');
      expect(counts).toHaveProperty('CROSS_TENANT_ACCESS');
      expect(counts).toHaveProperty('DATA_LEAK');
      expect(counts).toHaveProperty('PII_IN_LOGS');
      expect(counts).toHaveProperty('DATA_LOSS');
      expect(counts).toHaveProperty('SERVICE_UNAVAILABLE');
      expect(counts).toHaveProperty('MALWARE');
      expect(counts).toHaveProperty('VULNERABILITY_EXPLOITED');
      expect(counts).toHaveProperty('OTHER');
    });

    it('should initialize all types to 0 even if no incidents exist', async () => {
      const OTHER_TENANT = '00000000-0000-0000-0000-000000000999';

      await pool.query(
        `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [OTHER_TENANT, 'empty-tenant', 'Empty Tenant']
      );

      const counts = await repo.countByType(OTHER_TENANT);

      // All types should be 0
      expect(counts.UNAUTHORIZED_ACCESS).toBe(0);
      expect(counts.CROSS_TENANT_ACCESS).toBe(0);
      expect(counts.DATA_LEAK).toBe(0);
      expect(counts.PII_IN_LOGS).toBe(0);
      expect(counts.DATA_LOSS).toBe(0);
      expect(counts.SERVICE_UNAVAILABLE).toBe(0);
      expect(counts.MALWARE).toBe(0);
      expect(counts.VULNERABILITY_EXPLOITED).toBe(0);
      expect(counts.OTHER).toBe(0);
    });
  });
});
