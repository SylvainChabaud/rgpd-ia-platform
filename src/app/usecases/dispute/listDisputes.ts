import type { DisputeRepo } from '@/app/ports/DisputeRepo';
import type { UserDispute } from '@/domain/legal/UserDispute';

/**
 * List user disputes use-case
 *
 * RGPD compliance:
 * - Art. 15 RGPD (Droit d'accès)
 * - Art. 22 RGPD (Décision individuelle automatisée)
 * - Returns all disputes for a user (history)
 * - Tenant isolation enforced
 *
 * LOT 10.6 — Droits complémentaires Art. 22
 */

export type ListDisputesInput = {
  tenantId: string;
  userId: string;
};

export type ListDisputesResult = {
  disputes: UserDispute[];
  pendingCount: number;
  underReviewCount: number;
};

export async function listDisputes(
  disputeRepo: DisputeRepo,
  input: ListDisputesInput
): Promise<ListDisputesResult> {
  const { tenantId, userId } = input;

  // Validation: champs obligatoires
  if (!tenantId || !userId) {
    throw new Error('tenantId and userId are required');
  }

  // Récupérer toutes les disputes du user
  const disputes = await disputeRepo.findByUser(tenantId, userId);

  // Compter les disputes par statut
  const pendingCount = disputes.filter(d => d.status === 'pending').length;
  const underReviewCount = disputes.filter(d => d.status === 'under_review').length;

  return {
    disputes,
    pendingCount,
    underReviewCount,
  };
}
