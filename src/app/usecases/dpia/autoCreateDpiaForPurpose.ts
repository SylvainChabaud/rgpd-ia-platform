/**
 * Auto-Create DPIA for High-Risk Purpose
 * LOT 12.4 - DPO Features
 *
 * Creates a DPIA automatically when a purpose is created with:
 * - Risk level HIGH or CRITICAL
 * - Max data class P3 (sensitive data)
 *
 * RGPD Art. 35: DPIA required for high-risk processing
 *
 * @returns DPIA ID if created, null if not required or on error
 */

import { ACTOR_SCOPE } from '@/shared/actorScope';
import { RISK_LEVEL, DATA_CLASS } from '@/app/ports/PurposeTemplateRepo';
import type { DpiaRepo } from '@/app/ports/DpiaRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { Logger } from '@/app/ports/Logger';
import type { DataClassification } from '@/domain/dpia';

export interface AutoCreateDpiaInput {
  tenantId: string;
  actorId: string;
  purpose: {
    id: string;
    label: string;
    description: string;
    riskLevel: string;
    maxDataClass: string;
    requiresDpia: boolean;
  };
  /** Optional context for logging (e.g., templateCode for adopted templates) */
  context?: {
    templateCode?: string;
    source?: 'adopt' | 'custom';
  };
}

export interface AutoCreateDpiaResult {
  dpiaId: string | null;
  warnings: string[];
}

/**
 * Dependencies for autoCreateDpiaForPurpose
 * Injected from API routes - never instantiated in usecase
 */
export interface AutoCreateDpiaDeps {
  dpiaRepo: DpiaRepo;
  auditWriter: AuditEventWriter;
  logger: Logger;
}

/**
 * Determines if a DPIA is required based on risk level and data class
 */
export function isDpiaRequired(riskLevel: string, maxDataClass: string): boolean {
  const highRiskLevels = [RISK_LEVEL.HIGH, RISK_LEVEL.CRITICAL];
  const isHighRisk = highRiskLevels.includes(riskLevel as typeof RISK_LEVEL.HIGH);
  const isSensitiveData = maxDataClass === DATA_CLASS.P3;
  return isHighRisk || isSensitiveData;
}

/**
 * Auto-creates a DPIA for a high-risk purpose
 *
 * @param input - Purpose and context information
 * @param deps - Injected dependencies (repositories, logger)
 * @returns Result with DPIA ID (or null) and warnings
 */
export async function autoCreateDpiaForPurpose(
  input: AutoCreateDpiaInput,
  deps: AutoCreateDpiaDeps
): Promise<AutoCreateDpiaResult> {
  const { tenantId, actorId, purpose, context } = input;
  const { dpiaRepo, auditWriter, logger } = deps;

  // Check if DPIA is required
  if (!purpose.requiresDpia && !isDpiaRequired(purpose.riskLevel, purpose.maxDataClass)) {
    return { dpiaId: null, warnings: [] };
  }

  try {

    // Determine overall risk level for DPIA
    const overallRiskLevel = purpose.riskLevel === RISK_LEVEL.CRITICAL ? 'CRITICAL' : 'HIGH';

    // Create DPIA
    const dpia = await dpiaRepo.create(tenantId, {
      tenantId,
      purposeId: purpose.id,
      title: `DPIA: ${purpose.label}`,
      description: purpose.description,
      overallRiskLevel,
      dataProcessed: [],
      dataClassification: purpose.maxDataClass as DataClassification,
      securityMeasures: [],
    });

    // Emit audit event
    await auditWriter.write({
      id: crypto.randomUUID(),
      eventName: 'dpia.auto_created',
      actorScope: ACTOR_SCOPE.TENANT,
      actorId,
      targetId: dpia.id,
      tenantId,
      metadata: {
        purposeId: purpose.id,
        purposeLabel: purpose.label,
        riskLevel: overallRiskLevel,
        status: 'PENDING',
        source: context?.source || 'unknown',
        ...(context?.templateCode && { templateCode: context.templateCode }),
      },
    });

    // Log success (P1 data only)
    logger.info({
      dpiaId: dpia.id,
      purposeId: purpose.id,
      tenantId,
      riskLevel: overallRiskLevel,
      source: context?.source,
    }, 'DPIA auto-created for high-risk purpose');

    return {
      dpiaId: dpia.id,
      warnings: [
        'Une Analyse d\'Impact (DPIA) a été automatiquement créée en statut PENDING. Votre DPO doit la valider avant mise en production.',
      ],
    };
  } catch (error) {
    // Log error but don't fail the purpose creation
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({
      purposeId: purpose.id,
      tenantId,
      error: errorMsg,
      source: context?.source,
    }, 'Failed to auto-create DPIA for high-risk purpose');

    return {
      dpiaId: null,
      warnings: [],
    };
  }
}
