/**
 * RGPD Compliance Card Variants Configuration
 * Extracted from src/components/rgpd/RgpdComplianceCard.tsx
 *
 * Classification: P0 (UI configuration, no personal data)
 *
 * RGPD Articles Referenced:
 * - Art. 5.1.e: Storage limitation (data retention)
 * - Art. 33.5: Incident documentation (5 years)
 * - Art. 17: Right to erasure
 * - Art. 21: Right to object
 * - Art. 18: Right to restriction
 * - Art. 22: Automated decision-making
 * - Art. 7: Conditions for consent
 * - Art. 6: Lawfulness of processing
 * - Art. 30: Records of processing activities
 * - Art. 35: Data protection impact assessment
 */

export const COMPLIANCE_CARD_VARIANT = {
  AUDIT_LOGS: 'audit-logs',
  INCIDENTS: 'incidents',
  EXPORTS: 'exports',
  DELETIONS: 'deletions',
  OPPOSITIONS: 'oppositions',
  SUSPENSIONS: 'suspensions',
  CONTESTS: 'contests',
  // Consent management variants
  CONSENTS_HUB: 'consents-hub',
  CONSENTS_PURPOSES: 'consents-purposes',
  CONSENTS_MATRIX: 'consents-matrix',
  CONSENTS_HISTORY: 'consents-history',
  CONSENTS_TEMPLATES: 'consents-templates',
  // DPO features variants (LOT 12.4)
  DPIA: 'dpia',
  REGISTRE: 'registre',
} as const;

export type ComplianceCardVariant = typeof COMPLIANCE_CARD_VARIANT[keyof typeof COMPLIANCE_CARD_VARIANT];

export interface ComplianceStats {
  totalItems: number;
  oldestItemAge: number | null;
  retentionValue: number;
  retentionUnit: 'days' | 'months' | 'years';
}

export interface VariantConfig {
  title: string;
  article: string;
  requirement: string;
  retentionLabel: string;
  purgeInfo: string;
  getComplianceStatus: (stats: ComplianceStats) => boolean;
}

/**
 * Configuration for each compliance card variant
 * Contains French text for RGPD articles and requirements
 */
