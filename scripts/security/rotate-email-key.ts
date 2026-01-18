#!/usr/bin/env npx ts-node
/**
 * Email Encryption Key Rotation Script
 * LOT 1.6 - RGPD Art. 32 (Security of processing)
 *
 * USAGE:
 *   npx ts-node scripts/security/rotate-email-key.ts --old-key <hex> --new-key <hex>
 *   npx ts-node scripts/security/rotate-email-key.ts --generate-new
 *
 * SAFETY:
 *   - Runs in a single transaction (all-or-nothing)
 *   - Validates decryption before committing
 *   - Creates backup recommendation before proceeding
 *
 * IMPORTANT:
 *   1. BACKUP the database before running
 *   2. BACKUP the old key securely
 *   3. Update EMAIL_ENCRYPTION_KEY after successful rotation
 *   4. Restart the application
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Pool } from 'pg';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

interface RotationStats {
  totalUsers: number;
  usersWithEmail: number;
  rotated: number;
  failed: number;
}

function parseKey(keyStr: string): Buffer {
  if (keyStr.length === 64 && /^[0-9a-fA-F]+$/.test(keyStr)) {
    return Buffer.from(keyStr, 'hex');
  }
  return Buffer.from(keyStr, 'base64');
}

function decrypt(encrypted: Buffer, key: Buffer): string {
  const iv = encrypted.subarray(0, IV_LENGTH);
  const authTag = encrypted.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encrypted.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function encrypt(plaintext: string, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

async function rotateKeys(
  oldKeyHex: string,
  newKeyHex: string,
  dryRun: boolean = false
): Promise<RotationStats> {
  const oldKey = parseKey(oldKeyHex);
  const newKey = parseKey(newKeyHex);

  if (oldKey.length !== 32 || newKey.length !== 32) {
    throw new Error('Keys must be 32 bytes (256 bits)');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const stats: RotationStats = {
    totalUsers: 0,
    usersWithEmail: 0,
    rotated: 0,
    failed: 0,
  };

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Get all users with encrypted emails
    const result = await client.query(`
      SELECT id, email_encrypted
      FROM users
      WHERE email_encrypted IS NOT NULL
        AND deleted_at IS NULL
    `);

    stats.totalUsers = result.rowCount || 0;
    stats.usersWithEmail = result.rowCount || 0;

    console.log(`\nFound ${stats.usersWithEmail} users with encrypted emails\n`);

    for (const row of result.rows) {
      const userId = row.id;
      const encryptedBuffer = row.email_encrypted;

      try {
        // Decrypt with old key
        const email = decrypt(encryptedBuffer, oldKey);

        // Re-encrypt with new key
        const newEncrypted = encrypt(email, newKey);

        // Verify the new encryption works
        const verified = decrypt(newEncrypted, newKey);
        if (verified !== email) {
          throw new Error('Verification failed: decrypted email does not match');
        }

        if (!dryRun) {
          // Update in database
          await client.query(
            'UPDATE users SET email_encrypted = $1 WHERE id = $2',
            [newEncrypted, userId]
          );
        }

        stats.rotated++;
        process.stdout.write('.');
      } catch (err) {
        stats.failed++;
        console.error(`\nFailed to rotate key for user ${userId}: ${err}`);
      }
    }

    if (stats.failed > 0) {
      throw new Error(`${stats.failed} users failed key rotation. Rolling back.`);
    }

    if (dryRun) {
      console.log('\n\n[DRY RUN] Rolling back - no changes made');
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
      console.log('\n\n✅ Transaction committed successfully');
    }

    return stats;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

function generateKey(): string {
  return randomBytes(32).toString('hex');
}

async function main() {
  const args = process.argv.slice(2);

  console.log('============================================================================');
  console.log('Email Encryption Key Rotation - LOT 1.6 RGPD');
  console.log('============================================================================\n');

  // Parse arguments
  let oldKey: string | undefined;
  let newKey: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--old-key':
        oldKey = args[++i];
        break;
      case '--new-key':
        newKey = args[++i];
        break;
      case '--generate-new':
        newKey = generateKey();
        console.log(`Generated new key: ${newKey}`);
        console.log('⚠️  SAVE THIS KEY SECURELY BEFORE PROCEEDING\n');
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--help':
        console.log(`
Usage:
  npx ts-node scripts/security/rotate-email-key.ts [options]

Options:
  --old-key <hex>    Current encryption key (64 hex chars)
  --new-key <hex>    New encryption key (64 hex chars)
  --generate-new     Generate a new random key
  --dry-run          Test without making changes
  --help             Show this help

Environment:
  DATABASE_URL       PostgreSQL connection string
  EMAIL_ENCRYPTION_KEY  Current key (used if --old-key not provided)

Example:
  # Generate new key and rotate
  npx ts-node scripts/security/rotate-email-key.ts --generate-new --dry-run

  # Rotate with explicit keys
  npx ts-node scripts/security/rotate-email-key.ts \\
    --old-key abc123... \\
    --new-key def456... \\
    --dry-run
`);
        process.exit(0);
    }
  }

  // Use environment variable if old key not provided
  if (!oldKey) {
    oldKey = process.env.EMAIL_ENCRYPTION_KEY;
    if (oldKey) {
      console.log('Using EMAIL_ENCRYPTION_KEY from environment as old key');
    }
  }

  if (!oldKey || !newKey) {
    console.error('❌ Error: Both old and new keys are required');
    console.error('   Use --help for usage information');
    process.exit(1);
  }

  // Safety checks
  console.log('⚠️  SAFETY CHECKLIST:');
  console.log('   [ ] Database backup created');
  console.log('   [ ] Old key backed up securely');
  console.log('   [ ] New key saved securely');
  console.log('');

  if (!dryRun) {
    console.log('🚨 This will modify the database!');
    console.log('   Add --dry-run to test first.\n');

    // In a real CLI, we'd prompt for confirmation here
    // For now, require explicit flag
    if (!process.env.CONFIRM_ROTATION) {
      console.log('Set CONFIRM_ROTATION=1 to proceed with actual rotation');
      process.exit(1);
    }
  } else {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    const stats = await rotateKeys(oldKey, newKey, dryRun);

    console.log('\n============================================================================');
    console.log('ROTATION SUMMARY');
    console.log('============================================================================');
    console.log(`  Total users:        ${stats.totalUsers}`);
    console.log(`  With email:         ${stats.usersWithEmail}`);
    console.log(`  Successfully rotated: ${stats.rotated}`);
    console.log(`  Failed:             ${stats.failed}`);
    console.log('');

    if (!dryRun && stats.rotated > 0) {
      console.log('✅ KEY ROTATION COMPLETED');
      console.log('');
      console.log('NEXT STEPS:');
      console.log('  1. Update EMAIL_ENCRYPTION_KEY in .env or Docker Secret');
      console.log('  2. Restart the application');
      console.log('  3. Verify users can access their emails');
      console.log('  4. Securely delete the old key after verification period');
    }
  } catch (err) {
    console.error('\n❌ ROTATION FAILED:', err);
    console.error('\nNo changes were made to the database.');
    process.exit(1);
  }
}

main().catch(console.error);
