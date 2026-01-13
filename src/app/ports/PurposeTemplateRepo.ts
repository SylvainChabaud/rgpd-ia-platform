/**
 * PurposeTemplateRepo port
 * LOT 12.2 - Purpose Templates System (RGPD-Compliant)
 *
 * Classification: P0 (technical metadata, no personal data)
 * Purpose: manage platform-level purpose templates
 * Retention: platform lifetime
 *
 * RGPD Notes:
 * - Templates are platform-level (not tenant-scoped)
 * - Pre-validated for RGPD compliance
 * - Immutable by tenants (read-only access)
 * - Include lawful basis, risk level, data classification
 */

// =========================
// Default Values
// =========================

/**
 * Default retention period for purpose templates (in days)
 * Used when creating new templates without specifying retention
 */
export const DEFAULT_TEMPLATE_RETENTION_DAYS = 90;

// =========================
// RGPD Constants & Types (Art. 6)
// =========================

/**
 * Lawful basis constants for data processing (Art. 6.1 RGPD)
 * Use these constants instead of string literals for type safety
 *
 * @see https://www.cnil.fr/fr/les-bases-legales
 */
export const LAWFUL_BASIS = {
  CONSENT: 'CONSENT',              // Art. 6.1.a - Consentement
  CONTRACT: 'CONTRACT',             // Art. 6.1.b - Exécution contrat
  LEGAL_OBLIGATION: 'LEGAL_OBLIGATION',     // Art. 6.1.c - Obligation légale
  VITAL_INTEREST: 'VITAL_INTEREST',       // Art. 6.1.d - Intérêts vitaux
  PUBLIC_INTEREST: 'PUBLIC_INTEREST',      // Art. 6.1.e - Mission intérêt public
  LEGITIMATE_INTEREST: 'LEGITIMATE_INTEREST', // Art. 6.1.f - Intérêt légitime
} as const;

export type LawfulBasis = (typeof LAWFUL_BASIS)[keyof typeof LAWFUL_BASIS];

/**
 * Purpose category constants
 * Use these constants instead of string literals for type safety
 */
export const PURPOSE_CATEGORY = {
  AI_PROCESSING: 'AI_PROCESSING',  // Traitement IA
  ANALYTICS: 'ANALYTICS',      // Statistiques
  MARKETING: 'MARKETING',      // Marketing
  ESSENTIAL: 'ESSENTIAL',     // Fonctionnement essentiel
  PROFESSIONAL: 'PROFESSIONAL', // Professions réglementées
} as const;

export type PurposeCategory = (typeof PURPOSE_CATEGORY)[keyof typeof PURPOSE_CATEGORY];

/**
 * Sector constants for filtering templates by profession
 * Use these constants instead of string literals for type safety
 */
export const SECTOR = {
  GENERAL: 'GENERAL',       // Usage général
  ACCOUNTING: 'ACCOUNTING', // Comptabilité / Expert-comptable
  LEGAL: 'LEGAL',           // Juridique / Avocat
  HEALTH: 'HEALTH',         // Santé / Médecin
  FINANCE: 'FINANCE',       // Finance / Banque
  HR: 'HR',                 // Ressources Humaines
} as const;

export type Sector = (typeof SECTOR)[keyof typeof SECTOR];

/**
 * Risk level constants for DPIA assessment
 * Use these constants instead of string literals for type safety
 *
 * @see EDPB Guidelines 06/2020
 */
export const RISK_LEVEL = {
  LOW: 'LOW',       // Risque faible
  MEDIUM: 'MEDIUM',    // Risque moyen
  HIGH: 'HIGH',      // Risque élevé - DPIA recommandé
  CRITICAL: 'CRITICAL', // Risque critique - DPIA obligatoire
} as const;

export type RiskLevel = (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL];

/**
 * Data classification constants (from DATA_CLASSIFICATION.md)
 * Use these constants instead of string literals for type safety
 */
export const DATA_CLASS = {
  P0: 'P0',   // Données publiques
  P1: 'P1',   // Données internes non sensibles
  P2: 'P2',   // Données personnelles
  P3: 'P3',  // Données sensibles (Art. 9)
} as const;

export type DataClass = (typeof DATA_CLASS)[keyof typeof DATA_CLASS];

/**
 * Validation status constants for custom purposes
 * Use these constants instead of string literals for type safety
 */
export const VALIDATION_STATUS = {
  PENDING: 'PENDING',     // En attente de validation
  VALIDATED: 'VALIDATED',   // Validé
  REJECTED: 'REJECTED',    // Rejeté
  NEEDS_DPIA: 'NEEDS_DPIA', // DPIA requis avant activation
} as const;

export type ValidationStatus = (typeof VALIDATION_STATUS)[keyof typeof VALIDATION_STATUS];

