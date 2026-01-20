/**
 * AES-256-GCM Encryption Service Implementation
 *
 * Implements the EncryptionService port with AES-256-GCM
 *
 * Security requirements:
 * - AES-256-GCM for authenticated encryption
 * - Random IV per encryption
 * - Authentication tag verification on decrypt
 * - Key derivation from password (PBKDF2)
 *
 * Classification: Infrastructure (handles P2 data)
 *
 * LOT 5.1 — Export RGPD (bundle chiffré + TTL)
 */

import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from "crypto";
import type { EncryptionService, EncryptedData } from "@/app/ports/EncryptionService";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, 100000, 32, "sha256");
}

/**
 * AES-256-GCM Encryption Service
 */
export class AesEncryptionService implements EncryptionService {
  /**
   * Encrypt data with AES-256-GCM
   */
  encrypt(plaintext: string, password: string): EncryptedData {
    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // Derive key from password
    const key = deriveKey(password, salt);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    let ciphertext = cipher.update(plaintext, "utf8", "base64");
    ciphertext += cipher.final("base64");

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      salt: salt.toString("base64"),
    };
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  decrypt(encrypted: EncryptedData, password: string): string {
    // Decode from base64
    const iv = Buffer.from(encrypted.iv, "base64");
    const authTag = Buffer.from(encrypted.authTag, "base64");
    const salt = Buffer.from(encrypted.salt, "base64");

    // Derive key from password
    const key = deriveKey(password, salt);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let plaintext = decipher.update(encrypted.ciphertext, "base64", "utf8");
    plaintext += decipher.final("utf8");

    return plaintext;
  }

  /**
   * Generate random password for export encryption
   */
  generateExportPassword(): string {
    return randomBytes(32).toString("base64");
  }
}
