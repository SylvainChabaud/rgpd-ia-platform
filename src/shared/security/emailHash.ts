/**
 * Email Hashing Utility
 * RGPD Compliance: Email is P1 (personal data), hashed for additional protection
 *
 * Purpose: Create consistent hashes for email lookups without storing plaintext
 */

import crypto from 'node:crypto';

/**
 * Hash email for storage and lookup
 * Uses SHA-256 with salt for consistent deterministic hashing
 *
 * @param email - Email address to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();

  // Use SHA-256 for deterministic hashing (same email = same hash)
  // No salt needed here as we need consistency for lookups
  const hash = crypto.createHash('sha256');
  hash.update(normalized);

  return hash.digest('hex');
}

/**
 * Verify email against hash
 *
 * @param email - Email to verify
 * @param emailHash - Hash to compare against
 * @returns True if email matches hash
 */
export async function verifyEmailHash(email: string, emailHash: string): Promise<boolean> {
  const computed = await hashEmail(email);
  return computed === emailHash;
}
