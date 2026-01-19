/**
 * Repository Tests: Purpose Repository
 * RGPD: LOT 12.2 - Gestion des Consentements
 *
 * Tests:
 * - Purpose CRUD operations
 * - Tenant isolation (CRITICAL)
 * - Template adoption
 * - System purpose protection
 * - Consent counting
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgPurposeRepo } from '@/infrastructure/repositories/PgPurposeRepo';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import { randomUUID } from 'crypto';
import { VALIDATION_STATUS, LAWFUL_BASIS } from '@/lib/constants/rgpd';

describe('Repository: PgPurposeRepo', () => {
  let repo: PgPurposeRepo;
  const TENANT_ID_1 = '00000000-0000-0000-0000-000000000601';
  const TENANT_ID_2 = '00000000-0000-0000-0000-000000000602';
  const TEMPLATE_ID = '00000000-0000-0000-0000-000000000701';
  const USER_ID = '00000000-0000-0000-0000-000000000801';

  beforeEach(async () => {
    repo = new PgPurposeRepo();

    // Cleanup test data
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID_1, TENANT_ID_2]]);

    // Create test tenants
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID_1, 'purpose-repo-test-1', 'Purpose Repo Test 1']
    );
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID_2, 'purpose-repo-test-2', 'Purpose Repo Test 2']
    );

    // Create test template
    await pool.query(
      `INSERT INTO purpose_templates (id, code, name, description, lawful_basis, category, risk_level, max_data_class, requires_dpia, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        TEMPLATE_ID,
        'TPL_TEST_001',
        'Test Template',
        'Template for testing',
        'consent',
        'ai_processing',
        'HIGH',
        'P1',
        true,
        true,
      ]
    );

    // Create test user for consents
    await withTenantContext(pool, TENANT_ID_1, async (client) => {
      await client.query(
        `INSERT INTO tenant_users (id, tenant_id, email_hash, display_name, scope, role, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [USER_ID, TENANT_ID_1, 'hash_test_user', 'Test User', 'TENANT', 'MEMBER', 'ACTIVE']
      );
    });
  });

  // ===========================================================================
  // RGPD Tenant Isolation Tests (CRITICAL)
  // ===========================================================================

  describe('RGPD: Tenant Isolation (CRITICAL)', () => {
    it('should throw RGPD VIOLATION if tenantId is empty for findAll', async () => {
      await expect(repo.findAll('')).rejects.toThrow('RGPD VIOLATION: tenantId required');
    });

    it('should throw RGPD VIOLATION if tenantId is empty for create', async () => {
      await expect(
        repo.create('', {
          label: 'Test',
          description: 'Test description',
          lawfulBasis: LAWFUL_BASIS.CONSENT,
        })
      ).rejects.toThrow('RGPD VIOLATION: tenantId required');
    });

    it('should NOT return purposes from other tenant', async () => {
      // Create purpose in tenant 1
      await repo.create(TENANT_ID_1, {
        label: 'Tenant 1 Purpose',
        description: 'Purpose belonging to tenant 1',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      // Create purpose in tenant 2
      await repo.create(TENANT_ID_2, {
        label: 'Tenant 2 Purpose',
        description: 'Purpose belonging to tenant 2',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      // Query tenant 1 - should only see tenant 1's purpose
      const tenant1Purposes = await repo.findAll(TENANT_ID_1);
      expect(tenant1Purposes.length).toBe(1);
      expect(tenant1Purposes[0].label).toBe('Tenant 1 Purpose');
      expect(tenant1Purposes[0].tenantId).toBe(TENANT_ID_1);

      // Query tenant 2 - should only see tenant 2's purpose
      const tenant2Purposes = await repo.findAll(TENANT_ID_2);
      expect(tenant2Purposes.length).toBe(1);
      expect(tenant2Purposes[0].label).toBe('Tenant 2 Purpose');
      expect(tenant2Purposes[0].tenantId).toBe(TENANT_ID_2);
    });

    it('should NOT find purpose by ID from other tenant', async () => {
      // Create purpose in tenant 1
      const purpose = await repo.create(TENANT_ID_1, {
        label: 'Tenant 1 Purpose',
        description: 'Purpose belonging to tenant 1',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      // Try to access from tenant 2 - should return null
      const result = await repo.findById(TENANT_ID_2, purpose.id);
      expect(result).toBeNull();
    });

    it('should NOT update purpose from other tenant', async () => {
      // Create purpose in tenant 1
      const purpose = await repo.create(TENANT_ID_1, {
        label: 'Original Label',
        description: 'Original description',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      // Try to update from tenant 2 - should return null (not found)
      const result = await repo.update(TENANT_ID_2, purpose.id, {
        label: 'Hacked Label',
      });

      expect(result).toBeNull();

      // Verify original purpose unchanged
      const original = await repo.findById(TENANT_ID_1, purpose.id);
      expect(original?.label).toBe('Original Label');
    });

    it('should NOT soft-delete purpose from other tenant', async () => {
      // Create purpose in tenant 1
      const purpose = await repo.create(TENANT_ID_1, {
        label: 'Tenant 1 Purpose',
        description: 'Purpose belonging to tenant 1',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      // Try to delete from tenant 2 - should return false (not found)
      const deleted = await repo.softDelete(TENANT_ID_2, purpose.id);
      expect(deleted).toBe(false);

      // Verify original purpose still exists
      const original = await repo.findById(TENANT_ID_1, purpose.id);
      expect(original).not.toBeNull();
    });
  });

  // ===========================================================================
  // Purpose CRUD Tests
  // ===========================================================================

  describe('Purpose Creation', () => {
    it('should create purpose with default values', async () => {
      const purpose = await repo.create(TENANT_ID_1, {
        label: 'Test Purpose',
        description: 'A test purpose for unit tests',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      expect(purpose).toBeDefined();
      expect(purpose.id).toBeDefined();
      expect(purpose.tenantId).toBe(TENANT_ID_1);
      expect(purpose.label).toBe('Test Purpose');
      expect(purpose.isActive).toBe(true);
      expect(purpose.isRequired).toBe(false);
      expect(purpose.isFromTemplate).toBe(false);
      expect(purpose.isSystem).toBe(false);
    });

    it('should create purpose with all optional fields', async () => {
      const purpose = await repo.create(TENANT_ID_1, {
        label: 'Full Purpose',
        description: 'Purpose with all fields',
        lawfulBasis: LAWFUL_BASIS.LEGITIMATE_INTEREST,
        category: 'MARKETING',
        riskLevel: 'MEDIUM',
        maxDataClass: 'P2',
        requiresDpia: false,
        isRequired: true,
        isActive: true,
      });

      expect(purpose.category).toBe('MARKETING');
      expect(purpose.riskLevel).toBe('MEDIUM');
      expect(purpose.maxDataClass).toBe('P2');
      expect(purpose.isRequired).toBe(true);
    });

    it('should reject duplicate label within same tenant', async () => {
      await repo.create(TENANT_ID_1, {
        label: 'Unique Label',
        description: 'First purpose',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      await expect(
        repo.create(TENANT_ID_1, {
          label: 'Unique Label',
          description: 'Duplicate purpose',
          lawfulBasis: LAWFUL_BASIS.CONSENT,
        })
      ).rejects.toThrow(/unique|duplicate/i);
    });

    it('should allow same label in different tenants', async () => {
      await repo.create(TENANT_ID_1, {
        label: 'Same Label',
        description: 'Purpose in tenant 1',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      const purpose2 = await repo.create(TENANT_ID_2, {
        label: 'Same Label',
        description: 'Purpose in tenant 2',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      expect(purpose2).toBeDefined();
      expect(purpose2.tenantId).toBe(TENANT_ID_2);
    });
  });

  describe('Purpose Update', () => {
    it('should update mutable fields', async () => {
      const purpose = await repo.create(TENANT_ID_1, {
        label: 'Original',
        description: 'Original description',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      const updated = await repo.update(TENANT_ID_1, purpose.id, {
        label: 'Updated',
        description: 'Updated description',
        isActive: false,
      });

      expect(updated?.label).toBe('Updated');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.isActive).toBe(false);
    });

    it('should return null for non-existent purpose', async () => {
      const result = await repo.update(TENANT_ID_1, randomUUID(), {
        label: 'Non-existent',
      });

      expect(result).toBeNull();
    });
  });

  describe('Purpose Soft Delete', () => {
    it('should soft-delete purpose', async () => {
      const purpose = await repo.create(TENANT_ID_1, {
        label: 'To Delete',
        description: 'Purpose to delete',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      const deleted = await repo.softDelete(TENANT_ID_1, purpose.id);
      expect(deleted).toBe(true);

      // Should not appear in findAll
      const purposes = await repo.findAll(TENANT_ID_1);
      expect(purposes.find(p => p.id === purpose.id)).toBeUndefined();
    });

    it('should NOT soft-delete system purpose', async () => {
      // Create purpose from template (is_system = true)
      const purpose = await repo.createFromTemplate(TENANT_ID_1, {
        templateId: TEMPLATE_ID,
      });

      await expect(repo.softDelete(TENANT_ID_1, purpose.id)).rejects.toThrow(
        /Cannot delete system purpose|is_system/i
      );

      // Verify still exists
      const found = await repo.findById(TENANT_ID_1, purpose.id);
      expect(found).not.toBeNull();
    });
  });

  // ===========================================================================
  // Template Adoption Tests
  // ===========================================================================

  describe('Template Adoption', () => {
    it('should create purpose from template with inherited fields', async () => {
      const purpose = await repo.createFromTemplate(TENANT_ID_1, {
        templateId: TEMPLATE_ID,
      });

      expect(purpose.templateId).toBe(TEMPLATE_ID);
      expect(purpose.isFromTemplate).toBe(true);
      expect(purpose.isSystem).toBe(true);
      expect(purpose.lawfulBasis).toBe('consent');
      expect(purpose.category).toBe('ai_processing');
      expect(purpose.riskLevel).toBe('HIGH');
      expect(purpose.requiresDpia).toBe(true);
      expect(purpose.validationStatus).toBe(VALIDATION_STATUS.VALIDATED);
    });

    it('should allow custom label for adopted template', async () => {
      const purpose = await repo.createFromTemplate(TENANT_ID_1, {
        templateId: TEMPLATE_ID,
        label: 'Custom Label for Template',
        description: 'Custom description',
      });

      expect(purpose.label).toBe('Custom Label for Template');
      expect(purpose.description).toBe('Custom description');
    });

    it('should reject duplicate template adoption in same tenant', async () => {
      await repo.createFromTemplate(TENANT_ID_1, {
        templateId: TEMPLATE_ID,
      });

      await expect(
        repo.createFromTemplate(TENANT_ID_1, {
          templateId: TEMPLATE_ID,
        })
      ).rejects.toThrow(/already adopted/i);
    });

    it('should allow same template in different tenants', async () => {
      await repo.createFromTemplate(TENANT_ID_1, {
        templateId: TEMPLATE_ID,
      });

      const purpose2 = await repo.createFromTemplate(TENANT_ID_2, {
        templateId: TEMPLATE_ID,
      });

      expect(purpose2.templateId).toBe(TEMPLATE_ID);
      expect(purpose2.tenantId).toBe(TENANT_ID_2);
    });

    it('should correctly report template adoption status', async () => {
      // Before adoption
      const beforeAdoption = await repo.isTemplateAdopted(TENANT_ID_1, TEMPLATE_ID);
      expect(beforeAdoption).toBe(false);

      // After adoption
      await repo.createFromTemplate(TENANT_ID_1, {
        templateId: TEMPLATE_ID,
      });

      const afterAdoption = await repo.isTemplateAdopted(TENANT_ID_1, TEMPLATE_ID);
      expect(afterAdoption).toBe(true);

      // Different tenant should still be false
      const otherTenant = await repo.isTemplateAdopted(TENANT_ID_2, TEMPLATE_ID);
      expect(otherTenant).toBe(false);
    });
  });

  // ===========================================================================
  // Query Tests
  // ===========================================================================

  describe('Purpose Queries', () => {
    it('should find purpose by label (case-insensitive)', async () => {
      await repo.create(TENANT_ID_1, {
        label: 'Analytics Purpose',
        description: 'For analytics',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      const found = await repo.findByLabel(TENANT_ID_1, 'analytics purpose');
      expect(found).not.toBeNull();
      expect(found?.label).toBe('Analytics Purpose');
    });

    it('should return null for non-existent label', async () => {
      const found = await repo.findByLabel(TENANT_ID_1, 'Non-existent');
      expect(found).toBeNull();
    });

    it('should filter inactive purposes by default', async () => {
      await repo.create(TENANT_ID_1, {
        label: 'Active Purpose',
        description: 'Active',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
        isActive: true,
      });

      const _inactivePurpose = await repo.create(TENANT_ID_1, {
        label: 'Inactive Purpose',
        description: 'Inactive',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
        isActive: false,
      });

      // Default: only active
      const activePurposes = await repo.findAll(TENANT_ID_1);
      expect(activePurposes.length).toBe(1);
      expect(activePurposes[0].label).toBe('Active Purpose');

      // Include inactive
      const allPurposes = await repo.findAll(TENANT_ID_1, true);
      expect(allPurposes.length).toBe(2);
    });

    it('should find system purposes', async () => {
      // Create regular purpose
      await repo.create(TENANT_ID_1, {
        label: 'Regular Purpose',
        description: 'Not system',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      // Create system purpose (from template)
      await repo.createFromTemplate(TENANT_ID_1, {
        templateId: TEMPLATE_ID,
      });

      const systemPurposes = await repo.findSystemPurposes(TENANT_ID_1);
      expect(systemPurposes.length).toBe(1);
      expect(systemPurposes[0].isSystem).toBe(true);
    });
  });

  // ===========================================================================
  // Consent Counting Tests
  // ===========================================================================

  describe('Consent Counting', () => {
    it('should count consents by purpose_id', async () => {
      const purpose = await repo.create(TENANT_ID_1, {
        label: 'Consent Test Purpose',
        description: 'For consent counting',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      // Create consents referencing by purpose_id
      await withTenantContext(pool, TENANT_ID_1, async (client) => {
        await client.query(
          `INSERT INTO consents (id, tenant_id, user_id, purpose_id, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [randomUUID(), TENANT_ID_1, USER_ID, purpose.id, 'granted']
        );
        await client.query(
          `INSERT INTO consents (id, tenant_id, user_id, purpose_id, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [randomUUID(), TENANT_ID_1, USER_ID, purpose.id, 'granted']
        );
      });

      const count = await repo.countConsents(TENANT_ID_1, purpose.id);
      expect(count).toBe(2);
    });

    it('should return 0 for purpose with no consents', async () => {
      const purpose = await repo.create(TENANT_ID_1, {
        label: 'No Consents Purpose',
        description: 'Has no consents',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      });

      const count = await repo.countConsents(TENANT_ID_1, purpose.id);
      expect(count).toBe(0);
    });
  });
});
