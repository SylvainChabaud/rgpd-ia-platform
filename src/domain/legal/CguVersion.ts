/**
 * Domain Entity: CGU Version
 *
 * RGPD Compliance: Art. 13-14 (Information transparente)
 * Classification: P0 (contenu public)
 *
 * Gère le versioning des Conditions Générales d'Utilisation (CGU).
 * Permet de tracer l'historique des modifications et d'assurer que les
 * utilisateurs acceptent la version en vigueur.
 */

export interface CguVersion {
  readonly id: string;
  readonly version: string;              // Ex: "1.0.0", "2.1.0"
  readonly content: string;              // Contenu complet CGU (markdown ou HTML)
  readonly effectiveDate: Date;          // Date d'entrée en vigueur
  readonly isActive: boolean;            // TRUE = version courante
  readonly createdAt: Date;
  readonly summary?: string;             // Résumé des modifications (optionnel)
}

/**
 * Input pour créer une nouvelle version CGU
 */
export interface CreateCguVersionInput {
  version: string;
  content: string;
  effectiveDate: Date;
  summary?: string;
}

/**
 * Constantes business rules
 */
export const CGU_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;  // Semantic versioning

/**
 * Factory: créer une nouvelle version CGU
 *
 * Business rules:
 * - Version doit respecter le format semver (X.Y.Z)
 * - Une seule version peut être active à la fois
 * - Date effective ne peut pas être dans le passé (sauf import historique)
 */
export function createCguVersion(
  input: CreateCguVersionInput
): Omit<CguVersion, 'id' | 'createdAt'> {
  // Validation: format version
  if (!CGU_VERSION_PATTERN.test(input.version)) {
    throw new Error('Version must follow semantic versioning (X.Y.Z)');
  }

  // Validation: contenu non vide
  if (!input.content || input.content.trim().length === 0) {
    throw new Error('CGU content cannot be empty');
  }

  return {
    version: input.version,
    content: input.content,
    effectiveDate: input.effectiveDate,
    isActive: false,  // Par défaut, sera activée explicitement
    summary: input.summary,
  };
}

/**
 * Business rule: vérifier si version est en vigueur
 */
export function isVersionEffective(cguVersion: CguVersion): boolean {
  return new Date() >= cguVersion.effectiveDate;
}

/**
 * Business rule: comparer versions (semver)
 */
export function compareVersions(v1: string, v2: string): number {
  const [major1, minor1, patch1] = v1.split('.').map(Number);
  const [major2, minor2, patch2] = v2.split('.').map(Number);

  if (major1 !== major2) return major1 - major2;
  if (minor1 !== minor2) return minor1 - minor2;
  return patch1 - patch2;
}

/**
 * Business rule: déterminer si mise à jour majeure (nécessite re-consentement)
 */
export function isMajorUpdate(oldVersion: string, newVersion: string): boolean {
  const oldMajor = parseInt(oldVersion.split('.')[0], 10);
  const newMajor = parseInt(newVersion.split('.')[0], 10);
  return newMajor > oldMajor;
}

/**
 * Helper: extraire résumé court pour notification email
 */
export function getShortSummary(cguVersion: CguVersion, maxLength: number = 200): string {
  if (!cguVersion.summary) {
    return `Nouvelle version ${cguVersion.version} des CGU`;
  }

  if (cguVersion.summary.length <= maxLength) {
    return cguVersion.summary;
  }

  return cguVersion.summary.substring(0, maxLength - 3) + '...';
}

/**
 * Helper: mapper version CGU vers format API public
 */
export function toPublicCguVersion(cguVersion: CguVersion): {
  version: string;
  effectiveDate: Date;
  isActive: boolean;
  summary?: string;
} {
  return {
    version: cguVersion.version,
    effectiveDate: cguVersion.effectiveDate,
    isActive: cguVersion.isActive,
    summary: cguVersion.summary,
  };
}
