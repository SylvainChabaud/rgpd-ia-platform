import type { CookieConsentRepo } from '@/app/ports/CookieConsentRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { CookieConsent } from '@/domain/legal/CookieConsent';
import { createCookieConsent } from '@/domain/legal/CookieConsent';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Save cookie consent use-case
 *
 * RGPD compliance:
 * - ePrivacy Directive 2002/58/CE Art. 5.3
 * - Supports both authenticated users and anonymous visitors
 * - Necessary cookies always TRUE (non-modifiable)
 * - TTL 12 months (CNIL standard)
 * - Audit event emitted (P1 data only, no PII)
 *
 * LOT 10.3 — Cookie Consent Banner
 */

export type SaveCookieConsentInput = {
  tenantId?: string;
  userId?: string;
  anonymousId?: string;
  analytics: boolean;
  marketing: boolean;
  ipAddress?: string;
  userAgent?: string;
};

export type SaveCookieConsentResult = {
  consent: CookieConsent;
};

export async function saveCookieConsent(
  consentRepo: CookieConsentRepo,
  auditWriter: AuditEventWriter,
  input: SaveCookieConsentInput
): Promise<SaveCookieConsentResult> {
  // Validation: soit userId, soit anonymousId (pas les deux)
  if (!input.userId && !input.anonymousId) {
    throw new Error('Either userId or anonymousId is required');
  }
  if (input.userId && input.anonymousId) {
    throw new Error('Cannot have both userId and anonymousId');
  }

  // Créer consent via domain factory
  createCookieConsent({
    tenantId: input.tenantId,
    userId: input.userId,
    anonymousId: input.anonymousId,
    analytics: input.analytics,
    marketing: input.marketing,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  // Sauvegarder en DB
  const consent = await consentRepo.save({
    tenantId: input.tenantId,
    userId: input.userId,
    anonymousId: input.anonymousId,
    analytics: input.analytics,
    marketing: input.marketing,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  // Emit audit event (RGPD-safe: P1 data only, no PII)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: 'cookies.consent.saved',
    actorScope: input.tenantId ? ACTOR_SCOPE.TENANT : ACTOR_SCOPE.PLATFORM,
    actorId: input.userId ?? input.anonymousId ?? 'anonymous',
    tenantId: input.tenantId ?? undefined,
    metadata: {
      analytics: input.analytics,
      marketing: input.marketing,
      isAnonymous: !input.userId,
    },
  });

  return { consent };
}
