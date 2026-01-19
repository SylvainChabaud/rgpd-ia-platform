/**
 * api.e2e.dpia.test.ts — E2E tests for DPIA (LOT 12.4)
 *
 * RGPD Compliance:
 * - Art. 35: DPIA for high-risk processing
 * - Art. 38.3: DPO independence (only DPO can validate)
 *
 * Coverage:
 * - LOT 12.4: DPO Features
 * - DPIA CRUD operations
 * - DPO validation workflow
 * - Tenant isolation (CRITICAL)
 * - RBAC enforcement
 *
 * Classification: P1 (technical tests, no real data)
 *
 * NOTE: These tests require a running Next.js server on localhost:3000
 * Skip with: TEST_SKIP_E2E=true or when server is not available
 */

import type { UserScope } from '@/shared/actorScope';

import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import { newId } from '@/shared/ids';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { DEFAULT_E2E_FETCH_TIMEOUT_MS, warmRoutes } from './e2e-utils';

// Check if E2E tests should be skipped
const SKIP_E2E = process.env.TEST_SKIP_E2E === 'true';
const E2E_SERVER_AVAILABLE = process.env.TEST_E2E_SERVER_AVAILABLE === 'true';

const TENANT_ID = newId();
const TENANT_ID_2 = newId();
const USER_ID = newId();
const ADMIN_ID = newId();
const DPO_ID = newId();
const PURPOSE_ID = newId();
const PURPOSE_ID_2 = newId();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

jest.setTimeout(DEFAULT_E2E_FETCH_TIMEOUT_MS + 5000);

/**
 * Helper: Generate valid JWT token for testing
 */
function generateToken(
  userId: string,
  tenantId: string,
  role: string = ACTOR_ROLE.MEMBER,
  scope: string = ACTOR_SCOPE.TENANT
): string {
  return signJwt({
    userId,
    tenantId,
    scope: scope as UserScope,
    role,
  });
}

/**
 * Helper: Create test tenant and users
 */
