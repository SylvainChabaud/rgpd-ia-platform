/**
 * Failed Login Tracker
 *
 * Tracks failed login attempts for brute force detection.
 * Stores attempts in memory with automatic cleanup.
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 *
 * RGPD Compliance:
 * - Art. 32: Mesures techniques sécurité (détection brute force)
 * - Art. 33: Déclenchement alerte si seuil dépassé
 */

import { DETECTION_THRESHOLDS } from "@/app/usecases/incident";
import { logEvent } from "@/shared/logger";

// =============================================================================
// TYPES
// =============================================================================

interface LoginAttempt {
  timestamp: number;
  email?: string;
  userId?: string;
}

interface AttemptsByIp {
  attempts: LoginAttempt[];
  lastCleanup: number;
}

// =============================================================================
// IN-MEMORY STORAGE
// =============================================================================

/**
 * In-memory storage for failed login attempts
 * Key: IP address
 * Value: Array of attempt timestamps
 *
 * NOTE: In production with multiple instances, use Redis or similar
 */
const failedAttempts = new Map<string, AttemptsByIp>();

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// Window for brute force detection
const DETECTION_WINDOW_MS =
  DETECTION_THRESHOLDS.BRUTE_FORCE_WINDOW_MINUTES * 60 * 1000;

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Record a failed login attempt
 *
 * @param sourceIp - IP address of the request
 * @param email - Email attempted (optional, for logging)
 * @param userId - User ID if known (optional)
 * @returns Object with current count and threshold exceeded flag
 */
export function recordFailedLogin(
  sourceIp: string,
  email?: string,
  userId?: string
): { count: number; thresholdExceeded: boolean } {
  const now = Date.now();

  // Get or create entry for this IP
  let ipData = failedAttempts.get(sourceIp);
  if (!ipData) {
    ipData = { attempts: [], lastCleanup: now };
    failedAttempts.set(sourceIp, ipData);
  }

  // Add new attempt
  ipData.attempts.push({
    timestamp: now,
    email,
    userId,
  });

  // Cleanup old attempts if needed
  if (now - ipData.lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupOldAttempts(sourceIp, now);
  }

  // Count recent attempts (within detection window)
  const recentAttempts = ipData.attempts.filter(
    (a) => now - a.timestamp < DETECTION_WINDOW_MS
  );

  const count = recentAttempts.length;
  const thresholdExceeded = count >= DETECTION_THRESHOLDS.BRUTE_FORCE_ATTEMPTS;

  if (thresholdExceeded) {
    logEvent("security.brute_force_threshold_exceeded", {
      sourceIp,
      attemptCount: count,
      windowMinutes: DETECTION_THRESHOLDS.BRUTE_FORCE_WINDOW_MINUTES,
    });
  }

  return { count, thresholdExceeded };
}

/**
 * Get current failed login count for an IP
 *
 * @param sourceIp - IP address to check
 * @returns Number of recent failed attempts
 */
export function getFailedLoginCount(sourceIp: string): number {
  const ipData = failedAttempts.get(sourceIp);
  if (!ipData) return 0;

  const now = Date.now();
  return ipData.attempts.filter(
    (a) => now - a.timestamp < DETECTION_WINDOW_MS
  ).length;
}

/**
 * Clear failed login attempts for an IP (after successful login)
 *
 * @param sourceIp - IP address to clear
 */
export function clearFailedLogins(sourceIp: string): void {
  failedAttempts.delete(sourceIp);
}

/**
 * Get all IPs with failed attempts above threshold
 * Used for periodic incident detection
 *
 * @returns Array of IPs exceeding threshold with their attempt counts
 */
export function getIpsExceedingThreshold(): Array<{
  ip: string;
  count: number;
  latestEmail?: string;
}> {
  const now = Date.now();
  const result: Array<{ ip: string; count: number; latestEmail?: string }> = [];

  for (const [ip, ipData] of failedAttempts.entries()) {
    const recentAttempts = ipData.attempts.filter(
      (a) => now - a.timestamp < DETECTION_WINDOW_MS
    );

    if (recentAttempts.length >= DETECTION_THRESHOLDS.BRUTE_FORCE_ATTEMPTS) {
      const latest = recentAttempts[recentAttempts.length - 1];
      result.push({
        ip,
        count: recentAttempts.length,
        latestEmail: latest?.email,
      });
    }
  }

  return result;
}

/**
 * Get statistics about tracked IPs
 * Used for monitoring/debugging
 */
export function getTrackerStats(): {
  trackedIps: number;
  totalAttempts: number;
  ipsExceedingThreshold: number;
} {
  const now = Date.now();
  let totalAttempts = 0;
  let ipsExceedingThreshold = 0;

  for (const [, ipData] of failedAttempts.entries()) {
    const recentAttempts = ipData.attempts.filter(
      (a) => now - a.timestamp < DETECTION_WINDOW_MS
    );
    totalAttempts += recentAttempts.length;

    if (recentAttempts.length >= DETECTION_THRESHOLDS.BRUTE_FORCE_ATTEMPTS) {
      ipsExceedingThreshold++;
    }
  }

  return {
    trackedIps: failedAttempts.size,
    totalAttempts,
    ipsExceedingThreshold,
  };
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Cleanup old attempts for an IP
 */
function cleanupOldAttempts(sourceIp: string, now: number): void {
  const ipData = failedAttempts.get(sourceIp);
  if (!ipData) return;

  // Keep only recent attempts
  ipData.attempts = ipData.attempts.filter(
    (a) => now - a.timestamp < DETECTION_WINDOW_MS
  );
  ipData.lastCleanup = now;

  // Remove entry if no recent attempts
  if (ipData.attempts.length === 0) {
    failedAttempts.delete(sourceIp);
  }
}

/**
 * Global cleanup of all old attempts
 * Called periodically by the application
 */
export function cleanupAllOldAttempts(): void {
  const now = Date.now();

  for (const [ip] of failedAttempts.entries()) {
    cleanupOldAttempts(ip, now);
  }

  logEvent("security.failed_login_tracker_cleanup", {
    remainingIps: failedAttempts.size,
  });
}

// =============================================================================
// RESET (for testing)
// =============================================================================

/**
 * Reset all tracked attempts (for testing only)
 */
export function resetTracker(): void {
  failedAttempts.clear();
}
