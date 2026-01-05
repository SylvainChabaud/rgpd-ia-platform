import type { UserRepo } from '@/app/ports/UserRepo';

/**
 * Data suspension enforcement for Gateway LLM
 *
 * CRITICAL RGPD COMPLIANCE:
 * - This function MUST be called BEFORE any LLM invocation
 * - Art. 18 RGPD (Droit à la limitation du traitement)
 * - If user data is suspended, AI processing is BLOCKED (HTTP 403)
 * - Data remains accessible in read-only mode
 *
 * BOUNDARIES.md: enforcement at Gateway level (not bypassable)
 * LLM_USAGE_POLICY.md: data suspension blocks AI processing
 *
 * LOT 10.6 — Droits complémentaires Art. 18
 */

export class DataSuspensionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataSuspensionError';
  }
}

export async function checkDataSuspension(
  userRepo: UserRepo,
  tenantId: string,
  userId: string
): Promise<void> {
  // BLOCKER: validate required parameters
  if (!tenantId || !userId) {
    throw new DataSuspensionError(
      'Data suspension check failed: tenantId and userId are required'
    );
  }

  // Find user
  const user = await userRepo.findById(userId);

  // BLOCKER: user not found
  if (!user) {
    throw new DataSuspensionError(
      'Data suspension check failed: user not found'
    );
  }

  // BLOCKER: user data is suspended (Art. 18 RGPD)
  if (user.dataSuspended) {
    throw new DataSuspensionError(
      `AI processing blocked: user has requested data processing suspension (Art. 18 RGPD). ` +
      `Reason: ${user.dataSuspendedReason ?? 'user request'}. ` +
      `Suspended at: ${user.dataSuspendedAt?.toISOString() ?? 'unknown'}. ` +
      `Please contact support or unsuspend data processing to continue.`
    );
  }

  // Data processing allowed: proceed
}
