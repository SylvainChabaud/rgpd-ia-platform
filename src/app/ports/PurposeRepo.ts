/**
 * PurposeRepo port
 * LOT 12.2 - Gestion Consentements (Purposes + Tracking)
 *
 * Classification: P1 (technical metadata, no personal data)
 * Purpose: manage configurable AI processing purposes per tenant
 * Retention: tenant lifetime
 *
 * CRITICAL RGPD:
 * - ALL operations MUST include tenantId (strict isolation)
 * - Purposes are tenant-specific, not shared across tenants
 * - Each purpose MUST have a lawful basis (Art. 6 RGPD)
 * - System purposes (from templates) cannot be deleted
 */

import {
  LawfulBasis,
  PurposeCategory,
  RiskLevel,
  DataClass,
  ValidationStatus,
} from './PurposeTemplateRepo';

// Re-export types for convenience
export type { LawfulBasis, PurposeCategory, RiskLevel, DataClass, ValidationStatus };

export interface Purpose {
  id: string;
  tenantId: string;
  templateId: string | null;
  label: string;
  description: string;
  // RGPD fields (Art. 6)
  lawfulBasis: LawfulBasis;
  category: PurposeCategory;
  riskLevel: RiskLevel;
  maxDataClass: DataClass;
  requiresDpia: boolean;
  // Configuration
  isRequired: boolean;
  isActive: boolean;
  isFromTemplate: boolean;
  isSystem: boolean;
  validationStatus: ValidationStatus;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreatePurposeInput {
  label: string;
  description: string;
  lawfulBasis: LawfulBasis;
  category?: PurposeCategory;
  riskLevel?: RiskLevel;
  maxDataClass?: DataClass;
  requiresDpia?: boolean;
  isRequired?: boolean;
  isActive?: boolean;
}

export interface CreatePurposeFromTemplateInput {
  templateId: string;
  label?: string;        // Override template label
  description?: string;  // Override template description
  isRequired?: boolean;
}

export interface UpdatePurposeInput {
  label?: string;
  description?: string;
  isRequired?: boolean;
  isActive?: boolean;
  // Note: lawfulBasis, category, riskLevel are immutable for system purposes
}

export interface PurposeRepo {
  /**
   * List all active purposes for tenant
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param includeInactive - Include deactivated purposes (default: false)
   * @returns List of purposes
   */
  findAll(tenantId: string, includeInactive?: boolean): Promise<Purpose[]>;

  /**
   * Find purpose by ID
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - purpose identifier
   * @returns Purpose or null if not found
   */
  findById(tenantId: string, id: string): Promise<Purpose | null>;

  /**
   * Find purpose by label (for uniqueness check)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param label - purpose label
   * @returns Purpose or null if not found
   */
  findByLabel(tenantId: string, label: string): Promise<Purpose | null>;

  /**
   * Create new purpose
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param input - purpose data
   * @returns Created purpose
   * @throws Error if tenantId is empty (RGPD blocker)
   * @throws Error if label already exists for tenant
   */
  create(tenantId: string, input: CreatePurposeInput): Promise<Purpose>;

  /**
   * Update purpose
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - purpose identifier
   * @param input - purpose data to update
   * @returns Updated purpose or null if not found
   */
  update(tenantId: string, id: string, input: UpdatePurposeInput): Promise<Purpose | null>;

  /**
   * Soft delete purpose (deactivate)
   * Marks purpose as deleted without removing data
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - purpose identifier
   * @returns true if deleted, false if not found
   */
  softDelete(tenantId: string, id: string): Promise<boolean>;

  /**
   * Count consents for a purpose
   * Useful to warn before deleting a purpose with existing consents
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param purposeId - purpose identifier
   * @returns Number of consents linked to this purpose
   */
  countConsents(tenantId: string, purposeId: string): Promise<number>;

  // =========================
  // Template-related methods
  // =========================

  /**
   * Create purpose from template
   * Inherits RGPD fields from template (immutable)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param input - template reference and optional overrides
   * @returns Created purpose
   * @throws Error if template not found
   * @throws Error if template already adopted by tenant
   */
  createFromTemplate(tenantId: string, input: CreatePurposeFromTemplateInput): Promise<Purpose>;

  /**
   * Find purpose by template ID
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param templateId - template identifier
   * @returns Purpose or null if not adopted
   */
  findByTemplateId(tenantId: string, templateId: string): Promise<Purpose | null>;

  /**
   * List system purposes (from templates)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns List of system purposes
   */
  findSystemPurposes(tenantId: string): Promise<Purpose[]>;

  /**
   * List custom purposes (not from templates)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns List of custom purposes
   */
  findCustomPurposes(tenantId: string): Promise<Purpose[]>;

  /**
   * Check if a template is already adopted by tenant
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param templateId - template identifier
   * @returns true if already adopted
   */
  isTemplateAdopted(tenantId: string, templateId: string): Promise<boolean>;
}
