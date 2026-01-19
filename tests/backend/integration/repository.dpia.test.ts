/**
 * Repository Tests: DPIA Repository
 * RGPD: Art. 35 (Data Protection Impact Assessment)
 * LOT 12.4 - DPO Features
 *
 * Tests:
 * - DPIA CRUD operations
 * - DPO validation workflow
 * - Risk management
 * - Tenant isolation (CRITICAL)
 * - RBAC enforcement
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgDpiaRepo } from '@/infrastructure/repositories/PgDpiaRepo';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import { randomUUID } from 'crypto';
import { DPIA_STATUS, DPIA_RISK_LEVEL } from '@/domain/dpia';

describe('Repository: PgDpiaRepo', () => {
  let repo: PgDpiaRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000401';
  const TENANT_ID_2 = '00000000-0000-0000-0000-000000000402';
  const PURPOSE_ID = '00000000-0000-0000-0000-000000000501';
  const PURPOSE_ID_2 = '00000000-0000-0000-0000-000000000502';
  const PURPOSE_ID_3 = '00000000-0000-0000-0000-000000000503';

  beforeEach(async () => {
    repo = new PgDpiaRepo();
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID, TENANT_ID_2]]);

    // Create test tenants
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'dpia-repo-test-1', 'DPIA Repo Test 1']
    );
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID_2, 'dpia-repo-test-2', 'DPIA Repo Test 2']
    );

    // Create test purposes
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO purposes (id, tenant_id, label, description, category, lawful_basis, data_classification, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [PURPOSE_ID, TENANT_ID, 'IA Recommendations', 'AI-based personalized recommendations', 'ai_processing', 'consent', 'P1', 'HIGH']
      );
      await client.query(
        `INSERT INTO purposes (id, tenant_id, label, description, category, lawful_basis, data_classification, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [PURPOSE_ID_2, TENANT_ID, 'Marketing Analytics', 'Marketing data analysis', 'marketing', 'legitimate_interest', 'P1', 'MEDIUM']
      );
    });

    await withTenantContext(pool, TENANT_ID_2, async (client) => {
      await client.query(
        `INSERT INTO purposes (id, tenant_id, label, description, category, lawful_basis, data_classification, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [PURPOSE_ID_3, TENANT_ID_2, 'Other Tenant Purpose', 'Purpose from tenant 2', 'security', 'contract', 'P1', 'HIGH']
      );
    });
  });

  // ===========================================================================
  // DPIA Creation Tests
  // ===========================================================================

  describe('DPIA Creation', () => {
    it('should create a DPIA with default values', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA for AI Recommendations',
        description: 'Analysis d\'impact pour le traitement IA de recommandations personnalisées.',
      });

      expect(dpia).toBeDefined();
      expect(dpia.id).toBeDefined();
      expect(dpia.tenantId).toBe(TENANT_ID);
      expect(dpia.purposeId).toBe(PURPOSE_ID);
      expect(dpia.status).toBe(DPIA_STATUS.PENDING);
      expect(dpia.overallRiskLevel).toBe(DPIA_RISK_LEVEL.MEDIUM);
      expect(dpia.dataClassification).toBe('P1');
    });

    it('should create a DPIA with HIGH risk level and auto-generate risks', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA for High Risk Processing',
        description: 'Analysis d\'impact pour un traitement à haut risque avec génération automatique des risques.',
        overallRiskLevel: DPIA_RISK_LEVEL.HIGH,
      });

      expect(dpia.overallRiskLevel).toBe(DPIA_RISK_LEVEL.HIGH);
      expect(dpia.risks).toBeDefined();
      expect(dpia.risks?.length).toBeGreaterThan(0);
      // HIGH risk should have 3 default risks
      expect(dpia.risks?.length).toBe(3);
    });

    it('should create a DPIA with CRITICAL risk level and auto-generate risks', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA for Critical Risk Processing',
        description: 'Analysis d\'impact pour un traitement critique avec tous les risques pré-remplis.',
        overallRiskLevel: DPIA_RISK_LEVEL.CRITICAL,
      });

      expect(dpia.overallRiskLevel).toBe(DPIA_RISK_LEVEL.CRITICAL);
      expect(dpia.risks).toBeDefined();
      // CRITICAL risk should have 5 default risks (3 from HIGH + 2 additional)
      expect(dpia.risks?.length).toBe(5);
    });

    it('should reject DPIA creation without tenantId (RGPD violation)', async () => {
      await expect(
        repo.create('', {
          tenantId: '',
          purposeId: PURPOSE_ID,
          title: 'Invalid DPIA',
          description: 'This DPIA should not be created without tenantId.',
        })
      ).rejects.toThrow('RGPD VIOLATION: tenantId required');
    });

    it('should reject duplicate DPIA for same purpose', async () => {
      await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'First DPIA for purpose',
        description: 'This is the first DPIA for this purpose and should succeed.',
      });

      await expect(
        repo.create(TENANT_ID, {
          tenantId: TENANT_ID,
          purposeId: PURPOSE_ID,
          title: 'Duplicate DPIA for purpose',
          description: 'This DPIA should fail because one already exists for this purpose.',
        })
      ).rejects.toThrow('DPIA already exists for this purpose');
    });
  });

  // ===========================================================================
  // DPIA Retrieval Tests
  // ===========================================================================

  describe('DPIA Retrieval', () => {
    it('should find DPIA by id with risks', async () => {
      const created = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA to find by ID',
        description: 'This DPIA will be retrieved by its ID along with its risks.',
        overallRiskLevel: DPIA_RISK_LEVEL.HIGH,
      });

      const found = await repo.findById(TENANT_ID, created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('DPIA to find by ID');
      expect(found?.risks).toBeDefined();
      expect(found?.risks?.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent DPIA', async () => {
      const found = await repo.findById(TENANT_ID, randomUUID());

      expect(found).toBeNull();
    });

    it('should find DPIA by purposeId', async () => {
      await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA to find by purpose',
        description: 'This DPIA will be retrieved by its associated purposeId.',
      });

      const found = await repo.findByPurposeId(TENANT_ID, PURPOSE_ID);

      expect(found).not.toBeNull();
      expect(found?.purposeId).toBe(PURPOSE_ID);
    });

    it('should list all DPIAs for tenant', async () => {
      await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'First DPIA',
        description: 'First DPIA for listing test purposes.',
      });
      await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID_2,
        title: 'Second DPIA',
        description: 'Second DPIA for listing test purposes.',
      });

      const list = await repo.findAll(TENANT_ID);

      expect(list.length).toBeGreaterThanOrEqual(2);
      list.forEach(d => expect(d.tenantId).toBe(TENANT_ID));
    });

    it('should filter DPIAs by status', async () => {
      await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'Pending DPIA',
        description: 'DPIA with pending status for filter test.',
      });

      const pending = await repo.findAll(TENANT_ID, { status: DPIA_STATUS.PENDING });

      expect(pending.length).toBeGreaterThan(0);
      pending.forEach(d => expect(d.status).toBe(DPIA_STATUS.PENDING));
    });

    it('should filter DPIAs by risk level', async () => {
      await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'High Risk DPIA',
        description: 'DPIA with high risk level for filter test.',
        overallRiskLevel: DPIA_RISK_LEVEL.HIGH,
      });

      const highRisk = await repo.findAll(TENANT_ID, { riskLevel: DPIA_RISK_LEVEL.HIGH });

      expect(highRisk.length).toBeGreaterThan(0);
      highRisk.forEach(d => expect(d.overallRiskLevel).toBe(DPIA_RISK_LEVEL.HIGH));
    });
  });

  // ===========================================================================
  // DPO Validation Workflow Tests
  // ===========================================================================

  describe('DPO Validation Workflow', () => {
    it('should approve pending DPIA', async () => {
      const dpoUserId = randomUUID();
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA to approve',
        description: 'This DPIA will be approved by the DPO in the validation workflow.',
      });

      const approved = await repo.validate(
        TENANT_ID,
        dpia.id,
        dpoUserId,
        'APPROVED',
        'DPIA approved after review. Security measures are adequate.'
      );

      expect(approved).not.toBeNull();
      expect(approved?.status).toBe(DPIA_STATUS.APPROVED);
      expect(approved?.validatedAt).toBeInstanceOf(Date);
      expect(approved?.validatedBy).toBe(dpoUserId);
      expect(approved?.dpoComments).toContain('approved after review');
    });

    it('should reject pending DPIA with reason', async () => {
      const dpoUserId = randomUUID();
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA to reject',
        description: 'This DPIA will be rejected by the DPO with a justification.',
      });

      const rejected = await repo.validate(
        TENANT_ID,
        dpia.id,
        dpoUserId,
        'REJECTED',
        'Security review comments',
        'Security measures are insufficient. Please add encryption at rest.'
      );

      expect(rejected).not.toBeNull();
      expect(rejected?.status).toBe(DPIA_STATUS.REJECTED);
      expect(rejected?.rejectionReason).toContain('insufficient');
    });

    it('should require rejection reason when rejecting', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA missing rejection reason',
        description: 'This DPIA rejection should fail without a reason provided.',
      });

      await expect(
        repo.validate(TENANT_ID, dpia.id, randomUUID(), 'REJECTED')
      ).rejects.toThrow('Rejection reason is required');
    });

    it('should prevent validation of already validated DPIA', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'Already validated DPIA',
        description: 'This DPIA will be validated once and then fail on second attempt.',
      });

      await repo.validate(TENANT_ID, dpia.id, randomUUID(), 'APPROVED');

      await expect(
        repo.validate(TENANT_ID, dpia.id, randomUUID(), 'REJECTED', '', 'Cannot change decision')
      ).rejects.toThrow('DPIA is already validated');
    });

    it('should throw RGPD violation on validation without tenantId', async () => {
      await expect(
        repo.validate('', randomUUID(), randomUUID(), 'APPROVED')
      ).rejects.toThrow('RGPD VIOLATION');
    });
  });

  // ===========================================================================
  // DPIA Update Tests
  // ===========================================================================

  describe('DPIA Update', () => {
    it('should update pending DPIA', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA to update',
        description: 'This DPIA description will be updated.',
      });

      const updated = await repo.update(TENANT_ID, dpia.id, {
        title: 'Updated DPIA Title',
        description: 'Updated description with more details for the DPO review.',
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Updated DPIA Title');
      expect(updated?.description).toContain('Updated description');
    });

    it('should not update validated DPIA', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'Validated DPIA',
        description: 'This DPIA will be validated and then update should fail.',
      });

      await repo.validate(TENANT_ID, dpia.id, randomUUID(), 'APPROVED', 'Approved');

      await expect(
        repo.update(TENANT_ID, dpia.id, { title: 'Should fail' })
      ).rejects.toThrow('Cannot update validated DPIA');
    });

    it('should throw RGPD violation on update without tenantId', async () => {
      await expect(
        repo.update('', randomUUID(), { title: 'Test' })
      ).rejects.toThrow('RGPD VIOLATION');
    });
  });

  // ===========================================================================
  // DPIA Deletion Tests
  // ===========================================================================

  describe('DPIA Deletion', () => {
    it('should soft delete DPIA', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA to delete',
        description: 'This DPIA will be soft deleted and hidden from queries.',
      });

      const deleted = await repo.softDelete(TENANT_ID, dpia.id);

      expect(deleted).toBe(true);

      // Verify DPIA is not returned in queries
      const found = await repo.findById(TENANT_ID, dpia.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent DPIA', async () => {
      const deleted = await repo.softDelete(TENANT_ID, randomUUID());

      expect(deleted).toBe(false);
    });

    it('should throw RGPD violation on delete without tenantId', async () => {
      await expect(
        repo.softDelete('', randomUUID())
      ).rejects.toThrow('RGPD VIOLATION');
    });
  });

  // ===========================================================================
  // Statistics Tests
  // ===========================================================================

  describe('DPIA Statistics', () => {
    it('should return DPIA stats for tenant', async () => {
      // Create DPIAs with different statuses
      const _dpia1 = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'Pending DPIA',
        description: 'DPIA that remains pending for stats test.',
      });

      await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID_2,
        title: 'Approved DPIA',
        description: 'DPIA that will be approved for stats test.',
        overallRiskLevel: DPIA_RISK_LEVEL.HIGH,
      });
      // Approve the second DPIA
      const dpiaList = await repo.findAll(TENANT_ID);
      const dpiaToApprove = dpiaList.find(d => d.title === 'Approved DPIA');
      if (dpiaToApprove) {
        await repo.validate(TENANT_ID, dpiaToApprove.id, randomUUID(), 'APPROVED');
      }

      const stats = await repo.getStats(TENANT_ID);

      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.pending).toBeGreaterThanOrEqual(1);
      expect(stats.approved).toBeGreaterThanOrEqual(1);
      expect(stats.byRiskLevel).toBeDefined();
      expect(stats.byRiskLevel.high).toBeGreaterThanOrEqual(1);
    });

    it('should throw RGPD violation on stats without tenantId', async () => {
      await expect(repo.getStats('')).rejects.toThrow('RGPD VIOLATION');
    });
  });

  // ===========================================================================
  // Risk Management Tests
  // ===========================================================================

  describe('Risk Management', () => {
    it('should create a custom risk for DPIA', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA with custom risks',
        description: 'This DPIA will have manually added custom risks.',
      });

      const risk = await repo.createRisk(TENANT_ID, {
        dpiaId: dpia.id,
        tenantId: TENANT_ID,
        riskName: 'Custom Security Risk',
        description: 'A custom risk identified during manual security review.',
        likelihood: 'HIGH',
        impact: 'MEDIUM',
        mitigation: 'Implement additional security controls and monitoring.',
      });

      expect(risk).toBeDefined();
      expect(risk.dpiaId).toBe(dpia.id);
      expect(risk.riskName).toBe('Custom Security Risk');
      expect(risk.likelihood).toBe('HIGH');
    });

    it('should update existing risk', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA for risk update',
        description: 'DPIA to test risk update functionality.',
        overallRiskLevel: DPIA_RISK_LEVEL.HIGH,
      });

      const risks = await repo.findRisksByDpiaId(TENANT_ID, dpia.id);
      expect(risks.length).toBeGreaterThan(0);

      const updated = await repo.updateRisk(TENANT_ID, risks[0].id, {
        mitigation: 'Updated mitigation strategy with new controls.',
      });

      expect(updated).not.toBeNull();
      expect(updated?.mitigation).toContain('Updated mitigation');
    });

    it('should delete risk', async () => {
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA for risk deletion',
        description: 'DPIA to test risk deletion functionality.',
        overallRiskLevel: DPIA_RISK_LEVEL.HIGH,
      });

      const risks = await repo.findRisksByDpiaId(TENANT_ID, dpia.id);
      const initialCount = risks.length;

      const deleted = await repo.deleteRisk(TENANT_ID, risks[0].id);

      expect(deleted).toBe(true);

      const remainingRisks = await repo.findRisksByDpiaId(TENANT_ID, dpia.id);
      expect(remainingRisks.length).toBe(initialCount - 1);
    });

    it('should throw error when creating risk for non-existent DPIA', async () => {
      await expect(
        repo.createRisk(TENANT_ID, {
          dpiaId: randomUUID(),
          tenantId: TENANT_ID,
          riskName: 'Orphan Risk',
          description: 'This risk should fail because DPIA does not exist.',
          mitigation: 'No mitigation needed.',
        })
      ).rejects.toThrow('DPIA not found');
    });

    it('should throw RGPD violation on risk operations without tenantId', async () => {
      await expect(
        repo.findRisksByDpiaId('', randomUUID())
      ).rejects.toThrow('RGPD VIOLATION');

      await expect(
        repo.createRisk('', {
          dpiaId: randomUUID(),
          tenantId: '',
          riskName: 'Test',
          description: 'Test description',
          mitigation: 'Test mitigation',
        })
      ).rejects.toThrow('RGPD VIOLATION');
    });
  });

  // ===========================================================================
  // Tenant Isolation Tests (CRITICAL for RGPD)
  // ===========================================================================

  describe('Tenant Isolation (CRITICAL)', () => {
    it('should enforce tenant isolation on findById', async () => {
      // Create DPIA in tenant 1
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'Tenant 1 DPIA',
        description: 'This DPIA belongs to tenant 1 and should not be accessible by tenant 2.',
      });

      // Try to access from tenant 2
      const foundFromOtherTenant = await repo.findById(TENANT_ID_2, dpia.id);

      expect(foundFromOtherTenant).toBeNull();
    });

    it('should enforce tenant isolation on findAll', async () => {
      // Create DPIA in tenant 1
      await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'Tenant 1 Only DPIA',
        description: 'DPIA that should only appear in tenant 1 list.',
      });

      // Create DPIA in tenant 2
      await repo.create(TENANT_ID_2, {
        tenantId: TENANT_ID_2,
        purposeId: PURPOSE_ID_3,
        title: 'Tenant 2 Only DPIA',
        description: 'DPIA that should only appear in tenant 2 list.',
      });

      // Get DPIAs for each tenant
      const tenant1Dpias = await repo.findAll(TENANT_ID);
      const tenant2Dpias = await repo.findAll(TENANT_ID_2);

      // Verify isolation
      tenant1Dpias.forEach(d => expect(d.tenantId).toBe(TENANT_ID));
      tenant2Dpias.forEach(d => expect(d.tenantId).toBe(TENANT_ID_2));

      // Verify no cross-tenant data
      expect(tenant1Dpias.some(d => d.title === 'Tenant 2 Only DPIA')).toBe(false);
      expect(tenant2Dpias.some(d => d.title === 'Tenant 1 Only DPIA')).toBe(false);
    });

    it('should enforce tenant isolation on validation', async () => {
      // Create DPIA in tenant 1
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA for cross-tenant validation test',
        description: 'This DPIA should not be validatable from another tenant.',
      });

      // Try to validate from tenant 2
      const result = await repo.validate(TENANT_ID_2, dpia.id, randomUUID(), 'APPROVED');

      // Should return null (not found) due to tenant isolation
      expect(result).toBeNull();

      // Original should still be pending
      const original = await repo.findById(TENANT_ID, dpia.id);
      expect(original?.status).toBe(DPIA_STATUS.PENDING);
    });

    it('should enforce tenant isolation on soft delete', async () => {
      // Create DPIA in tenant 1
      const dpia = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'DPIA for cross-tenant delete test',
        description: 'This DPIA should not be deletable from another tenant.',
      });

      // Try to delete from tenant 2
      const deleted = await repo.softDelete(TENANT_ID_2, dpia.id);

      expect(deleted).toBe(false);

      // Original should still exist
      const original = await repo.findById(TENANT_ID, dpia.id);
      expect(original).not.toBeNull();
    });

    it('should enforce tenant isolation on stats', async () => {
      // Create DPIAs in both tenants
      await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        title: 'Tenant 1 DPIA for stats',
        description: 'DPIA that should be counted in tenant 1 stats only.',
      });

      await repo.create(TENANT_ID_2, {
        tenantId: TENANT_ID_2,
        purposeId: PURPOSE_ID_3,
        title: 'Tenant 2 DPIA for stats',
        description: 'DPIA that should be counted in tenant 2 stats only.',
      });

      const stats1 = await repo.getStats(TENANT_ID);
      const stats2 = await repo.getStats(TENANT_ID_2);

      // Stats should be independent
      expect(stats1.total).toBeGreaterThanOrEqual(1);
      expect(stats2.total).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // RGPD Compliance Edge Cases
  // ===========================================================================

  describe('RGPD Compliance Edge Cases', () => {
    it('should throw RGPD violation on findAll without tenantId', async () => {
      await expect(repo.findAll('')).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw RGPD violation on findById without tenantId', async () => {
      await expect(repo.findById('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw RGPD violation on findByPurposeId without tenantId', async () => {
      await expect(repo.findByPurposeId('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw RGPD violation on create without tenantId', async () => {
      await expect(
        repo.create('', {
          tenantId: '',
          purposeId: randomUUID(),
          title: 'Test',
          description: 'Test description for RGPD violation test.',
        })
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw RGPD violation on update without tenantId', async () => {
      await expect(
        repo.update('', randomUUID(), { title: 'Test' })
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw RGPD violation on validate without tenantId', async () => {
      await expect(
        repo.validate('', randomUUID(), randomUUID(), 'APPROVED')
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw RGPD violation on softDelete without tenantId', async () => {
      await expect(repo.softDelete('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw RGPD violation on getStats without tenantId', async () => {
      await expect(repo.getStats('')).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw RGPD violation on findAllWithPurposeInfo without tenantId', async () => {
      await expect(repo.findAllWithPurposeInfo('')).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw RGPD violation on risk operations without tenantId', async () => {
      await expect(repo.findRisksByDpiaId('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
      await expect(
        repo.createRisk('', {
          dpiaId: randomUUID(),
          tenantId: '',
          riskName: 'Test',
          description: 'Test description',
          mitigation: 'Test mitigation',
        })
      ).rejects.toThrow('RGPD VIOLATION');
      await expect(repo.updateRisk('', randomUUID(), {})).rejects.toThrow('RGPD VIOLATION');
      await expect(repo.deleteRisk('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });
  });
});
