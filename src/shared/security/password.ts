import bcrypt from 'bcryptjs';

export const DISABLED_PASSWORD_HASH = "__DISABLED__";

/**
 * Hash password using bcrypt
 * RGPD Security: Art. 32 - Passwords must be hashed, never stored in plaintext
 *
 * @param password - Plaintext password
 * @param saltRounds - Cost factor (default: 12)
 * @returns Hashed password
 */
export async function hashPassword(password: string, saltRounds: number = 12): Promise<string> {
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 *
 * @param password - Plaintext password
 * @param hash - Hashed password to compare against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
