import type { OppositionRepo } from '@/app/ports/OppositionRepo';
import type { UserOpposition } from '@/domain/legal/UserOpposition';

/**
 * List user oppositions use-case
 *
 * RGPD compliance:
 * - Art. 15 RGPD (Droit d'accès)
 * - Art. 21 RGPD (Droit d'opposition)
 * - Returns all oppositions for a user (history)
 * - Tenant isolation enforced
 *
 * LOT 10.6 — Droits complémentaires Art. 21
 */

export type ListOppositionsInput = {
  tenantId: string;
  userId: string;
};

export type ListOppositionsResult = {
  oppositions: UserOpposition[];
  pendingCount: number;
};

export async function listOppositions(
  oppositionRepo: OppositionRepo,
  input: ListOppositionsInput
): Promise<ListOppositionsResult> {
  const { tenantId, userId } = input;

  // Validation: champs obligatoires
  if (!tenantId || !userId) {
    throw new Error('tenantId and userId are required');
  }

  // Récupérer toutes les oppositions du user
  const oppositions = await oppositionRepo.findByUser(tenantId, userId);

  // Compter les oppositions pending
  const pendingCount = oppositions.filter(o => o.status === 'pending').length;

  return {
    oppositions,
    pendingCount,
  };
}
