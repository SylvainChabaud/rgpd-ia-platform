#!/usr/bin/env tsx
/**
 * Log Purge Script
 * LOT 11.3 - RGPD Compliance
 *
 * Usage:
 *   pnpm purge:logs           # Delete all logs (interactive confirmation)
 *   pnpm purge:logs --force   # Delete without confirmation
 *   pnpm purge:logs --older-than=30  # Delete logs older than 30 days
 *
 * RGPD Note:
 * - Logs contain only P0/P1 data (UUIDs, event types, timestamps)
 * - No personal data (P2/P3) → no individual deletion required
 * - Automatic retention (30 days) recommended in production (Loki/ES)
 * - Manual purge useful for: dev cleanup, testing, incident response
 */

import { existsSync, statSync, readFileSync, readdirSync, unlinkSync as deleteFile } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

const LOG_FILE = join(process.cwd(), 'logs', 'app.log');

interface PurgeOptions {
  force: boolean;
  olderThanDays?: number;
}

function parseArgs(): PurgeOptions {
  const args = process.argv.slice(2);
  const options: PurgeOptions = { force: false };

  for (const arg of args) {
    if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--older-than=')) {
      options.olderThanDays = parseInt(arg.split('=')[1], 10);
    }
  }

  return options;
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

function getLogStats(): { exists: boolean; size: number; lines: number; oldestDate?: Date } | null {
  if (!existsSync(LOG_FILE)) {
    return { exists: false, size: 0, lines: 0 };
  }

  const stats = statSync(LOG_FILE);
  const content = readFileSync(LOG_FILE, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  let oldestDate: Date | undefined;
  if (lines.length > 0) {
    try {
      const firstLog = JSON.parse(lines[0]);
      oldestDate = new Date(firstLog.time);
    } catch {
      // Ignore parse errors
    }
  }

  return {
    exists: true,
    size: stats.size,
    lines: lines.length,
    oldestDate,
  };
}

function purgeLogs(olderThanDays?: number): boolean {
  const logDir = join(process.cwd(), 'logs');

  if (!existsSync(logDir)) {
    console.log('ℹ️  No logs directory found. Nothing to purge.');
    return false;
  }

  try {
    const files = readdirSync(logDir).filter((f: string) => f.endsWith('.log'));

    if (files.length === 0) {
      console.log('ℹ️  No log files found. Nothing to purge.');
      return false;
    }

    let deletedCount = 0;
    const now = Date.now();
    const cutoffTime = olderThanDays
      ? now - (olderThanDays * 24 * 60 * 60 * 1000)
      : 0;

    for (const file of files) {
      const filePath = join(logDir, file);
      const stats = statSync(filePath);

      if (olderThanDays === undefined || stats.mtimeMs < cutoffTime) {
        deleteFile(filePath);
        deletedCount++;
        console.log(`  🗑️  Deleted: ${file}`);
      }
    }

    if (deletedCount === 0) {
      console.log(`ℹ️  No log files older than ${olderThanDays} days found.`);
      return false;
    }

    console.log(`✅ Deleted ${deletedCount} log file(s).`);
    return true;
  } catch (error) {
    console.error('❌ Failed to purge log files:', error);
    return false;
  }
}

async function main() {
  console.log('🗑️  Log Purge Script (LOT 11.3 - RGPD Compliance)\n');

  const options = parseArgs();
  const stats = getLogStats();

  if (!stats || !stats.exists) {
    console.log('ℹ️  No log file found at:', LOG_FILE);
    process.exit(0);
  }

  // Display log file info
  console.log('📊 Log File Information:');
  console.log(`   Path: ${LOG_FILE}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Lines: ${stats.lines}`);
  if (stats.oldestDate) {
    const age = Math.floor((Date.now() - stats.oldestDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`   Oldest log: ${stats.oldestDate.toISOString()} (${age} days ago)`);
  }
  console.log('');

  // RGPD Note
  console.log('📋 RGPD Note:');
  console.log('   - Logs contain only P0/P1 data (UUIDs, event types, timestamps)');
  console.log('   - No personal data (P2/P3) in logs (enforced by logger redaction)');
  console.log('   - Recommended retention: 30 days (DATA_CLASSIFICATION.md)');
  console.log('');

  // Confirm deletion
  if (!options.force) {
    const confirmed = await askConfirmation(
      '⚠️  Are you sure you want to delete all logs? (y/N): '
    );
    if (!confirmed) {
      console.log('❌ Purge cancelled.');
      process.exit(0);
    }
  }

  // Purge logs
  const success = purgeLogs(options.olderThanDays);
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
