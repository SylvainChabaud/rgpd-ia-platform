/**
 * Domain Entity: Registre des Traitements (Art. 30 RGPD)
 *
 * RGPD Compliance: Art. 30 (Registre des activités de traitement)
 * Classification: P1 (métadonnées techniques)
 *
 * Représente une entrée dans le registre des traitements.
 * Le registre est généré à partir des purposes actifs du tenant.
 *
 * LOT 12.4 - Fonctionnalités DPO
 */

import type { DpiaRiskLevel, DataClassification } from './Dpia';

// =============================================================================
// Lawful Basis Constants (Art. 6 RGPD)
// =============================================================================

export const LAWFUL_BASIS = {
  CONSENT: 'consent',           // Art. 6.1.a - Consentement
  CONTRACT: 'contract',         // Art. 6.1.b - Exécution contrat
  LEGAL_OBLIGATION: 'legal_obligation', // Art. 6.1.c - Obligation légale
  VITAL_INTEREST: 'vital_interest',     // Art. 6.1.d - Intérêts vitaux
  PUBLIC_INTEREST: 'public_interest',   // Art. 6.1.e - Mission publique
  LEGITIMATE_INTEREST: 'legitimate_interest', // Art. 6.1.f - Intérêt légitime
} as const;

export type LawfulBasis = (typeof LAWFUL_BASIS)[keyof typeof LAWFUL_BASIS];

// =============================================================================
// Purpose Category Constants
// =============================================================================

export const PURPOSE_CATEGORY = {
  AI_PROCESSING: 'ai_processing',
  DATA_ANALYSIS: 'data_analysis',
  MARKETING: 'marketing',
  SECURITY: 'security',
  LEGAL_COMPLIANCE: 'legal_compliance',
  CUSTOMER_SERVICE: 'customer_service',
  RESEARCH: 'research',
  OTHER: 'other',
} as const;

export type PurposeCategory = (typeof PURPOSE_CATEGORY)[keyof typeof PURPOSE_CATEGORY];

// =============================================================================
// Retention Period Constants
// =============================================================================

export const RETENTION_PERIOD = {
  SESSION: 'session',       // Durée de la session
  DAYS_7: '7_days',         // 7 jours
  DAYS_30: '30_days',       // 30 jours
  MONTHS_6: '6_months',     // 6 mois
  YEAR_1: '1_year',         // 1 an
  YEARS_3: '3_years',       // 3 ans
  YEARS_5: '5_years',       // 5 ans (conservation légale)
  ACCOUNT_LIFETIME: 'account_lifetime', // Durée du compte
  LEGAL_OBLIGATION: 'legal_obligation', // Selon obligation légale
} as const;

export type RetentionPeriod = (typeof RETENTION_PERIOD)[keyof typeof RETENTION_PERIOD];

// =============================================================================
// Registre Entry Interface (Art. 30)
// =============================================================================

export interface RegistreEntry {
  // Identification
  readonly id: string;
  readonly tenantId: string;
  readonly purposeId: string;

  // Art. 30.1.a - Nom et coordonnées du responsable
  // (fourni au niveau tenant, pas ici)

  // Art. 30.1.b - Finalités du traitement
  readonly purposeName: string;
  readonly purposeDescription: string;
  readonly category: PurposeCategory;

  // Art. 30.1.c - Catégories de personnes concernées
  readonly dataSubjectCategories: readonly string[];

  // Art. 30.1.d - Catégories de données
  readonly dataCategories: readonly string[];
  readonly dataClassification: DataClassification;

  // Art. 30.1.e - Catégories de destinataires
  readonly recipientCategories: readonly string[];

  // Art. 30.1.f - Transferts hors UE (si applicable)
  readonly transfersOutsideEU: boolean;
  readonly transferCountries?: readonly string[];
  readonly transferSafeguards?: string;

  // Art. 30.1.g - Délais de conservation
  readonly retentionPeriod: RetentionPeriod;
  readonly retentionDescription: string;

  // Art. 30.1.h - Mesures de sécurité (Art. 32)
  readonly securityMeasures: readonly string[];

  // Base légale (Art. 6)
  readonly lawfulBasis: LawfulBasis;
  readonly lawfulBasisDetails?: string;

  // Évaluation des risques
  readonly riskLevel: DpiaRiskLevel;
  readonly requiresDpia: boolean;
  readonly dpiaId?: string;
  readonly dpiaStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';

  // Statut
  readonly isActive: boolean;
  readonly activatedAt: Date | null;
  readonly deactivatedAt: Date | null;

