/**
 * Domain Entity: Data Suspension
 *
 * RGPD Compliance: Art. 18 (Droit à la limitation du traitement)
 * Classification: P1 (métadonnées suspension)
 *
 * Gère la suspension temporaire du traitement des données d'un utilisateur.
 * Lorsque activé, l'utilisateur ne peut plus utiliser les fonctionnalités IA
 * (Gateway LLM bloque les requêtes avec HTTP 403).
 */

export type SuspensionReason =
  | 'user_request'           // Demande utilisateur (Art. 18.1.a)
  | 'data_accuracy_contest'  // Contestation exactitude (Art. 18.1.a)
  | 'unlawful_processing'    // Traitement illicite (Art. 18.1.b)
  | 'legal_claim'            // Conservation pour constat/défense droits (Art. 18.1.c)
  | 'opposition_pending';    // Opposition en attente vérification (Art. 18.1.d)

export interface DataSuspension {
  readonly userId: string;
  readonly tenantId: string;
  readonly suspended: boolean;
  readonly suspendedAt: Date | null;
  readonly suspendedReason: SuspensionReason | null;
  readonly unsuspendedAt: Date | null;
  readonly requestedBy: string;          // ID utilisateur ou admin ayant demandé
  readonly notes: string | null;         // Notes internes (optionnel)
}

/**
 * Input pour suspendre le traitement des données
 */
export interface SuspendDataInput {
  userId: string;
  tenantId: string;
  reason: SuspensionReason;
  requestedBy: string;
  notes?: string;
}

/**
 * Input pour lever la suspension
 */
export interface UnsuspendDataInput {
  userId: string;
  tenantId: string;
  requestedBy: string;
  notes?: string;
}

/**
 * Constantes business rules
 */
export const MAX_NOTES_LENGTH = 1000;           // Limite notes internes
export const SUSPENSION_NOTIFICATION_EMAIL = true;  // Email obligatoire

/**
 * Factory: suspendre le traitement des données d'un utilisateur
 *
 * Business rules:
 * - Raison obligatoire (Art. 18.1)
 * - Email confirmation envoyé immédiatement
 * - Gateway LLM bloque toutes les requêtes (HTTP 403)
 * - Données restent accessibles en lecture seule
 */
export function suspendUserData(
  input: SuspendDataInput
): DataSuspension {
  // Validation: champs obligatoires
  if (!input.userId || !input.tenantId || !input.reason) {
    throw new Error('userId, tenantId and reason are required');
  }

  // Validation: notes length
  if (input.notes && input.notes.length > MAX_NOTES_LENGTH) {
    throw new Error(`Notes must not exceed ${MAX_NOTES_LENGTH} characters`);
  }

  const now = new Date();

  return {
    userId: input.userId,
    tenantId: input.tenantId,
    suspended: true,
    suspendedAt: now,
    suspendedReason: input.reason,
    unsuspendedAt: null,
    requestedBy: input.requestedBy,
    notes: input.notes ?? null,
  };
}

/**
 * Business rule: lever la suspension des données
 */
export function unsuspendUserData(
  current: DataSuspension,
  input: UnsuspendDataInput
): DataSuspension {
  // Validation: données doivent être suspendues
  if (!current.suspended) {
    throw new Error('User data is not currently suspended');
  }

  // Validation: notes length
  if (input.notes && input.notes.length > MAX_NOTES_LENGTH) {
    throw new Error(`Notes must not exceed ${MAX_NOTES_LENGTH} characters`);
  }

  return {
    ...current,
    suspended: false,
    unsuspendedAt: new Date(),
    requestedBy: input.requestedBy,
    notes: input.notes ?? current.notes,
  };
}

/**
 * Business rule: vérifier si données suspendues
 */
export function isDataSuspended(suspension: DataSuspension): boolean {
  return suspension.suspended === true;
}

/**
 * Business rule: calculer durée de suspension (en jours)
 */
export function getSuspensionDuration(suspension: DataSuspension): number | null {
  if (!suspension.suspendedAt) return null;

  const endDate = suspension.unsuspendedAt ?? new Date();
  const diffMs = endDate.getTime() - suspension.suspendedAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Business rule: déterminer si suspension longue durée (> 30 jours)
 */
export function isLongTermSuspension(suspension: DataSuspension): boolean {
  if (!suspension.suspended) return false;

  const duration = getSuspensionDuration(suspension);
  return duration !== null && duration > 30;
}

/**
 * Business rule: mapper raison vers libellé utilisateur
 */
export function getSuspensionReasonLabel(reason: SuspensionReason): string {
  const labels: Record<SuspensionReason, string> = {
    user_request: 'Demande utilisateur',
    data_accuracy_contest: 'Contestation de l\'exactitude des données',
    unlawful_processing: 'Traitement illicite',
    legal_claim: 'Conservation pour constat ou défense de droits',
    opposition_pending: 'Opposition en attente de vérification',
  };

  return labels[reason] ?? 'Raison inconnue';
}

/**
 * Helper: mapper suspension vers format API public
 */
export function toPublicDataSuspension(suspension: DataSuspension): {
  suspended: boolean;
  suspendedAt: Date | null;
  reason: string | null;
  suspensionDurationDays: number | null;
} {
  return {
    suspended: suspension.suspended,
    suspendedAt: suspension.suspendedAt,
    reason: suspension.suspendedReason
      ? getSuspensionReasonLabel(suspension.suspendedReason)
      : null,
    suspensionDurationDays: getSuspensionDuration(suspension),
  };
}

/**
 * Helper: créer événement audit (RGPD-safe)
 */
export function toAuditEvent(
  suspension: DataSuspension,
  eventType: 'suspended' | 'unsuspended'
): {
  eventType: string;
  tenantId: string;
  actorId: string;
  metadata: Record<string, unknown>;
} {
  return {
    eventType: `data.suspension.${eventType}`,
    tenantId: suspension.tenantId,
    actorId: suspension.requestedBy,
    metadata: {
      userId: suspension.userId,
      reason: suspension.suspendedReason,
      suspensionDurationDays: getSuspensionDuration(suspension),
      longTermSuspension: isLongTermSuspension(suspension),
    },
  };
}

/**
 * Helper: générer message email confirmation
 */
export function generateSuspensionEmailMessage(suspension: DataSuspension): {
  subject: string;
  preview: string;
  body: string;
} {
  const eventType = suspension.suspended ? 'suspended' : 'unsuspended';
  const reasonLabel = suspension.suspendedReason
    ? getSuspensionReasonLabel(suspension.suspendedReason)
    : '';

  if (eventType === 'suspended') {
    return {
      subject: 'Suspension du traitement de vos données',
      preview: 'Votre demande de suspension a été prise en compte',
      body: `Bonjour,

Nous vous confirmons que le traitement de vos données a été suspendu conformément à l'Article 18 du RGPD.

Raison : ${reasonLabel}

Pendant cette suspension :
- Vous ne pourrez plus utiliser les fonctionnalités IA de la plateforme
- Vos données restent accessibles en lecture seule
- Vous pouvez lever cette suspension à tout moment depuis votre espace utilisateur

Pour toute question, contactez notre DPO : dpo@example.com

Cordialement,
L'équipe RGPD`,
    };
  } else {
    return {
      subject: 'Reprise du traitement de vos données',
      preview: 'La suspension a été levée',
      body: `Bonjour,

Nous vous confirmons que la suspension du traitement de vos données a été levée.

Vous pouvez à nouveau utiliser normalement toutes les fonctionnalités de la plateforme.

Pour toute question, contactez notre DPO : dpo@example.com

Cordialement,
L'équipe RGPD`,
    };
  }
}
