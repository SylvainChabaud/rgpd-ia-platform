import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgPurposeRepo } from '@/infrastructure/repositories/PgPurposeRepo';
import { PgDpiaRepo } from '@/infrastructure/repositories/PgDpiaRepo';
import {
  buildRegistreEntry,
  toPublicRegistreEntry,
  type RegistreEntry,
  PURPOSE_CATEGORY,
  LAWFUL_BASIS,
} from '@/domain/dpia';
import { logger } from '@/infrastructure/logging/logger';

/**
 * GET /api/tenants/:id/registre
 * LOT 12.4 - DPO: Registre des traitements Art. 30
 *
 * RGPD compliance:
 * - Art. 30: Registre des activites de traitement
 * - Art. 38.3: DPO access required
 * - Tenant isolation enforced
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId } = await params;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // RBAC: DPO, TENANT_ADMIN, or SUPERADMIN
    const hasPermission = requirePermission(
      authResult.user,
      ['registre:read'],
      { allowedRoles: [ACTOR_ROLE.DPO, ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.SUPERADMIN] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: DPO or Admin role required' },
        { status: 403 }
      );
    }

    // CRITICAL: Tenant isolation
    if (
      (authResult.user.role === ACTOR_ROLE.TENANT_ADMIN || authResult.user.role === ACTOR_ROLE.DPO) &&
      authResult.user.tenantId !== tenantId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Tenant mismatch' },
        { status: 403 }
      );
    }

    // Fetch purposes for tenant
    const purposeRepo = new PgPurposeRepo();
    const dpiaRepo = new PgDpiaRepo();

    const purposes = await purposeRepo.findAll(tenantId, true); // Include inactive for full registre
    const dpias = await dpiaRepo.findAllWithPurposeInfo(tenantId);

    // Build registre entries from purposes
    const registreEntries: RegistreEntry[] = purposes.map((purpose) => {
      // Find associated DPIA if exists
      const dpia = dpias.find((d) => d.purposeId === purpose.id);

      return buildRegistreEntry({
        tenantId,
        purposeId: purpose.id,
        purposeName: purpose.label,
        purposeDescription: purpose.description,
        category: mapPurposeCategory(purpose.category),
        lawfulBasis: mapLawfulBasis(purpose.lawfulBasis),
        riskLevel: mapRiskLevel(purpose.riskLevel),
        dataClassification: mapDataClass(purpose.maxDataClass),
        requiresDpia: purpose.requiresDpia,
        isActive: purpose.isActive,
        activatedAt: purpose.isActive ? purpose.createdAt : null,
        createdAt: purpose.createdAt,
        updatedAt: purpose.updatedAt,
        dpiaId: dpia?.id,
        dpiaStatus: dpia?.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
      });
    });

    // Calculate stats
    // IMPORTANT: Purposes with requiresDpia=true but no DPIA created yet
    // should be counted as "pending" (DPIA is required but not started)
    const stats = {
      total: registreEntries.length,
      active: registreEntries.filter((e) => e.isActive).length,
      inactive: registreEntries.filter((e) => !e.isActive).length,
      requiresDpia: registreEntries.filter((e) => e.requiresDpia).length,
      dpiaApproved: registreEntries.filter((e) => e.dpiaStatus === 'APPROVED').length,
      dpiaPending: registreEntries.filter((e) =>
        e.requiresDpia && (e.dpiaStatus === 'PENDING' || !e.dpiaStatus)
      ).length,
      byCategory: {
        ai_processing: registreEntries.filter((e) => e.category === PURPOSE_CATEGORY.AI_PROCESSING).length,
        data_analysis: registreEntries.filter((e) => e.category === PURPOSE_CATEGORY.DATA_ANALYSIS).length,
        marketing: registreEntries.filter((e) => e.category === PURPOSE_CATEGORY.MARKETING).length,
        security: registreEntries.filter((e) => e.category === PURPOSE_CATEGORY.SECURITY).length,
        other: registreEntries.filter((e) =>
          !['ai_processing', 'data_analysis', 'marketing', 'security'].includes(e.category)
        ).length,
      },
      byLawfulBasis: {
        consent: registreEntries.filter((e) => e.lawfulBasis === LAWFUL_BASIS.CONSENT).length,
        contract: registreEntries.filter((e) => e.lawfulBasis === LAWFUL_BASIS.CONTRACT).length,
        legitimate_interest: registreEntries.filter((e) => e.lawfulBasis === LAWFUL_BASIS.LEGITIMATE_INTEREST).length,
        legal_obligation: registreEntries.filter((e) => e.lawfulBasis === LAWFUL_BASIS.LEGAL_OBLIGATION).length,
      },
    };

    // Audit log (P1 data only)
    logger.info({
      event: 'registre.viewed',
      tenantId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      count: registreEntries.length,
    }, 'DPO viewed Registre Art. 30');

    return NextResponse.json(
      {
        entries: registreEntries.map(toPublicRegistreEntry),
        stats,
        total: registreEntries.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'registre.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/registre error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions to map purpose fields to registre fields

function mapPurposeCategory(category: string): RegistreEntry['category'] {
  const normalizedCategory = category.toLowerCase();
  const mapping: Record<string, RegistreEntry['category']> = {
    ai_processing: PURPOSE_CATEGORY.AI_PROCESSING,
    data_analysis: PURPOSE_CATEGORY.DATA_ANALYSIS,
    marketing: PURPOSE_CATEGORY.MARKETING,
    security: PURPOSE_CATEGORY.SECURITY,
    legal_compliance: PURPOSE_CATEGORY.LEGAL_COMPLIANCE,
    customer_service: PURPOSE_CATEGORY.CUSTOMER_SERVICE,
    research: PURPOSE_CATEGORY.RESEARCH,
    analytics: PURPOSE_CATEGORY.DATA_ANALYSIS, // Alias for ANALYTICS category
    essential: PURPOSE_CATEGORY.SECURITY, // Alias for ESSENTIAL category
  };
  return mapping[normalizedCategory] || PURPOSE_CATEGORY.OTHER;
}

function mapLawfulBasis(basis: string): RegistreEntry['lawfulBasis'] {
  const normalizedBasis = basis.toLowerCase();
  const mapping: Record<string, RegistreEntry['lawfulBasis']> = {
    consent: LAWFUL_BASIS.CONSENT,
    contract: LAWFUL_BASIS.CONTRACT,
    legal_obligation: LAWFUL_BASIS.LEGAL_OBLIGATION,
    vital_interest: LAWFUL_BASIS.VITAL_INTEREST,
    public_interest: LAWFUL_BASIS.PUBLIC_INTEREST,
    legitimate_interest: LAWFUL_BASIS.LEGITIMATE_INTEREST,
  };
  return mapping[normalizedBasis] || LAWFUL_BASIS.CONSENT;
}

function mapRiskLevel(riskLevel: string): RegistreEntry['riskLevel'] {
  const mapping: Record<string, RegistreEntry['riskLevel']> = {
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
    critical: 'CRITICAL',
  };
  return mapping[riskLevel.toLowerCase()] || 'MEDIUM';
}

function mapDataClass(dataClass: string): RegistreEntry['dataClassification'] {
  const mapping: Record<string, RegistreEntry['dataClassification']> = {
    P0: 'P0',
    P1: 'P1',
    P2: 'P2',
    P3: 'P3',
  };
  return mapping[dataClass] || 'P1';
}