/**
 * Processing type constants for DPIA assessment
 * Use these constants instead of string literals for type safety
 *
 * @see EDPB Guidelines 06/2020 on DPIA
 */
export const PROCESSING_TYPE = {
  AI_AUTOMATED: 'AI_AUTOMATED',           // Traitement IA automatisé
  PROFILING: 'PROFILING',                 // Profilage (Art. 4.4)
  AUTOMATED_DECISION: 'AUTOMATED_DECISION', // Décision automatisée (Art. 22)
  LARGE_SCALE: 'LARGE_SCALE',             // Traitement à grande échelle
  MONITORING: 'MONITORING',               // Surveillance systématique
} as const;

export type ProcessingType = (typeof PROCESSING_TYPE)[keyof typeof PROCESSING_TYPE];

// =========================
// Processing Type Labels (French)
// =========================

export const PROCESSING_TYPE_LABELS: Record<ProcessingType, string> = {
  AI_AUTOMATED: 'Traitement IA automatisé',
  PROFILING: 'Profilage',
  AUTOMATED_DECISION: 'Décision automatisée',
  LARGE_SCALE: 'Grande échelle',
  MONITORING: 'Surveillance systématique',
};

export const PROCESSING_TYPE_DESCRIPTIONS: Record<ProcessingType, string> = {
  AI_AUTOMATED: 'Traitement par intelligence artificielle sans intervention humaine significative.',
  PROFILING: 'Analyse pour évaluer des aspects personnels (comportement, préférences, localisation).',
  AUTOMATED_DECISION: 'Décision produisant des effets juridiques ou similaires sans intervention humaine.',
  LARGE_SCALE: 'Traitement de volume important de données ou concernant un grand nombre de personnes.',
  MONITORING: 'Observation régulière et systématique des personnes concernées.',
};

// =========================
// Purpose Template Interface
// =========================

export interface PurposeTemplate {
  id: string;
  code: string;
  version: number;
  name: string;
  description: string;
  lawfulBasis: LawfulBasis;
  category: PurposeCategory;
  riskLevel: RiskLevel;
  defaultRetentionDays: number;
  requiresDpia: boolean;
  maxDataClass: DataClass;
  isActive: boolean;
  isAiPurpose: boolean;
  sector: Sector;
  cnilReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// =========================
// Input Types
// =========================

export interface CreateTemplateInput {
  code: string;
  name: string;
  description: string;
  lawfulBasis: LawfulBasis;
  category: PurposeCategory;
  riskLevel: RiskLevel;
  defaultRetentionDays?: number;
  requiresDpia?: boolean;
  maxDataClass?: DataClass;
  isAiPurpose?: boolean;
  sector?: Sector;
  cnilReference?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  defaultRetentionDays?: number;
  requiresDpia?: boolean;
  maxDataClass?: DataClass;
  isActive?: boolean;
  cnilReference?: string;
  // Note: lawfulBasis, category, riskLevel are immutable after creation
}

// =========================
// Repository Interface
// =========================

export interface PurposeTemplateRepo {
  /**
   * List all purpose templates
   *
   * @param activeOnly - Return only active templates (default: true)
   * @returns List of purpose templates
   */
  findAll(activeOnly?: boolean): Promise<PurposeTemplate[]>;

  /**
   * Find template by code
   *
   * @param code - Template code (e.g., 'AI_SUMMARIZATION')
   * @returns Template or null if not found
   */
  findByCode(code: string): Promise<PurposeTemplate | null>;

  /**
   * Find template by ID
   *
   * @param id - Template UUID
   * @returns Template or null if not found
   */
  findById(id: string): Promise<PurposeTemplate | null>;

  /**
   * Create new template (Platform Admin only)
   *
   * @param input - Template data
   * @returns Created template
   * @throws Error if code already exists
   */
  create(input: CreateTemplateInput): Promise<PurposeTemplate>;

  /**
   * Update template (Platform Admin only)
   * Note: lawfulBasis, category, riskLevel are immutable
   *
   * @param id - Template UUID
   * @param input - Fields to update
   * @returns Updated template or null if not found
   */
  update(id: string, input: UpdateTemplateInput): Promise<PurposeTemplate | null>;

  /**
   * Deactivate template (soft delete)
   * Existing tenant purposes remain unaffected
   *
   * @param id - Template UUID
   * @returns true if deactivated, false if not found
   */
  deactivate(id: string): Promise<boolean>;

  /**
   * Count tenants that have adopted a template
   *
   * @param templateId - Template UUID
   * @returns Number of tenants using this template
   */
  countAdoptions(templateId: string): Promise<number>;

  /**
   * List templates by category
   *
   * @param category - Purpose category
   * @returns List of templates in this category
   */
  findByCategory(category: PurposeCategory): Promise<PurposeTemplate[]>;