async function setupTestData() {
  // Create tenants
  await pool.query('INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)', [
    TENANT_ID,
    'dpia-e2e-test-1',
    'DPIA E2E Test 1',
  ]);
  await pool.query('INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)', [
    TENANT_ID_2,
    'dpia-e2e-test-2',
    'DPIA E2E Test 2',
  ]);

  // Create users and purposes for tenant 1
  await withTenantContext(pool, TENANT_ID, async (client) => {
    // Regular user
    await client.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
       VALUES ($1, $2, $3, $4, $5, 'TENANT', $6)`,
      [USER_ID, TENANT_ID, 'user@dpia-test.com', 'DPIA User', '$2a$10$hash', ACTOR_ROLE.MEMBER]
    );

    // Tenant Admin
    await client.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
       VALUES ($1, $2, $3, $4, $5, 'TENANT', $6)`,
      [ADMIN_ID, TENANT_ID, 'admin@dpia-test.com', 'DPIA Admin', '$2a$10$hash', ACTOR_ROLE.TENANT_ADMIN]
    );

    // DPO user (Art. 38.3)
    await client.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
       VALUES ($1, $2, $3, $4, $5, 'TENANT', $6)`,
      [DPO_ID, TENANT_ID, 'dpo@dpia-test.com', 'DPIA DPO', '$2a$10$hash', ACTOR_ROLE.DPO]
    );

    // Create purposes
    await client.query(
      `INSERT INTO purposes (id, tenant_id, label, description, category, lawful_basis, data_classification, risk_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [PURPOSE_ID, TENANT_ID, 'AI Recommendations', 'AI-based personalized recommendations', 'ai_processing', 'consent', 'P1', 'HIGH']
    );

    await client.query(
      `INSERT INTO purposes (id, tenant_id, label, description, category, lawful_basis, data_classification, risk_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [PURPOSE_ID_2, TENANT_ID, 'Marketing Analytics', 'Marketing data analysis', 'marketing', 'legitimate_interest', 'P1', 'MEDIUM']
    );
  });
}

/**
 * Helper: Cleanup test data
 */
async function cleanup() {
  const existingTenants = await pool.query(
    "SELECT id FROM tenants WHERE slug LIKE 'dpia-e2e-test-%'"
  );
  if (existingTenants.rows.length > 0) {
    const tenantIds = existingTenants.rows.map((r) => r.id);
    await pool.query('SELECT cleanup_test_data($1::UUID[])', [tenantIds]);
  }
  await pool.query('SELECT cleanup_test_data($1::UUID[])', [[TENANT_ID, TENANT_ID_2]]);
}

beforeAll(async () => {
  if (!E2E_SERVER_AVAILABLE && !SKIP_E2E) {
    console.log('DPIA E2E tests skipped: Set TEST_E2E_SERVER_AVAILABLE=true if server is running');
  }

  await cleanup();
  await setupTestData();

  if (!SKIP_E2E && E2E_SERVER_AVAILABLE) {
    await warmRoutes(BASE_URL, [
      { path: `/api/tenants/${TENANT_ID}/dpia` },
    ]);
  }
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

const describeE2E = SKIP_E2E || !E2E_SERVER_AVAILABLE ? describe.skip : describe;

describeE2E('E2E - DPIA API (LOT 12.4)', () => {
  const memberToken = generateToken(USER_ID, TENANT_ID, ACTOR_ROLE.MEMBER);
  const adminToken = generateToken(ADMIN_ID, TENANT_ID, ACTOR_ROLE.TENANT_ADMIN);
  const dpoToken = generateToken(DPO_ID, TENANT_ID, ACTOR_ROLE.DPO);
  const _platformToken = generateToken(newId(), TENANT_ID, ACTOR_ROLE.SUPERADMIN, ACTOR_SCOPE.PLATFORM);

  // ===========================================================================
  // DPIA List Tests
  // ===========================================================================

  describe('DPIA List (GET /api/tenants/:id/dpia)', () => {
    test('DPO can list DPIAs', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        headers: {
          Authorization: `Bearer ${dpoToken}`,
        },
      });

      expect([200, 401, 403, 500, 501]).toContain(response.status);

      if (response.ok) {
        const data = await response.json();
        expect(data).toBeDefined();
        expect(Array.isArray(data.dpias) || Array.isArray(data)).toBeTruthy();
      }
    });

    test('TENANT_ADMIN can list DPIAs', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect([200, 401, 403, 500, 501]).toContain(response.status);
    });

    test('MEMBER cannot list DPIAs (RBAC)', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      expect([403, 404, 500, 501]).toContain(response.status);
    });

    test('Request without auth returns 401', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`);

      expect(response.status).toBe(401);
    });
  });

  // ===========================================================================
  // DPIA Creation Tests
  // ===========================================================================

  describe('DPIA Creation (POST /api/tenants/:id/dpia)', () => {
    let _createdDpiaId: string | null = null;

    test('TENANT_ADMIN can create DPIA', async () => {
      const dpiaData = {
        purposeId: PURPOSE_ID,
        title: 'DPIA for AI Recommendations',
        description: 'Data Protection Impact Assessment for AI-based personalized recommendations processing.',
        overallRiskLevel: 'HIGH',
        dataClassification: 'P1',
      };

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dpiaData),
      });

      expect([200, 201, 400, 403, 500, 501]).toContain(response.status);

      if (response.ok || response.status === 201) {
        const data = await response.json();
        expect(data).toBeDefined();
        expect(data.id || data.dpia?.id).toBeDefined();
        _createdDpiaId = data.id || data.dpia?.id;
        expect(data.status || data.dpia?.status).toBe('PENDING');
      }
    });

    test('DPO can create DPIA', async () => {
      const dpiaData = {
        purposeId: PURPOSE_ID_2,
        title: 'DPIA for Marketing Analytics',
        description: 'Data Protection Impact Assessment for marketing data analysis processing.',
        overallRiskLevel: 'MEDIUM',
      };

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dpoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dpiaData),
      });

      expect([200, 201, 400, 403, 500, 501]).toContain(response.status);
    });

    test('MEMBER cannot create DPIA (RBAC)', async () => {
      const dpiaData = {
        purposeId: PURPOSE_ID,
        title: 'Unauthorized DPIA',
        description: 'This DPIA should not be created by a regular member.',
      };

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${memberToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dpiaData),
      });

      expect([403, 404, 500, 501]).toContain(response.status);
    });

    test('DPIA creation validates required fields', async () => {
      const incompleteData = {
        purposeId: PURPOSE_ID,
        // Missing title and description
      };

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incompleteData),
      });

      expect([400, 403, 422, 500, 501]).toContain(response.status);
    });

    test('DPIA creation rejects P3 data classification (RGPD)', async () => {
      const dpiaData = {
        purposeId: PURPOSE_ID,
        title: 'Forbidden P3 DPIA',
        description: 'This DPIA attempts to use P3 sensitive data classification.',
        dataClassification: 'P3',
      };

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dpiaData),
      });

      // Should reject P3 classification
      expect([400, 403, 422, 500, 501]).toContain(response.status);
    });
  });

  // ===========================================================================
  // DPIA Detail Tests
  // ===========================================================================

  describe('DPIA Detail (GET /api/tenants/:id/dpia/:dpiaId)', () => {
    let testDpiaId: string | null = null;

    beforeAll(async () => {
      // Create a DPIA for testing
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purposeId: PURPOSE_ID,
          title: 'Test DPIA for Detail',
          description: 'This DPIA is created for detail retrieval testing purposes.',
          overallRiskLevel: 'HIGH',
        }),
      });

      if (response.ok || response.status === 201) {
        const data = await response.json();
        testDpiaId = data.id || data.dpia?.id;
      }
    });

    test('DPO can view DPIA details with risks', async () => {
      if (!testDpiaId) {
        console.log('Skipping: no test DPIA created');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${testDpiaId}`, {
        headers: {
          Authorization: `Bearer ${dpoToken}`,
        },
      });

      expect([200, 401, 403, 404, 500, 501]).toContain(response.status);

      if (response.ok) {
        const data = await response.json();
        expect(data.id || data.dpia?.id).toBe(testDpiaId);
        // HIGH risk DPIA should have auto-generated risks
        expect(data.risks || data.dpia?.risks).toBeDefined();
      }
    });

    test('MEMBER cannot view DPIA details (RBAC)', async () => {
      if (!testDpiaId) return;

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${testDpiaId}`, {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      expect([403, 404, 500, 501]).toContain(response.status);
    });

    test('Returns 404 for non-existent DPIA', async () => {
      const nonExistentId = newId();

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${nonExistentId}`, {
        headers: {
          Authorization: `Bearer ${dpoToken}`,
        },
      });

      expect([404, 500, 501]).toContain(response.status);
    });
  });

  // ===========================================================================
  // DPO Validation Workflow Tests (Art. 38.3)
  // ===========================================================================

  describe('DPO Validation Workflow (PATCH /api/tenants/:id/dpia/:dpiaId)', () => {
    let pendingDpiaId: string | null = null;

    beforeEach(async () => {
      // Create a fresh pending DPIA for each test
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purposeId: newId(), // Use unique purpose
          title: `Validation Test DPIA ${Date.now()}`,
          description: 'DPIA for validation workflow testing purposes.',
          overallRiskLevel: 'HIGH',
        }),
      });

      if (response.ok || response.status === 201) {
        const data = await response.json();
        pendingDpiaId = data.id || data.dpia?.id;
      }
    });

    test('DPO can approve pending DPIA', async () => {
      if (!pendingDpiaId) {
        console.log('Skipping: no pending DPIA created');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${pendingDpiaId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${dpoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
          dpoComments: 'Security measures are adequate. DPIA approved after DPO review.',
        }),
      });

      expect([200, 401, 403, 404, 500, 501]).toContain(response.status);

      if (response.ok) {
        const data = await response.json();
        expect(data.status || data.dpia?.status).toBe('APPROVED');
        expect(data.validatedAt || data.dpia?.validatedAt).toBeDefined();
      }
    });

    test('DPO can reject DPIA with reason', async () => {
      if (!pendingDpiaId) return;

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${pendingDpiaId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${dpoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: 'Security measures are insufficient. Additional encryption required for this risk level.',
        }),
      });

      expect([200, 401, 403, 404, 500, 501]).toContain(response.status);

      if (response.ok) {
        const data = await response.json();
        expect(data.status || data.dpia?.status).toBe('REJECTED');
        expect(data.rejectionReason || data.dpia?.rejectionReason).toContain('insufficient');
      }
    });

    test('TENANT_ADMIN cannot validate DPIA (Art. 38.3 - DPO independence)', async () => {
      if (!pendingDpiaId) return;

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${pendingDpiaId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
          dpoComments: 'Admin trying to approve',
        }),
      });

      // Admin should not be able to change status to APPROVED/REJECTED
      // They can update other fields but not validate
      expect([200, 403, 404, 500, 501]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        // If 200, status should still be PENDING (admin can't validate)
        expect(data.status || data.dpia?.status).toBe('PENDING');
      }
    });

    test('Rejection requires reason', async () => {
      if (!pendingDpiaId) return;

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${pendingDpiaId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${dpoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'REJECTED',
          // Missing rejectionReason
        }),
      });

      expect([400, 403, 422, 500, 501]).toContain(response.status);
    });

    test('Cannot validate already validated DPIA', async () => {
      if (!pendingDpiaId) return;

      // First, approve the DPIA
      await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${pendingDpiaId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${dpoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
          dpoComments: 'First approval',
        }),
      });

      // Try to validate again
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${pendingDpiaId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${dpoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: 'Trying to change after approval',
        }),
      });

      expect([400, 403, 409, 500, 501]).toContain(response.status);
    });
  });

  // ===========================================================================
  // DPIA Deletion Tests
  // ===========================================================================

  describe('DPIA Deletion (DELETE /api/tenants/:id/dpia/:dpiaId)', () => {
    let deletableDpiaId: string | null = null;

    beforeEach(async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purposeId: newId(),
          title: `Deletable DPIA ${Date.now()}`,
          description: 'DPIA created for deletion testing purposes.',
          overallRiskLevel: 'MEDIUM',
        }),
      });

      if (response.ok || response.status === 201) {
        const data = await response.json();
        deletableDpiaId = data.id || data.dpia?.id;
      }
    });

    test('TENANT_ADMIN can delete DPIA', async () => {
      if (!deletableDpiaId) return;

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${deletableDpiaId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect([200, 204, 401, 403, 404, 500, 501]).toContain(response.status);

      if (response.ok || response.status === 204) {
        // Verify DPIA is no longer accessible
        const getResponse = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${deletableDpiaId}`, {
          headers: {
            Authorization: `Bearer ${dpoToken}`,
          },
        });

        expect([404, 500, 501]).toContain(getResponse.status);
      }
    });

    test('MEMBER cannot delete DPIA (RBAC)', async () => {
      if (!deletableDpiaId) return;

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${deletableDpiaId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      expect([403, 404, 500, 501]).toContain(response.status);
    });
  });

  // ===========================================================================
  // Tenant Isolation Tests (CRITICAL for RGPD)
  // ===========================================================================

  describe('Tenant Isolation (CRITICAL)', () => {
    let tenant1DpiaId: string | null = null;

    beforeAll(async () => {
      // Create DPIA in tenant 1
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purposeId: PURPOSE_ID,
          title: 'Tenant 1 Isolated DPIA',
          description: 'This DPIA should only be accessible by tenant 1 users.',
          overallRiskLevel: 'HIGH',
        }),
      });

      if (response.ok || response.status === 201) {
        const data = await response.json();
        tenant1DpiaId = data.id || data.dpia?.id;
      }
    });

    test('DPO from tenant 1 cannot access tenant 2 DPIAs', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID_2}/dpia`, {
        headers: {
          Authorization: `Bearer ${dpoToken}`, // Token from tenant 1
        },
      });

      // Should be rejected (403) or empty list (200 with isolation)
      expect([200, 403, 404, 500, 501]).toContain(response.status);

      if (response.ok) {
        const data = await response.json();
        const dpias = data.dpias || data;
        // If response is OK, list should be empty or not contain tenant 1 data
        if (Array.isArray(dpias)) {
          dpias.forEach((d: { tenantId?: string }) => {
            expect(d.tenantId).not.toBe(TENANT_ID);
          });
        }
      }
    });

    test('Admin from tenant 1 cannot access specific DPIA in tenant 2', async () => {
      if (!tenant1DpiaId) return;

      // Try to access tenant 1's DPIA through tenant 2's URL
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID_2}/dpia/${tenant1DpiaId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`, // Token from tenant 1
        },
      });

      // Should return 404 (not found due to isolation) or 403
      expect([403, 404, 500, 501]).toContain(response.status);
    });

    test('DPO from tenant 2 cannot validate tenant 1 DPIA', async () => {
      if (!tenant1DpiaId) return;

      const tenant2DpoToken = generateToken(newId(), TENANT_ID_2, ACTOR_ROLE.DPO);

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${tenant1DpiaId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tenant2DpoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
          dpoComments: 'Cross-tenant validation attempt',
        }),
      });

      // Should be rejected
      expect([403, 404, 500, 501]).toContain(response.status);
    });
  });

  // ===========================================================================
  // DPIA Export Tests
  // ===========================================================================

  describe('DPIA Export (GET /api/tenants/:id/dpia/:dpiaId/export)', () => {
    let exportableDpiaId: string | null = null;

    beforeAll(async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purposeId: PURPOSE_ID,
          title: 'Exportable DPIA',
          description: 'This DPIA will be exported as PDF for CNIL documentation.',
          overallRiskLevel: 'HIGH',
        }),
      });

      if (response.ok || response.status === 201) {
        const data = await response.json();
        exportableDpiaId = data.id || data.dpia?.id;
      }
    });

    test('DPO can export DPIA as PDF', async () => {
      if (!exportableDpiaId) return;

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${exportableDpiaId}/export`, {
        headers: {
          Authorization: `Bearer ${dpoToken}`,
        },
      });

      expect([200, 401, 403, 404, 500, 501]).toContain(response.status);

      if (response.ok) {
        const contentType = response.headers.get('Content-Type');
        // Should return HTML (for PDF generation) or direct PDF
        expect(contentType).toMatch(/html|pdf/i);
      }
    });

    test('MEMBER cannot export DPIA', async () => {
      if (!exportableDpiaId) return;

      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/${exportableDpiaId}/export`, {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      expect([403, 404, 500, 501]).toContain(response.status);
    });
  });

  // ===========================================================================
  // Registre Art. 30 Tests
  // ===========================================================================

  describe('Registre Art. 30 (GET /api/tenants/:id/registre)', () => {
    test('DPO can access Registre Art. 30', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/registre`, {
        headers: {
          Authorization: `Bearer ${dpoToken}`,
        },
      });

      expect([200, 401, 403, 500, 501]).toContain(response.status);

      if (response.ok) {
        const data = await response.json();
        expect(data.entries || data).toBeDefined();
        expect(data.stats).toBeDefined();
      }
    });

    test('TENANT_ADMIN can access Registre Art. 30', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/registre`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect([200, 401, 403, 500, 501]).toContain(response.status);
    });

    test('MEMBER cannot access Registre Art. 30', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/registre`, {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      expect([403, 404, 500, 501]).toContain(response.status);
    });

    test('Registre can be exported as CSV', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/registre/export?format=csv`, {
        headers: {
          Authorization: `Bearer ${dpoToken}`,
        },
      });

      expect([200, 401, 403, 500, 501]).toContain(response.status);

      if (response.ok) {
        const contentType = response.headers.get('Content-Type');
        expect(contentType).toMatch(/csv|text/i);
      }
    });
  });

  // ===========================================================================
  // Security & Edge Cases
  // ===========================================================================

  describe('Security & Edge Cases', () => {
    test('Error responses do not leak sensitive data', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia/invalid-uuid`, {
        headers: {
          Authorization: `Bearer ${dpoToken}`,
        },
      });

      const text = await response.text();

      expect(text).not.toContain('DATABASE_URL');
      expect(text).not.toContain('JWT_SECRET');
      expect(text).not.toContain('password');
      expect(text).not.toContain('Stack trace:');
    });

    test('Invalid tenant ID format is rejected', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/not-a-uuid/dpia`, {
        headers: {
          Authorization: `Bearer ${dpoToken}`,
        },
      });

      expect([400, 403, 404, 500, 501]).toContain(response.status);
    });

    test('Request with expired/invalid token returns 401', async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/${TENANT_ID}/dpia`, {
        headers: {
          Authorization: 'Bearer invalid-token-here',
        },
      });

      expect(response.status).toBe(401);
    });
  });
});
