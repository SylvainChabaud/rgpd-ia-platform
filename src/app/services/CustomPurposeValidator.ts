/**
 * CustomPurposeValidator
 * LOT 12.2 - Purpose Templates System (RGPD-Compliant)
 *
 * Service to validate custom purposes before creation.
 * Provides RGPD guidance and warnings for non-expert users.
 *
 * Based on:
 * - CNIL recommendations: https://www.cnil.fr/fr/les-bases-legales/consentement
 * - EDPB Guidelines 05/2020 on Consent
 * - EDPB Guidelines 06/2020 on Automated Processing
 */

import {
  LAWFUL_BASIS,
  RISK_LEVEL,
  DATA_CLASS,
  PROCESSING_TYPE,
  type LawfulBasis,
  type RiskLevel,
  type DataClass,
  type ValidationResult,
  type CustomPurposeInput,
} from '@/app/ports/PurposeTemplateRepo';

// =========================
// Extended Processing Types (includes internal types)
// =========================

// Re-export the standard ProcessingType
export { type ProcessingType } from '@/app/ports/PurposeTemplateRepo';

/**
 * Internal processing types (not exposed to UI)
 * Used for internal validation logic only
 */
const INTERNAL_PROCESSING_TYPE = {
  SENSITIVE_DATA: 'SENSITIVE_DATA',     // Données sensibles (Art. 9)
  CROSS_MATCHING: 'CROSS_MATCHING',     // Croisement de données
} as const;

// Extended types for internal validation (not exposed to UI)
export type ExtendedProcessingType =
  | 'AI_AUTOMATED'        // Traitement IA automatisé
  | 'PROFILING'           // Profilage
  | 'AUTOMATED_DECISION'  // Décision automatisée (Art. 22)
  | 'LARGE_SCALE'         // Traitement à grande échelle
  | 'MONITORING'          // Surveillance systématique
  | 'SENSITIVE_DATA'      // Données sensibles (Art. 9) - internal
  | 'CROSS_MATCHING';     // Croisement de données - internal

// =========================
// RGPD Warning Messages (French)
// =========================

const WARNINGS = {
  P3_DATA: 'Données sensibles Art. 9 RGPD détectées. Une DPIA (Analyse d\'impact) est obligatoire avant mise en production.',
  P2_DATA: 'Données personnelles identifiantes impliquées. Le consentement explicite est recommandé.',
  AUTOMATED_DECISION: 'Décision automatisée ayant des effets juridiques ou significatifs (Art. 22 RGPD). Vérifiez que les conditions sont remplies.',
  PROFILING: 'Profilage détecté. Informez clairement les personnes concernées de la logique sous-jacente et des conséquences.',
  LARGE_SCALE: 'Traitement à grande échelle. Une DPIA peut être requise selon le contexte.',
  HIGH_RISK: 'Traitement à risque élevé identifié. Une DPIA est recommandée avant mise en production.',
  CRITICAL_RISK: 'Traitement à risque critique. Une DPIA est OBLIGATOIRE et doit être validée par le DPO.',
  LEGITIMATE_INTEREST_WARNING: 'L\'intérêt légitime nécessite un test de mise en balance. Documentez pourquoi vos intérêts prévalent sur les droits des personnes.',
  CONSENT_RECOMMENDED: 'Pour les traitements IA impliquant des données personnelles, le consentement est généralement la base légale la plus appropriée.',
  DPIA_REQUIRED: 'Une Analyse d\'Impact (DPIA) est requise avant de mettre ce traitement en production.',
};

const ERRORS = {
  LABEL_TOO_SHORT: 'Le nom de la finalité doit contenir au moins 2 caractères.',
  LABEL_TOO_LONG: 'Le nom de la finalité ne peut pas dépasser 100 caractères.',
  DESCRIPTION_TOO_SHORT: 'La description doit contenir au moins 10 caractères.',
  DESCRIPTION_TOO_LONG: 'La description ne peut pas dépasser 500 caractères.',
  NO_DATA_CLASS: 'Vous devez sélectionner au moins une catégorie de données.',
  P3_WITHOUT_JUSTIFICATION: 'Le traitement de données sensibles (P3) nécessite une justification explicite.',
};

// =========================
// Validator Class
// =========================

export class CustomPurposeValidator {
  /**
   * Validate custom purpose input
   * Returns suggested RGPD configuration and warnings
   */
  validate(input: CustomPurposeInput): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // =========================
    // Input Validation
    // =========================