  // Timestamps
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// =============================================================================
// Input Types
// =============================================================================

export interface BuildRegistreEntryInput {
  tenantId: string;
  purposeId: string;
  purposeName: string;
  purposeDescription: string;
  category: PurposeCategory;
  lawfulBasis: LawfulBasis;
  riskLevel: DpiaRiskLevel;
  dataClassification: DataClassification;
  requiresDpia: boolean;
  isActive: boolean;
  activatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Optional DPIA link
  dpiaId?: string;
  dpiaStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// =============================================================================
// Default Values
// =============================================================================

// Default data subject categories
export const DEFAULT_DATA_SUBJECT_CATEGORIES: string[] = [
  'Utilisateurs du service',
  'Employés du tenant',
];

// Default data categories by classification
export const DATA_CATEGORIES_BY_CLASSIFICATION: Record<DataClassification, string[]> = {
  P0: ['Données publiques', 'Statistiques agrégées'],
  P1: ['Identifiants techniques', 'Logs de connexion', 'Timestamps'],
  P2: ['Email', 'Nom', 'Prénom', 'Données de contact'],
  P3: ['Données de santé', 'Données biométriques', 'Données sensibles'],
};

// Default recipients
export const DEFAULT_RECIPIENT_CATEGORIES: string[] = [
  'Administrateurs du tenant',
  'DPO',
  'Sous-traitants autorisés (LLM provider)',
];

// Retention descriptions
export const RETENTION_DESCRIPTIONS: Record<RetentionPeriod, string> = {
  [RETENTION_PERIOD.SESSION]: 'Durée de la session utilisateur',
  [RETENTION_PERIOD.DAYS_7]: '7 jours après génération',
  [RETENTION_PERIOD.DAYS_30]: '30 jours après traitement',
  [RETENTION_PERIOD.MONTHS_6]: '6 mois après dernière utilisation',
  [RETENTION_PERIOD.YEAR_1]: '1 an (audit RGPD)',
  [RETENTION_PERIOD.YEARS_3]: '3 ans (conservation suspensions Art. 18)',
  [RETENTION_PERIOD.YEARS_5]: '5 ans (conservation légale incidents)',
  [RETENTION_PERIOD.ACCOUNT_LIFETIME]: 'Durée de vie du compte utilisateur',
  [RETENTION_PERIOD.LEGAL_OBLIGATION]: 'Selon obligation légale applicable',
};

// Default security measures
export const DEFAULT_SECURITY_MEASURES: string[] = [
  'Chiffrement AES-256-GCM au repos',
  'TLS 1.3 en transit',
  'Isolation multi-tenant (RLS)',
  'Contrôle d\'accès RBAC',
  'Audit logging',
  'Pseudonymisation PII',
];

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Build a registre entry from a purpose
 * Art. 30 - Generates a standardized registre entry
 */
export function buildRegistreEntry(input: BuildRegistreEntryInput): RegistreEntry {
  if (!input.tenantId) {
    throw new Error('RGPD VIOLATION: tenantId required for registre entry');
  }
  if (!input.purposeId) {
    throw new Error('purposeId required for registre entry');
  }

  // Determine retention period based on category/risk
  const retentionPeriod = getRetentionPeriodForCategory(input.category, input.riskLevel);

  // Determine if transfers outside EU (depends on LLM provider)
  // For now, assume EU-only processing
  const transfersOutsideEU = false;

  return {
    id: input.purposeId, // Use purpose ID as registre entry ID
    tenantId: input.tenantId,
    purposeId: input.purposeId,
    purposeName: input.purposeName,
    purposeDescription: input.purposeDescription,
    category: input.category,
    dataSubjectCategories: Object.freeze(DEFAULT_DATA_SUBJECT_CATEGORIES),
    dataCategories: Object.freeze(DATA_CATEGORIES_BY_CLASSIFICATION[input.dataClassification] || []),
    dataClassification: input.dataClassification,
    recipientCategories: Object.freeze(DEFAULT_RECIPIENT_CATEGORIES),
    transfersOutsideEU,
    retentionPeriod,
    retentionDescription: RETENTION_DESCRIPTIONS[retentionPeriod],
    securityMeasures: Object.freeze(DEFAULT_SECURITY_MEASURES),
    lawfulBasis: input.lawfulBasis,
    riskLevel: input.riskLevel,
    requiresDpia: input.requiresDpia,
    dpiaId: input.dpiaId,
    dpiaStatus: input.dpiaStatus,
    isActive: input.isActive,
    activatedAt: input.activatedAt,
    deactivatedAt: null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

// =============================================================================
// Business Rules
// =============================================================================

/**
 * Get retention period based on category and risk level
 */
export function getRetentionPeriodForCategory(
  category: PurposeCategory,
  riskLevel: DpiaRiskLevel
): RetentionPeriod {
  // Legal compliance = legal obligation
  if (category === PURPOSE_CATEGORY.LEGAL_COMPLIANCE) {
    return RETENTION_PERIOD.LEGAL_OBLIGATION;
  }

  // Security = 5 years (incident retention)
  if (category === PURPOSE_CATEGORY.SECURITY) {
    return RETENTION_PERIOD.YEARS_5;
  }

  // Marketing = consent-based, shorter retention
  if (category === PURPOSE_CATEGORY.MARKETING) {
    return RETENTION_PERIOD.YEAR_1;
  }

  // High/Critical risk = longer retention for audits
  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    return RETENTION_PERIOD.YEARS_3;
  }

  // Default = account lifetime
  return RETENTION_PERIOD.ACCOUNT_LIFETIME;
}

/**
 * Check if registre entry is complete (all required fields)
 */
export function isRegistreEntryComplete(entry: RegistreEntry): boolean {
  return (
    !!entry.purposeName &&
    !!entry.purposeDescription &&
    entry.dataSubjectCategories.length > 0 &&
    entry.dataCategories.length > 0 &&
    entry.recipientCategories.length > 0 &&
    !!entry.lawfulBasis &&
    entry.securityMeasures.length > 0
  );
}

/**
 * Check if registre entry requires DPIA validation
 * Art. 35 - DPIA required for high-risk processing
 */
export function requiresDpiaValidation(entry: RegistreEntry): boolean {
  return entry.requiresDpia && entry.dpiaStatus !== 'APPROVED';
}

/**
 * Get lawful basis label (French)
 */
export function getLawfulBasisLabel(basis: LawfulBasis): string {
  const labels: Record<LawfulBasis, string> = {
    [LAWFUL_BASIS.CONSENT]: 'Consentement (Art. 6.1.a)',
    [LAWFUL_BASIS.CONTRACT]: 'Exécution d\'un contrat (Art. 6.1.b)',
    [LAWFUL_BASIS.LEGAL_OBLIGATION]: 'Obligation légale (Art. 6.1.c)',
    [LAWFUL_BASIS.VITAL_INTEREST]: 'Intérêts vitaux (Art. 6.1.d)',
    [LAWFUL_BASIS.PUBLIC_INTEREST]: 'Mission d\'intérêt public (Art. 6.1.e)',
    [LAWFUL_BASIS.LEGITIMATE_INTEREST]: 'Intérêt légitime (Art. 6.1.f)',
  };
  return labels[basis] || basis;
}

/**
 * Get category label (French)
 */
export function getCategoryLabel(category: PurposeCategory): string {
  const labels: Record<PurposeCategory, string> = {
    [PURPOSE_CATEGORY.AI_PROCESSING]: 'Traitement IA',
    [PURPOSE_CATEGORY.DATA_ANALYSIS]: 'Analyse de données',
    [PURPOSE_CATEGORY.MARKETING]: 'Marketing',
    [PURPOSE_CATEGORY.SECURITY]: 'Sécurité',
    [PURPOSE_CATEGORY.LEGAL_COMPLIANCE]: 'Conformité légale',
    [PURPOSE_CATEGORY.CUSTOMER_SERVICE]: 'Service client',
    [PURPOSE_CATEGORY.RESEARCH]: 'Recherche',
    [PURPOSE_CATEGORY.OTHER]: 'Autre',
  };
  return labels[category] || category;
}

// =============================================================================
// Export Helpers
// =============================================================================

/**
 * Convert registre entry to CSV row
 * Art. 30 - For CNIL documentation
 */
export function toRegistreCsvRow(entry: RegistreEntry): Record<string, string> {
  return {
    'ID Traitement': entry.purposeId,
    'Finalité': entry.purposeName,
    'Description': entry.purposeDescription,
    'Catégorie': getCategoryLabel(entry.category),
    'Base légale': getLawfulBasisLabel(entry.lawfulBasis),
    'Classification données': entry.dataClassification,
    'Catégories personnes': entry.dataSubjectCategories.join(', '),
    'Catégories données': entry.dataCategories.join(', '),
    'Destinataires': entry.recipientCategories.join(', '),
    'Transferts hors UE': entry.transfersOutsideEU ? 'Oui' : 'Non',
    'Durée conservation': entry.retentionDescription,
    'Niveau risque': entry.riskLevel,
    'DPIA requise': entry.requiresDpia ? 'Oui' : 'Non',
    'DPIA statut': entry.dpiaStatus || 'N/A',
    'Actif': entry.isActive ? 'Oui' : 'Non',
    'Activé le': entry.activatedAt?.toISOString() || 'N/A',
    'Mesures sécurité': entry.securityMeasures.join('; '),
  };
}

/**
 * Convert registre entry to public format (for API)
 */
export function toPublicRegistreEntry(entry: RegistreEntry): Omit<RegistreEntry, 'tenantId'> {
  // Exclude tenantId from public response
  const { tenantId: _tenantId, ...publicEntry } = entry;
  return publicEntry;
}
