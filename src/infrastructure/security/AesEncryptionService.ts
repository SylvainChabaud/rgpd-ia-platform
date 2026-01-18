/**
 * AES-256-GCM Encryption Service
 * LOT 1.6 - Email chiffré pour notifications RGPD
 *
 * Usage:
 * - Chiffrement de l'email utilisateur pour stockage sécurisé
 * - Déchiffrement uniquement par: User (le sien), DPO, Système
 *
 * Sécurité:
 * - AES-256-GCM (authenticated encryption)
 * - IV unique par chiffrement (12 bytes)
 * - Auth tag inclus (16 bytes)
 * - Clé via EMAIL_ENCRYPTION_KEY (32 bytes hex ou base64)
 *
 * Format stocké: IV (12) + AuthTag (16) + Ciphertext = BYTEA
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { readFileSync, existsSync } from 'fs';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommande 12 bytes
const AUTH_TAG_LENGTH = 16;

// Cache the key to avoid reading file on every operation
let cachedKey: Buffer | null = null;

/**
 * Read key from Docker Secret file or environment variable
 * Priority: FILE > ENV (Docker Secrets pattern)
 */
function readKeyFromSource(): string {
  // Docker Secrets: check FILE first
  const keyFilePath = process.env.EMAIL_ENCRYPTION_KEY_FILE;
  if (keyFilePath && existsSync(keyFilePath)) {
    return readFileSync(keyFilePath, 'utf8').trim();
  }

  // Fallback to environment variable
  const keyEnv = process.env.EMAIL_ENCRYPTION_KEY;
  if (keyEnv) {
    return keyEnv;
  }

  throw new Error(
    'EMAIL_ENCRYPTION_KEY not configured. Set EMAIL_ENCRYPTION_KEY_FILE (Docker Secret) or EMAIL_ENCRYPTION_KEY (env var)'
  );
}

/**
 * Get encryption key from Docker Secret or environment
 * @throws Error if key is missing or invalid
 */
function getEncryptionKey(): Buffer {
  // Return cached key if available
  if (cachedKey) {
    return cachedKey;
  }

  const keyValue = readKeyFromSource();

  // Support hex (64 chars) or base64 (44 chars) format
  let keyBuffer: Buffer;

  if (keyValue.length === 64 && /^[0-9a-fA-F]+$/.test(keyValue)) {
    // Hex format
    keyBuffer = Buffer.from(keyValue, 'hex');
  } else {
    // Base64 format
    keyBuffer = Buffer.from(keyValue, 'base64');
  }

  if (keyBuffer.length !== 32) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be 32 bytes (256 bits)');
  }

  // Cache for performance (key doesn't change at runtime)
  cachedKey = keyBuffer;
  return keyBuffer;
}

/**
 * Clear cached key (for testing or key rotation)
 * @internal
 */
export function clearKeyCache(): void {
  cachedKey = null;
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The string to encrypt (e.g., email address)
 * @returns Buffer containing IV + AuthTag + Ciphertext
 */
export function encrypt(plaintext: string): Buffer {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * @param encrypted - Buffer containing IV + AuthTag + Ciphertext
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (wrong key, corrupted data, tampered)
 */
export function decrypt(encrypted: Buffer): string {
  if (encrypted.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted data: too short');
  }

  const key = getEncryptionKey();

  // Extract components
  const iv = encrypted.subarray(0, IV_LENGTH);
  const authTag = encrypted.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encrypted.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    throw new Error('Decryption failed: invalid key or corrupted data');
  }
}

/**
 * Check if encryption key is configured
 * Useful for graceful degradation in environments without key
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a new random encryption key (for setup/rotation)
 * @returns 32-byte key as hex string
 */
export function generateKey(): string {
  return randomBytes(32).toString('hex');
}