    // Label validation
    if (input.label.trim().length < 2) {
      errors.push(ERRORS.LABEL_TOO_SHORT);
    } else if (input.label.trim().length > 100) {
      errors.push(ERRORS.LABEL_TOO_LONG);
    }

    // Description validation
    if (input.description.trim().length < 10) {
      errors.push(ERRORS.DESCRIPTION_TOO_SHORT);
    } else if (input.description.trim().length > 500) {
      errors.push(ERRORS.DESCRIPTION_TOO_LONG);
    }

    // Data class validation
    if (!input.dataClassInvolved || input.dataClassInvolved.length === 0) {
      errors.push(ERRORS.NO_DATA_CLASS);
    }

    // =========================
    // Risk Level Calculation
    // =========================

    let riskLevel: RiskLevel = RISK_LEVEL.LOW;

    // Elevate risk based on data classification
    if (input.dataClassInvolved?.includes(DATA_CLASS.P3)) {
      riskLevel = RISK_LEVEL.CRITICAL;
      warnings.push(WARNINGS.P3_DATA);
    } else if (input.dataClassInvolved?.includes(DATA_CLASS.P2)) {
      riskLevel = this.elevateRisk(riskLevel);
      warnings.push(WARNINGS.P2_DATA);
    }

    // Elevate risk based on processing types
    if (input.automaticDecision) {
      riskLevel = this.elevateRisk(riskLevel);
      warnings.push(WARNINGS.AUTOMATED_DECISION);
    }

    if (input.processingTypes?.includes(PROCESSING_TYPE.PROFILING)) {
      riskLevel = this.elevateRisk(riskLevel);
      warnings.push(WARNINGS.PROFILING);
    }

    if (input.processingTypes?.includes(PROCESSING_TYPE.LARGE_SCALE)) {
      riskLevel = this.elevateRisk(riskLevel);
      warnings.push(WARNINGS.LARGE_SCALE);
    }

    if (input.processingTypes?.includes(INTERNAL_PROCESSING_TYPE.SENSITIVE_DATA)) {
      riskLevel = RISK_LEVEL.CRITICAL;
      if (!warnings.includes(WARNINGS.P3_DATA)) {
        warnings.push(WARNINGS.P3_DATA);
      }
    }

    // User-indicated high risk
    if (input.highRisk) {
      riskLevel = this.elevateRisk(riskLevel);
    }

    // =========================
    // Lawful Basis Suggestion
    // =========================

    let suggestedBasis: LawfulBasis = LAWFUL_BASIS.CONSENT;

    // Default to CONSENT for personal data processing
    const personalDataClasses: DataClass[] = [DATA_CLASS.P2, DATA_CLASS.P3];
    const nonPersonalDataClasses: DataClass[] = [DATA_CLASS.P0, DATA_CLASS.P1];

    if (input.dataClassInvolved?.some(c => personalDataClasses.includes(c))) {
      suggestedBasis = LAWFUL_BASIS.CONSENT;
      warnings.push(WARNINGS.CONSENT_RECOMMENDED);
    } else if (input.dataClassInvolved?.every(c => nonPersonalDataClasses.includes(c))) {
      // Non-personal data can use legitimate interest
      suggestedBasis = LAWFUL_BASIS.LEGITIMATE_INTEREST;
    }

    // AI processing almost always requires consent
    if (input.processingTypes?.includes(PROCESSING_TYPE.AI_AUTOMATED)) {
      suggestedBasis = LAWFUL_BASIS.CONSENT;
    }

    // =========================
    // DPIA Requirement Check
    // =========================

    const requiresDpia = this.checkDpiaRequired(riskLevel, input);

    if (requiresDpia) {
      warnings.push(WARNINGS.DPIA_REQUIRED);
    }

    // Add risk-level specific warnings
    if (riskLevel === RISK_LEVEL.HIGH) {
      if (!warnings.includes(WARNINGS.DPIA_REQUIRED)) {
        warnings.push(WARNINGS.HIGH_RISK);
      }
    } else if (riskLevel === RISK_LEVEL.CRITICAL) {
      if (!warnings.includes(WARNINGS.DPIA_REQUIRED)) {
        warnings.push(WARNINGS.CRITICAL_RISK);
      }
    }

    // =========================
    // Result
    // =========================

