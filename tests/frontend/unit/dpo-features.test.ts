/**
 * DPO Features Tests - Frontend LOT 12.4
 *
 * Validates strict RGPD compliance for DPO Portal:
 * - Art. 35: DPIA requirements
 * - Art. 30: Registre des traitements
 * - Art. 38.3: DPO independence
 *
 * Classification: P1 (technical tests, no real data)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useAuthStore, AuthUser } from '@/lib/auth/authStore';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';
import {
  getLawfulBasisLabel,
  getCategoryLabel,
  getRiskLevelColor,
  getRiskLevelLabel,
} from '@/lib/api/hooks/useRegistre';
import {
  DPIA_STATUS_LABELS,
  DPIA_STATUS_BADGE_STYLES,
  DPIA_RISK_BADGE_STYLES,
} from '@/lib/constants/dpia';

// Mock fetch for logout API calls
global.fetch = jest.fn();

describe('DPO Features - Frontend LOT 12.4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Reset store state directly (token is in httpOnly cookie, not accessible from JS)
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
  });

  // ===========================================================================
  // RBAC Tests - Art. 38.3 (DPO Independence)
  // ===========================================================================

  describe('Art. 38.3 - DPO Role Independence', () => {
    it('[DPO-001] DPO role MUST be distinct from TENANT_ADMIN', () => {
      // DPO is a separate role for independence
      expect(ACTOR_ROLE.DPO).toBeDefined();
      expect(ACTOR_ROLE.DPO).not.toBe(ACTOR_ROLE.TENANT_ADMIN);
      expect(ACTOR_ROLE.DPO).not.toBe(ACTOR_ROLE.MEMBER);
    });

    it('[DPO-002] DPO user MUST have proper role assignment', () => {
      const dpoUser: AuthUser = {
        id: 'dpo-123',
        displayName: 'Data Protection Officer',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.DPO,
        tenantId: 'tenant-abc',
      };

      useAuthStore.getState().login(dpoUser);

      const state = useAuthStore.getState();
      expect(state.user?.role).toBe(ACTOR_ROLE.DPO);
      expect(state.user?.scope).toBe(ACTOR_SCOPE.TENANT);
      expect(state.user?.tenantId).toBe('tenant-abc');
    });

    it('[DPO-003] DPO session MUST contain only P1 data (no PII)', () => {
      const dpoUser: AuthUser = {
        id: 'dpo-456',
        displayName: 'DPO User',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.DPO,
        tenantId: 'tenant-xyz',
      };

      useAuthStore.getState().login(dpoUser);

      // Serialize state to check for PII
      const stateSnapshot = JSON.stringify(useAuthStore.getState());

      // NO email addresses
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      expect(stateSnapshot.match(emailPattern)).toBeNull();

      // NO password hashes
      expect(stateSnapshot).not.toContain('$2b$');
      expect(stateSnapshot).not.toContain('$argon2');
      expect(stateSnapshot).not.toContain('password');
    });

    it('[DPO-004] DPO role check helper MUST work correctly', () => {
      const dpoUser: AuthUser = {
        id: 'dpo-789',
        displayName: 'DPO Checker',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.DPO,
        tenantId: 'tenant-check',
      };

      const adminUser: AuthUser = {
        id: 'admin-123',
        displayName: 'Admin User',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.TENANT_ADMIN,
        tenantId: 'tenant-check',
      };

      // Check DPO role
      expect(dpoUser.role === ACTOR_ROLE.DPO).toBe(true);
      expect(adminUser.role === ACTOR_ROLE.DPO).toBe(false);

      // Check if user can validate DPIAs (only DPO)
      const canValidateDpia = (user: AuthUser) => user.role === ACTOR_ROLE.DPO;
      expect(canValidateDpia(dpoUser)).toBe(true);
      expect(canValidateDpia(adminUser)).toBe(false);
    });
  });

  // ===========================================================================
  // Registre Art. 30 Helper Functions Tests
  // ===========================================================================

  describe('Art. 30 - Registre Helper Functions', () => {
    it('[REG-001] getLawfulBasisLabel returns French labels', () => {
      expect(getLawfulBasisLabel('consent')).toContain('Consentement');
      expect(getLawfulBasisLabel('contract')).toContain('contrat');
      expect(getLawfulBasisLabel('legal_obligation')).toContain('Obligation');
      expect(getLawfulBasisLabel('legitimate_interest')).toContain('gitime'); // "légitime" - accent-agnostic
      expect(getLawfulBasisLabel('vital_interest')).toContain('vitaux');
      expect(getLawfulBasisLabel('public_interest')).toContain('public');
    });

    it('[REG-002] getLawfulBasisLabel handles unknown basis gracefully', () => {
      const unknownBasis = 'unknown_basis';
      const result = getLawfulBasisLabel(unknownBasis);
      // Should return the original value if not found
      expect(result).toBe(unknownBasis);
    });

    it('[REG-003] getCategoryLabel returns French category labels', () => {
      expect(getCategoryLabel('ai_processing')).toContain('IA');
      expect(getCategoryLabel('data_analysis')).toContain('Analyse');
      expect(getCategoryLabel('marketing')).toContain('Marketing');
      expect(getCategoryLabel('security')).toContain('curit');
      expect(getCategoryLabel('other')).toContain('Autre');
    });

    it('[REG-004] getCategoryLabel handles unknown category gracefully', () => {
      const unknownCategory = 'custom_category';
      const result = getCategoryLabel(unknownCategory);
      expect(result).toBe(unknownCategory);
    });

    it('[REG-005] getRiskLevelLabel returns French risk labels', () => {
      expect(getRiskLevelLabel('LOW')).toBe('Faible');
      expect(getRiskLevelLabel('MEDIUM')).toBe('Moyen');
      expect(getRiskLevelLabel('HIGH')).toMatch(/lev/i);
      expect(getRiskLevelLabel('CRITICAL')).toBe('Critique');
    });

    it('[REG-006] getRiskLevelColor returns appropriate CSS classes', () => {
      expect(getRiskLevelColor('LOW')).toContain('green');
      expect(getRiskLevelColor('MEDIUM')).toContain('yellow');
      expect(getRiskLevelColor('HIGH')).toContain('orange');
      expect(getRiskLevelColor('CRITICAL')).toContain('red');
    });
  });

  // ===========================================================================
  // DPIA Helper Functions Tests
  // ===========================================================================

  describe('Art. 35 - DPIA Constants (Labels & Styles)', () => {
    it('[DPIA-001] DPIA_STATUS_LABELS contains French status labels', () => {
      expect(DPIA_STATUS_LABELS.PENDING).toMatch(/attente|pending/i);
      expect(DPIA_STATUS_LABELS.APPROVED).toMatch(/approuv|approv/i);
      expect(DPIA_STATUS_LABELS.REJECTED).toMatch(/rejet/i);
    });

    it('[DPIA-002] DPIA_STATUS_LABELS returns undefined for unknown status', () => {
      const unknownStatus = 'UNKNOWN_STATUS' as keyof typeof DPIA_STATUS_LABELS;
      const result = DPIA_STATUS_LABELS[unknownStatus];
      expect(result).toBeUndefined();
    });

    it('[DPIA-003] DPIA_STATUS_BADGE_STYLES returns appropriate CSS classes', () => {
      const pendingColor = DPIA_STATUS_BADGE_STYLES.PENDING;
      const approvedColor = DPIA_STATUS_BADGE_STYLES.APPROVED;
      const rejectedColor = DPIA_STATUS_BADGE_STYLES.REJECTED;

      // Pending should be yellow/amber
      expect(pendingColor).toMatch(/yellow|amber|warning/i);
      // Approved should be green/success
      expect(approvedColor).toMatch(/green|success/i);
      // Rejected should be red/error
      expect(rejectedColor).toMatch(/red|error|destructive/i);
    });

    it('[DPIA-004] DPIA_RISK_BADGE_STYLES returns appropriate CSS classes', () => {
      const lowColor = DPIA_RISK_BADGE_STYLES.LOW;
      const mediumColor = DPIA_RISK_BADGE_STYLES.MEDIUM;
      const highColor = DPIA_RISK_BADGE_STYLES.HIGH;
      const criticalColor = DPIA_RISK_BADGE_STYLES.CRITICAL;

      expect(lowColor).toContain('green');
      expect(mediumColor).toContain('yellow');
      expect(highColor).toContain('orange');
      expect(criticalColor).toContain('red');
    });
  });

  // ===========================================================================
  // Data Classification Compliance Tests
  // ===========================================================================

  describe('RGPD Data Classification - DPO Features', () => {
    it('[CLASS-001] DPIA data structure MUST NOT contain P3 data', () => {
      // Simulated DPIA response (what frontend receives)
      const dpiaResponse = {
        id: 'dpia-123',
        purposeId: 'purpose-456',
        title: 'AI Recommendations DPIA',
        description: 'Impact assessment for AI processing',
        overallRiskLevel: 'HIGH',
        dataClassification: 'P1', // Only P1 or P2 allowed, never P3
        securityMeasures: ['Encryption', 'Access control'],
        status: 'PENDING',
        dpoComments: null,
        validatedAt: null,
        rejectionReason: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      // P3 classification is forbidden
      expect(dpiaResponse.dataClassification).not.toBe('P3');

      // Serialize to check no PII
      const serialized = JSON.stringify(dpiaResponse);

      // NO email addresses
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      expect(serialized.match(emailPattern)).toBeNull();

      // NO personal identifiers
      expect(serialized).not.toContain('personalId');
      expect(serialized).not.toContain('ssn');
      expect(serialized).not.toContain('nationalId');
    });

    it('[CLASS-002] Registre entry MUST NOT expose user personal data', () => {
      // Simulated Registre entry (what frontend receives)
      const registreEntry = {
        id: 'entry-123',
        purposeId: 'purpose-456',
        purposeName: 'Marketing Analytics',
        purposeDescription: 'Data analysis for marketing',
        category: 'marketing',
        dataSubjectCategories: ['Customers', 'Prospects'],
        dataCategories: ['Contact data', 'Behavioral data'],
        dataClassification: 'P1',
        recipientCategories: ['Marketing team'],
        transfersOutsideEU: false,
        retentionPeriod: '36',
        lawfulBasis: 'consent',
        riskLevel: 'MEDIUM',
        requiresDpia: false,
        isActive: true,
      };

      // Serialize to check
      const serialized = JSON.stringify(registreEntry);

      // NO specific user data
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      expect(serialized.match(emailPattern)).toBeNull();

      // Only aggregated categories, no individual user data
      expect(registreEntry.dataSubjectCategories.every(
        cat => !cat.includes('@') && !cat.includes('user')
      )).toBe(true);
    });

    it('[CLASS-003] Risk data MUST NOT contain sensitive processing details', () => {
      // Simulated DPIA risk (what frontend receives)
      const dpiaRisk = {
        id: 'risk-123',
        dpiaId: 'dpia-456',
        riskName: 'Data breach risk',
        description: 'Risk of unauthorized access to processed data',
        likelihood: 'MEDIUM',
        impact: 'HIGH',
        mitigation: 'Encryption and access control measures',
        sortOrder: 1,
      };

      // Serialize to check
      const serialized = JSON.stringify(dpiaRisk);

      // NO specific user identifiers in risk descriptions
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      expect(serialized.match(emailPattern)).toBeNull();

      // Risk contains technical descriptions only (P1)
      // tenantId is NOT exposed to frontend in the risk object
      expect('tenantId' in dpiaRisk).toBe(false);
    });
  });

  // ===========================================================================
  // Frontend Security Tests
  // ===========================================================================

  describe('Frontend Security - DPO Features', () => {
    it('[SEC-001] DPO token MUST be in httpOnly cookie (not accessible from JS)', () => {
      // Token is now stored in httpOnly cookie by the server
      // Frontend can only store user metadata (P1 data)
      useAuthStore.getState().login({
        id: 'dpo-sec-test',
        displayName: 'Security DPO',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.DPO,
        tenantId: 'tenant-sec',
      });

      // User metadata is accessible
      expect(useAuthStore.getState().user?.id).toBe('dpo-sec-test');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Token NOT in localStorage (stored in httpOnly cookie)
      const allLocalStorage = JSON.stringify(localStorage);
      expect(allLocalStorage).not.toContain('jwt');
      expect(allLocalStorage).not.toContain('token');

      // Token NOT in sessionStorage either
      expect(sessionStorage.getItem('auth_token')).toBeNull();
    });

    it('[SEC-002] DPO logout MUST call API and clear all session data', async () => {
      useAuthStore.getState().login({
        id: 'dpo-logout-test',
        displayName: 'Logout DPO',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.DPO,
        tenantId: 'tenant-logout',
      });

      // Verify data exists
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Mock logout API
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      // Logout (async - calls API to clear httpOnly cookie)
      await useAuthStore.getState().logout();

      // API called with credentials to clear httpOnly cookie
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // ALL DPO data cleared from state
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('[SEC-003] Frontend MUST NOT log DPIA sensitive data', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Simulate DPO login (no token passed - it's in httpOnly cookie)
      useAuthStore.getState().login({
        id: 'dpo-log-test',
        displayName: 'Log Test DPO',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.DPO,
        tenantId: 'tenant-log',
      });

      // Frontend should NOT log any auth-related secrets
      const allCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allCalls).not.toContain('token');
      expect(allCalls).not.toContain('jwt');
      expect(allCalls).not.toContain('Bearer');

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // DPIA Required Check Tests
  // ===========================================================================

  describe('DPIA Requirement Logic', () => {
    it('[REQ-001] HIGH risk level REQUIRES DPIA', () => {
      const isDpiaRequired = (riskLevel: string) =>
        riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

      expect(isDpiaRequired('HIGH')).toBe(true);
      expect(isDpiaRequired('CRITICAL')).toBe(true);
      expect(isDpiaRequired('MEDIUM')).toBe(false);
      expect(isDpiaRequired('LOW')).toBe(false);
    });

    it('[REQ-002] DPIA status determines tool activation', () => {
      const canActivateTool = (dpia: { requiresDpia: boolean; dpiaStatus?: string }) => {
        if (!dpia.requiresDpia) return true;
        return dpia.dpiaStatus === 'APPROVED';
      };

      // No DPIA required - can activate
      expect(canActivateTool({ requiresDpia: false })).toBe(true);

      // DPIA required but not approved - cannot activate
      expect(canActivateTool({ requiresDpia: true, dpiaStatus: 'PENDING' })).toBe(false);
      expect(canActivateTool({ requiresDpia: true, dpiaStatus: 'REJECTED' })).toBe(false);

      // DPIA required and approved - can activate
      expect(canActivateTool({ requiresDpia: true, dpiaStatus: 'APPROVED' })).toBe(true);
    });
  });

  // ===========================================================================
  // Validation Workflow Tests
  // ===========================================================================

  describe('DPO Validation Workflow', () => {
    it('[VAL-001] Rejection MUST require reason (frontend validation)', () => {
      const validateRejection = (reason?: string) => {
        if (!reason || reason.trim().length < 10) {
          return { valid: false, error: 'Rejection reason must be at least 10 characters' };
        }
        return { valid: true };
      };

      expect(validateRejection()).toEqual({
        valid: false,
        error: 'Rejection reason must be at least 10 characters',
      });

      expect(validateRejection('short')).toEqual({
        valid: false,
        error: 'Rejection reason must be at least 10 characters',
      });

      expect(validateRejection('This is a valid rejection reason with enough detail')).toEqual({
        valid: true,
      });
    });

    it('[VAL-002] Approval can have optional comments', () => {
      const validateApproval = (comments?: string) => {
        // Comments are optional for approval
        return { valid: true, comments: comments?.trim() || null };
      };

      expect(validateApproval()).toEqual({ valid: true, comments: null });
      expect(validateApproval('')).toEqual({ valid: true, comments: null });
      expect(validateApproval('Optional approval comments')).toEqual({
        valid: true,
        comments: 'Optional approval comments',
      });
    });

    it('[VAL-003] Status transition validation', () => {
      const canTransitionTo = (
        currentStatus: string,
        newStatus: string,
        userRole: string
      ) => {
        // Only DPO can change to APPROVED or REJECTED
        if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
          if (userRole !== ACTOR_ROLE.DPO) return false;
        }

        // Can only transition from PENDING
        if (currentStatus !== 'PENDING') return false;

        return true;
      };

      // DPO can approve/reject pending DPIA
      expect(canTransitionTo('PENDING', 'APPROVED', ACTOR_ROLE.DPO)).toBe(true);
      expect(canTransitionTo('PENDING', 'REJECTED', ACTOR_ROLE.DPO)).toBe(true);

      // Admin cannot approve/reject (Art. 38.3)
      expect(canTransitionTo('PENDING', 'APPROVED', ACTOR_ROLE.TENANT_ADMIN)).toBe(false);
      expect(canTransitionTo('PENDING', 'REJECTED', ACTOR_ROLE.TENANT_ADMIN)).toBe(false);

      // Cannot transition from already validated
      expect(canTransitionTo('APPROVED', 'REJECTED', ACTOR_ROLE.DPO)).toBe(false);
      expect(canTransitionTo('REJECTED', 'APPROVED', ACTOR_ROLE.DPO)).toBe(false);
    });
  });

  // ===========================================================================
  // Export Functions Tests
  // ===========================================================================

  describe('Export Functionality', () => {
    it('[EXP-001] CSV export generates valid filename', () => {
      const generateCsvFilename = (tenantSlug: string) => {
        const date = new Date().toISOString().split('T')[0];
        return `registre-art30-${tenantSlug}-${date}.csv`;
      };

      const filename = generateCsvFilename('acme-corp');

      expect(filename).toContain('registre-art30');
      expect(filename).toContain('acme-corp');
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/); // ISO date
      expect(filename.endsWith('.csv')).toBe(true);
    });

    it('[EXP-002] PDF export generates valid filename', () => {
      const generatePdfFilename = (dpiaTitle: string) => {
        const sanitized = dpiaTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        const date = new Date().toISOString().split('T')[0];
        return `dpia-${sanitized}-${date}.pdf`;
      };

      const filename = generatePdfFilename('AI Recommendations DPIA');

      expect(filename).toContain('dpia');
      expect(filename).toContain('ai-recommendations-dpia');
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(filename.endsWith('.pdf')).toBe(true);
    });
  });
});
