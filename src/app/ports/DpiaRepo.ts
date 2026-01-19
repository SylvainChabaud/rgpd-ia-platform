/**
 * DpiaRepo port
 * LOT 12.4 - Fonctionnalités DPO (DPIA + Registre Art. 30)
 *
 * Classification: P1 (technical metadata, no personal data)
 * Purpose: manage DPIA records for tenant purposes
 * Retention: tenant lifetime (Art. 35 documentation)
 *
 * CRITICAL RGPD:
 * - ALL operations MUST include tenantId (strict isolation)
 * - DPIAs are tenant-specific, linked to purposes
 * - Art. 35: DPIA required for HIGH/CRITICAL risk processing
 * - Art. 38.3: Only DPO can validate/reject DPIAs
 */

import type {
  Dpia,
  DpiaRisk,
  DpiaStatus,
  DpiaRiskLevel,
  CreateDpiaInput,
  CreateDpiaRiskInput,
  UpdateDpiaInput,
} from '@/domain/dpia';

// =============================================================================
// Re-export domain types
// =============================================================================

export type {
  Dpia,
  DpiaRisk,
  DpiaStatus,
  DpiaRiskLevel,
  CreateDpiaInput,
  CreateDpiaRiskInput,
  UpdateDpiaInput,
};

// =============================================================================
// Additional query types
// =============================================================================

export interface DpiaListParams {
  status?: DpiaStatus;
  riskLevel?: DpiaRiskLevel;
  purposeId?: string;
  limit?: number;
  offset?: number;
}

export interface DpiaStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  byRiskLevel: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

// =============================================================================
// DpiaRepo interface
// =============================================================================

export interface DpiaRepo {
  // =========================================================================
  // DPIA Operations
  // =========================================================================

  /**
   * List all DPIAs for tenant
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param params - Optional filter/pagination params
   * @returns List of DPIAs (without risks, use findById for full details)
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  findAll(tenantId: string, params?: DpiaListParams): Promise<Dpia[]>;

  /**
   * Find DPIA by ID (with risks)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - DPIA identifier
   * @returns DPIA with risks or null if not found
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  findById(tenantId: string, id: string): Promise<Dpia | null>;

  /**
   * Find DPIA by purpose ID
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param purposeId - Purpose identifier
   * @returns DPIA or null if not found
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  findByPurposeId(tenantId: string, purposeId: string): Promise<Dpia | null>;

  /**
   * Find DPIAs by multiple purpose IDs (batch query)
   * Use this to avoid N+1 queries when loading DPIAs for multiple purposes
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param purposeIds - Array of purpose identifiers
   * @returns Array of DPIAs found (may be fewer than input if some purposes have no DPIA)
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  findByPurposeIds(tenantId: string, purposeIds: string[]): Promise<Dpia[]>;

  /**
   * Create new DPIA
   * Auto-generates risks based on risk level template
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param input - DPIA data
   * @returns Created DPIA with risks
   * @throws Error if tenantId is empty (RGPD blocker)
   * @throws Error if DPIA already exists for purpose
   */
  create(tenantId: string, input: CreateDpiaInput): Promise<Dpia>;

  /**
   * Update DPIA (editable fields only)
   * Only title, description, dpoComments, securityMeasures are editable
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - DPIA identifier
   * @param input - Fields to update
   * @returns Updated DPIA or null if not found
   * @throws Error if tenantId is empty (RGPD blocker)
   * @throws Error if DPIA is already validated (approved/rejected)
   */
  update(tenantId: string, id: string, input: UpdateDpiaInput): Promise<Dpia | null>;

  /**
   * Validate DPIA (DPO only)
   * Approves or rejects DPIA with DPO comments
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - DPIA identifier
   * @param validatedBy - DPO user ID
   * @param status - APPROVED or REJECTED
   * @param dpoComments - Optional DPO comments
   * @param rejectionReason - Required if status is REJECTED
   * @returns Validated DPIA or null if not found
   * @throws Error if tenantId is empty (RGPD blocker)
   * @throws Error if DPIA is already validated
   * @throws Error if rejectionReason is missing for REJECTED status
   */
  validate(
    tenantId: string,
    id: string,
    validatedBy: string,
    status: 'APPROVED' | 'REJECTED',
    dpoComments?: string,
    rejectionReason?: string
  ): Promise<Dpia | null>;

  /**
   * Soft delete DPIA
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - DPIA identifier
   * @returns true if deleted, false if not found
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  softDelete(tenantId: string, id: string): Promise<boolean>;

  /**
   * Get DPIA statistics for tenant
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns Stats aggregates (P1 data only)
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  getStats(tenantId: string): Promise<DpiaStats>;

  // =========================================================================
  // Risk Operations
  // =========================================================================

  /**
   * List risks for a DPIA
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param dpiaId - DPIA identifier
   * @returns List of risks ordered by sortOrder
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  findRisksByDpiaId(tenantId: string, dpiaId: string): Promise<DpiaRisk[]>;

  /**
   * Add risk to DPIA
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param input - Risk data
   * @returns Created risk
   * @throws Error if tenantId is empty (RGPD blocker)
   * @throws Error if DPIA not found
   */
  createRisk(tenantId: string, input: CreateDpiaRiskInput): Promise<DpiaRisk>;

  /**
   * Update risk
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param riskId - Risk identifier
   * @param input - Fields to update
   * @returns Updated risk or null if not found
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  updateRisk(
    tenantId: string,
    riskId: string,
    input: Partial<Omit<CreateDpiaRiskInput, 'dpiaId' | 'tenantId'>>
  ): Promise<DpiaRisk | null>;

  /**
   * Delete risk
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param riskId - Risk identifier
   * @returns true if deleted, false if not found
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  deleteRisk(tenantId: string, riskId: string): Promise<boolean>;

  // =========================================================================
  // Registre Art. 30 Helpers
  // =========================================================================

  /**
   * Get all DPIAs with their linked purpose info (for registre)
   * Includes purpose label for display
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns DPIAs with purpose info
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  findAllWithPurposeInfo(tenantId: string): Promise<Dpia[]>;

  // =========================================================================
  // Revision Request (LOT 12.4)
  // =========================================================================

  /**
   * Request revision of a rejected DPIA
   * Tenant Admin can request DPO to re-review a rejected DPIA
   * This resets status to PENDING and records revision request info
   *
   * RGPD: Art. 35.11 - Review required when processing changes
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param dpiaId - DPIA identifier
   * @param requestedBy - Tenant Admin user ID
   * @param revisionComments - Comments explaining corrections made
   * @returns Updated DPIA or null if not found
   * @throws Error if tenantId is empty (RGPD blocker)
   * @throws Error if DPIA is not in REJECTED status
   * @throws Error if revisionComments is too short (< 10 chars)
   */
  requestRevision(
    tenantId: string,
    dpiaId: string,
    requestedBy: string,
    revisionComments: string
  ): Promise<Dpia | null>;
}