    return {
      isValid: errors.length === 0,
      suggestedLawfulBasis: suggestedBasis,
      suggestedRiskLevel: riskLevel,
      warnings: this.deduplicateWarnings(warnings),
      errors,
      requiresDpia,
      canProceed: errors.length === 0,
    };
  }

  /**
   * Validate lawful basis selection
   * Provides additional warnings based on chosen basis
   */
  validateLawfulBasis(basis: LawfulBasis, input: CustomPurposeInput): string[] {
    const warnings: string[] = [];

    if (basis === LAWFUL_BASIS.LEGITIMATE_INTEREST) {
      warnings.push(WARNINGS.LEGITIMATE_INTEREST_WARNING);

      // Additional warning if personal data involved
      if (input.dataClassInvolved?.includes(DATA_CLASS.P2)) {
        warnings.push('L\'intérêt légitime est difficile à justifier pour des données personnelles identifiantes avec traitement IA.');
      }
    }

    if (basis === LAWFUL_BASIS.CONTRACT) {
      // Contract basis has limitations
      if (input.processingTypes?.includes(PROCESSING_TYPE.PROFILING)) {
        warnings.push('Le profilage ne peut généralement pas être fondé sur l\'exécution du contrat sauf si strictement nécessaire.');
      }
    }

    return warnings;
  }

  /**
   * Get explanation for a lawful basis
   */
  getLawfulBasisExplanation(basis: LawfulBasis): string {
    const explanations: Record<LawfulBasis, string> = {
      CONSENT: 'La personne concernée a donné son consentement explicite au traitement de ses données pour cette finalité spécifique. Le consentement peut être retiré à tout moment.',
      CONTRACT: 'Le traitement est strictement nécessaire à l\'exécution d\'un contrat auquel la personne est partie, ou à des mesures pré-contractuelles prises à sa demande.',
      LEGAL_OBLIGATION: 'Le traitement est nécessaire au respect d\'une obligation légale à laquelle le responsable de traitement est soumis (ex: obligations fiscales, sociales).',
      VITAL_INTEREST: 'Le traitement est nécessaire à la sauvegarde des intérêts vitaux de la personne concernée ou d\'une autre personne physique.',
      PUBLIC_INTEREST: 'Le traitement est nécessaire à l\'exécution d\'une mission d\'intérêt public ou relevant de l\'exercice de l\'autorité publique.',
      LEGITIMATE_INTEREST: 'Le traitement est nécessaire aux fins des intérêts légitimes poursuivis par le responsable de traitement, à condition que ne prévalent pas les intérêts ou droits fondamentaux de la personne concernée.',
    };
    return explanations[basis];
  }

  /**
   * Elevate risk level by one step
   */
  private elevateRisk(current: RiskLevel): RiskLevel {
    const levels: RiskLevel[] = [RISK_LEVEL.LOW, RISK_LEVEL.MEDIUM, RISK_LEVEL.HIGH, RISK_LEVEL.CRITICAL];
    const idx = levels.indexOf(current);
    return levels[Math.min(idx + 1, levels.length - 1)];
  }

  /**
   * Check if DPIA is required based on EDPB guidelines
   */
  private checkDpiaRequired(riskLevel: RiskLevel, input: CustomPurposeInput): boolean {
    // DPIA required for HIGH or CRITICAL risk
    if (riskLevel === RISK_LEVEL.HIGH || riskLevel === RISK_LEVEL.CRITICAL) {
      return true;
    }

    // DPIA required for sensitive data (Art. 9)
    if (input.dataClassInvolved?.includes(DATA_CLASS.P3)) {
      return true;
    }

    // DPIA required for automated decisions with legal effects
    if (input.automaticDecision) {
      return true;
    }

    // DPIA required for profiling with significant effects
    if (input.processingTypes?.includes(PROCESSING_TYPE.PROFILING) && input.dataClassInvolved?.includes(DATA_CLASS.P2)) {
      return true;
    }

    // DPIA required for large-scale processing of P2 data
    if (input.processingTypes?.includes(PROCESSING_TYPE.LARGE_SCALE) && input.dataClassInvolved?.includes(DATA_CLASS.P2)) {
      return true;
    }

    return false;
  }

  /**
   * Remove duplicate warnings
   */
  private deduplicateWarnings(warnings: string[]): string[] {
    return [...new Set(warnings)];
  }
}

// =========================
// Factory Function
// =========================

export function createCustomPurposeValidator(): CustomPurposeValidator {
  return new CustomPurposeValidator();
}

// =========================
// Singleton Instance
// =========================

let validatorInstance: CustomPurposeValidator | null = null;

export function getCustomPurposeValidator(): CustomPurposeValidator {
  if (!validatorInstance) {
    validatorInstance = new CustomPurposeValidator();
  }
  return validatorInstance;
}
