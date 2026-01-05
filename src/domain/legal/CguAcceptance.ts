/**
 * Domain Entity: CGU Acceptance
 *
 * RGPD Compliance: Art. 7 (Conditions applicables au consentement)
 * Classification: P1 (métadonnées consentement)
 *
 * Trace l'acceptation des CGU par un utilisateur.
 * Permet de prouver le consentement explicite et informé (preuve d'audit).
 */

export interface CguAcceptance {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly cguVersionId: string;        // Référence à la version acceptée
  readonly acceptedAt: Date;
  readonly ipAddress: string | null;    // Anonymisée après 7j (EPIC 8)
  readonly userAgent: string | null;    // User-agent browser (optionnel)
  readonly acceptanceMethod: 'checkbox' | 'button' | 'api';  // Traçabilité méthode
}

/**
 * Input pour enregistrer une acceptation CGU
 */
export interface CreateCguAcceptanceInput {
  tenantId: string;
  userId: string;
  cguVersionId: string;
  ipAddress?: string;
  userAgent?: string;
  acceptanceMethod: 'checkbox' | 'button' | 'api';
}

/**
 * Constantes business rules
 */
export const IP_RETENTION_DAYS = 7;  // Durée conservation IP (Art. 32)

/**
 * Factory: créer une nouvelle acceptation CGU
 *
 * Business rules:
 * - Un utilisateur ne peut accepter qu'une seule fois une version donnée
 * - L'acceptation doit être tracée avec timestamp et méthode
 * - IP address est optionnelle (privacy-first)
 */
export function createCguAcceptance(
  input: CreateCguAcceptanceInput
): Omit<CguAcceptance, 'id' | 'acceptedAt'> {
  // Validation: champs obligatoires
  if (!input.tenantId || !input.userId || !input.cguVersionId) {
    throw new Error('tenantId, userId and cguVersionId are required');
  }

  // Validation: méthode acceptation
  const validMethods: Array<'checkbox' | 'button' | 'api'> = ['checkbox', 'button', 'api'];
  if (!validMethods.includes(input.acceptanceMethod)) {
    throw new Error('Invalid acceptance method');
  }

  return {
    tenantId: input.tenantId,
    userId: input.userId,
    cguVersionId: input.cguVersionId,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    acceptanceMethod: input.acceptanceMethod,
  };
}

/**
 * Business rule: vérifier si acceptation récente (< 30 jours)
 */
export function isRecentAcceptance(acceptance: CguAcceptance): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return acceptance.acceptedAt > thirtyDaysAgo;
}

/**
 * Business rule: déterminer si IP doit être anonymisée
 * (selon EPIC 8 : anonymisation après 7 jours)
 */
export function shouldAnonymizeIp(acceptance: CguAcceptance): boolean {
  const retentionDate = new Date(acceptance.acceptedAt);
  retentionDate.setDate(retentionDate.getDate() + IP_RETENTION_DAYS);
  return new Date() > retentionDate;
}

/**
 * Business rule: vérifier si acceptation valide pour une version donnée
 */
export function isValidAcceptanceForVersion(
  acceptance: CguAcceptance,
  cguVersionId: string
): boolean {
  return acceptance.cguVersionId === cguVersionId;
}

/**
 * Helper: mapper acceptation vers format API public
 * (exclure IP address pour protection vie privée)
 */
export function toPublicCguAcceptance(acceptance: CguAcceptance): {
  userId: string;
  cguVersionId: string;
  acceptedAt: Date;
  acceptanceMethod: string;
} {
  return {
    userId: acceptance.userId,
    cguVersionId: acceptance.cguVersionId,
    acceptedAt: acceptance.acceptedAt,
    acceptanceMethod: acceptance.acceptanceMethod,
  };
}

/**
 * Helper: créer événement audit (RGPD-safe, pas de PII)
 */
export function toAuditEvent(acceptance: CguAcceptance): {
  eventType: string;
  tenantId: string;
  actorId: string;
  metadata: {
    cguVersionId: string;
    acceptanceMethod: string;
    hasIpAddress: boolean;
  };
} {
  return {
    eventType: 'cgu.acceptance.recorded',
    tenantId: acceptance.tenantId,
    actorId: acceptance.userId,
    metadata: {
      cguVersionId: acceptance.cguVersionId,
      acceptanceMethod: acceptance.acceptanceMethod,
      hasIpAddress: acceptance.ipAddress !== null,  // Flag uniquement, pas la valeur
    },
  };
}
