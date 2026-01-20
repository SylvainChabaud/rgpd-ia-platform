/**
 * EncryptionService port
 *
 * Classification: Infrastructure abstraction
 * Purpose: Abstract encryption operations for RGPD exports
 *
 * CRITICAL SECURITY:
 * - AES-256-GCM required for authenticated encryption
 * - Random IV per encryption
 * - Key derivation from password (PBKDF2)
 *
 * LOT 5.1 — Export RGPD (bundle chiffré + TTL)
 */

/**
 * Encrypted data structure
 * Contains all components needed for decryption
 */
export type EncryptedData = {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded authentication tag */
  authTag: string;
  /** Base64-encoded salt for key derivation */
  salt: string;
};

/**
 * EncryptionService interface
 *
 * Abstracts encryption operations for testability and flexibility
 */
export interface EncryptionService {
  /**
   * Encrypt plaintext data
   *
   * @param plaintext - Data to encrypt (typically JSON string)
   * @param password - Encryption password
   * @returns Encrypted data with IV, auth tag, and salt
   */
  encrypt(plaintext: string, password: string): EncryptedData;

  /**
   * Decrypt encrypted data
   *
   * @param encrypted - Encrypted data
   * @param password - Decryption password
   * @returns Decrypted plaintext
   * @throws Error if authentication fails
   */
  decrypt(encrypted: EncryptedData, password: string): string;

  /**
   * Generate a secure random password for export encryption
   *
   * @returns Random password (base64-encoded)
   */
  generateExportPassword(): string;
}