export const VARIANT_CONFIG: Record<ComplianceCardVariant, VariantConfig> = {
  [COMPLIANCE_CARD_VARIANT.AUDIT_LOGS]: {
    title: 'Conformite RGPD - Retention des logs',
    article: 'Art. 5.1.e RGPD',
    requirement: 'Limitation de conservation',
    retentionLabel: 'Retention max',
    purgeInfo: 'La purge des evenements anciens est automatique (lazy purge a chaque consultation).',
    getComplianceStatus: (stats) => {
      // Compliant if oldest log < retention period in months
      if (stats.oldestItemAge === null) return true;
      const maxAgeDays = stats.retentionValue * 30; // months to days
      return stats.oldestItemAge <= maxAgeDays;
    },
  },
  [COMPLIANCE_CARD_VARIANT.INCIDENTS]: {
    title: 'Conformite RGPD - Documentation des incidents',
    article: 'Art. 33.5 RGPD',
    requirement: 'Obligatoire',
    retentionLabel: 'Retention min',
    purgeInfo: 'Conservation permanente pour preuve de conformite. Pas de purge automatique.',
    getComplianceStatus: () => true, // Incidents are always compliant (permanent storage)
  },
  [COMPLIANCE_CARD_VARIANT.EXPORTS]: {
    title: 'Conformite RGPD - Exports de donnees',
    article: 'Art. 5.1.e RGPD',
    requirement: 'Limitation de conservation',
    retentionLabel: 'Retention max',
    purgeInfo: 'Les exports de plus de 7 jours doivent etre purges manuellement.',
    getComplianceStatus: (stats) => {
      // Compliant if oldest export < retention period in days
      if (stats.oldestItemAge === null) return true;
      return stats.oldestItemAge <= stats.retentionValue;
    },
  },
  [COMPLIANCE_CARD_VARIANT.DELETIONS]: {
    title: 'Conformite RGPD - Demandes de suppression',
    article: 'Art. 17 RGPD',
    requirement: "Droit a l'effacement",
    retentionLabel: 'Retention max',
    purgeInfo: 'Les donnees marquees supprimees sont purgees apres 30 jours.',
    getComplianceStatus: (stats) => {
      if (stats.oldestItemAge === null) return true;
      return stats.oldestItemAge <= stats.retentionValue;
    },
  },
  [COMPLIANCE_CARD_VARIANT.OPPOSITIONS]: {
    title: 'Conformite RGPD - Oppositions au traitement',
    article: 'Art. 21 RGPD',
    requirement: "Droit d'opposition",
    retentionLabel: 'Retention',
    purgeInfo: 'Les oppositions sont conservees pour traçabilite RGPD.',
    getComplianceStatus: () => true, // Always compliant (kept for audit trail)
  },
  [COMPLIANCE_CARD_VARIANT.SUSPENSIONS]: {
    title: 'Conformite RGPD - Suspensions de traitement',
    article: 'Art. 18 RGPD',
    requirement: 'Droit a la limitation',
    retentionLabel: 'Retention',
    purgeInfo: 'Les suspensions actives bloquent tout traitement des donnees concernees.',
    getComplianceStatus: () => true, // Always compliant
  },
  [COMPLIANCE_CARD_VARIANT.CONTESTS]: {
    title: 'Conformite RGPD - Contestations IA',
    article: 'Art. 22 RGPD',
    requirement: 'Decisions automatisees',
    retentionLabel: 'Retention',
    purgeInfo: 'Les contestations sont conservees pour audit et intervention humaine obligatoire.',
    getComplianceStatus: () => true, // Always compliant (kept for audit trail)
  },
  // Consent management variants
  [COMPLIANCE_CARD_VARIANT.CONSENTS_HUB]: {
    title: 'Conformite RGPD - Gestion des consentements',
    article: 'Art. 7 RGPD',
    requirement: 'Preuve du consentement',
    retentionLabel: 'Conservation',
    purgeInfo: 'Les preuves de consentement sont conservees pendant toute la duree du traitement et 5 ans apres.',
    getComplianceStatus: () => true, // Always compliant (consent management)
  },
  [COMPLIANCE_CARD_VARIANT.CONSENTS_PURPOSES]: {
    title: 'Conformite RGPD - Finalites de traitement',
    article: 'Art. 5.1.b RGPD',
    requirement: 'Limitation des finalites',
    retentionLabel: 'Conservation',
    purgeInfo: 'Les finalites doivent etre determinees, explicites et legitimes. Chaque finalite doit avoir une base legale.',
    getComplianceStatus: () => true, // Always compliant (purpose configuration)
  },
  [COMPLIANCE_CARD_VARIANT.CONSENTS_MATRIX]: {
    title: 'Conformite RGPD - Matrice des consentements',
    article: 'Art. 7.1 & 30 RGPD',
    requirement: 'Documentation',
    retentionLabel: 'Conservation',
    purgeInfo: 'La matrice constitue le registre des consentements, exportable pour audit CNIL.',
    getComplianceStatus: () => true, // Always compliant (documentation)
  },
  [COMPLIANCE_CARD_VARIANT.CONSENTS_HISTORY]: {
    title: 'Conformite RGPD - Historique des consentements',
    article: 'Art. 7.1 RGPD',
    requirement: 'Tracabilite',
    retentionLabel: 'Conservation',
    purgeInfo: "L'historique horodate prouve le consentement et son eventuel retrait. Conservation obligatoire.",
    getComplianceStatus: () => true, // Always compliant (audit trail)
  },
  [COMPLIANCE_CARD_VARIANT.CONSENTS_TEMPLATES]: {
    title: 'Conformite RGPD - Templates de finalites',
    article: 'Art. 6 RGPD',
    requirement: 'Base legale pre-validee',
    retentionLabel: 'Validite',
    purgeInfo: 'Les templates sont pre-valides RGPD avec base legale, categorie et niveau de risque conformes.',
    getComplianceStatus: () => true, // Always compliant (pre-validated templates)
  },
  // DPO features variants (LOT 12.4)
  [COMPLIANCE_CARD_VARIANT.DPIA]: {
    title: "Conformite RGPD - Analyses d'Impact (DPIA)",
    article: 'Art. 35 RGPD',
    requirement: 'Evaluation des risques',
    retentionLabel: 'Conservation',
    purgeInfo: "Les DPIA documentent l'evaluation des risques pour les traitements a risque eleve. Conservation obligatoire.",
    getComplianceStatus: () => true, // Always compliant (documentation)
  },
  [COMPLIANCE_CARD_VARIANT.REGISTRE]: {
    title: 'Conformite RGPD - Registre des Traitements',
    article: 'Art. 30 RGPD',
    requirement: 'Documentation obligatoire',
    retentionLabel: 'Conservation',
    purgeInfo: 'Le registre documente toutes les activites de traitement. A tenir a disposition de la CNIL sur demande.',
    getComplianceStatus: () => true, // Always compliant (documentation)
  },
};

/**
 * Format retention period for display
 */
export const formatRetention = (value: number, unit: 'days' | 'months' | 'years'): string => {
  const labels = {
    days: value === 1 ? 'jour' : 'jours',
    months: 'mois',
    years: value === 1 ? 'an' : 'ans',
  };
  return `${value} ${labels[unit]}`;
};

/**
 * Format age in days for display
 */
export const formatAge = (days: number | null): string => {
  if (days === null) return 'Aucun element';
  return `${days} jour(s)`;
};