  /**
   * List templates by risk level
   *
   * @param riskLevel - Risk level
   * @returns List of templates with this risk level
   */
  findByRiskLevel(riskLevel: RiskLevel): Promise<PurposeTemplate[]>;

  /**
   * List AI-specific templates
   *
   * @returns List of templates where isAiPurpose = true
   */
  findAiTemplates(): Promise<PurposeTemplate[]>;

  /**
   * List templates by sector
   *
   * @param sector - Sector (GENERAL, ACCOUNTING, LEGAL, HEALTH, FINANCE, HR)
   * @returns List of templates for this sector
   */
  findBySector(sector: Sector): Promise<PurposeTemplate[]>;
}

// =========================
// Validation Result (for custom purposes)
// =========================

export interface ValidationResult {
  isValid: boolean;
  suggestedLawfulBasis: LawfulBasis;
  suggestedRiskLevel: RiskLevel;
  warnings: string[];
  errors: string[];
  requiresDpia: boolean;
  canProceed: boolean;
}

export interface CustomPurposeInput {
  label: string;
  description: string;
  dataClassInvolved: DataClass[];
  processingTypes: string[];
  automaticDecision: boolean;
  highRisk?: boolean;
}

// =========================
// Lawful Basis Labels (French)
// =========================

export const LAWFUL_BASIS_LABELS: Record<LawfulBasis, string> = {
  CONSENT: 'Consentement',
  CONTRACT: 'Exécution du contrat',
  LEGAL_OBLIGATION: 'Obligation légale',
  VITAL_INTEREST: 'Intérêts vitaux',
  PUBLIC_INTEREST: 'Mission d\'intérêt public',
  LEGITIMATE_INTEREST: 'Intérêt légitime',
};

export const LAWFUL_BASIS_DESCRIPTIONS: Record<LawfulBasis, string> = {
  CONSENT: 'La personne concernée a consenti au traitement de ses données pour une ou plusieurs finalités spécifiques.',
  CONTRACT: 'Le traitement est nécessaire à l\'exécution d\'un contrat auquel la personne concernée est partie.',
  LEGAL_OBLIGATION: 'Le traitement est nécessaire au respect d\'une obligation légale à laquelle le responsable est soumis.',
  VITAL_INTEREST: 'Le traitement est nécessaire à la sauvegarde des intérêts vitaux de la personne concernée.',
  PUBLIC_INTEREST: 'Le traitement est nécessaire à l\'exécution d\'une mission d\'intérêt public.',
  LEGITIMATE_INTEREST: 'Le traitement est nécessaire aux fins des intérêts légitimes poursuivis par le responsable.',
};

// =========================
// Risk Level Labels (French)
// =========================

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
  CRITICAL: 'Critique',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  LOW: 'green',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
};

// =========================
// Category Labels (French)
// =========================

export const CATEGORY_LABELS: Record<PurposeCategory, string> = {
  AI_PROCESSING: 'Traitement IA',
  ANALYTICS: 'Statistiques',
  MARKETING: 'Marketing',
  ESSENTIAL: 'Essentiel',
  PROFESSIONAL: 'Professionnel',
};

// =========================
// Sector Labels (French)
// =========================

export const SECTOR_LABELS: Record<Sector, string> = {
  GENERAL: 'Tous secteurs',
  ACCOUNTING: 'Comptabilité',
  LEGAL: 'Juridique',
  HEALTH: 'Santé',
  FINANCE: 'Finance',
  HR: 'Ressources Humaines',
};

export const SECTOR_DESCRIPTIONS: Record<Sector, string> = {
  GENERAL: 'Templates applicables à tous les secteurs d\'activité.',
  ACCOUNTING: 'Expert-comptable, commissaire aux comptes, gestionnaire de paie.',
  LEGAL: 'Avocat, notaire, huissier, juriste d\'entreprise.',
  HEALTH: 'Médecin, infirmier, pharmacien, établissement de santé.',
  FINANCE: 'Banque, assurance, gestion d\'actifs, conseil financier.',
  HR: 'Direction des ressources humaines, recrutement, formation.',
};

// =========================
// Data Class Labels (French)
// =========================

export const DATA_CLASS_LABELS: Record<DataClass, string> = {
  P0: 'Données publiques',
  P1: 'Données techniques',
  P2: 'Données personnelles',
  P3: 'Données sensibles',
};

export const DATA_CLASS_DESCRIPTIONS: Record<DataClass, string> = {
  P0: 'Données ne permettant aucune identification directe ou indirecte.',
  P1: 'Données techniques internes sans lien direct avec une personne physique (IDs, logs techniques).',
  P2: 'Données relatives à une personne physique identifiée ou identifiable (nom, email, historique).',
  P3: 'Données à risque élevé pour les droits et libertés (santé, opinions, données biométriques).',
};
