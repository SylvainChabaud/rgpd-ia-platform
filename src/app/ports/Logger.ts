/**
 * Logger port
 * LOT 6.1 - Observabilité RGPD-safe
 *
 * Interface for structured logging following RGPD constraints.
 * CRITICAL: Only P0/P1 data allowed in logs (DATA_CLASSIFICATION.md)
 *
 * Usage in usecases:
 * - Import this interface for dependency injection
 * - Implementations provided via API routes
 * - Never import @/infrastructure/logging/logger directly in usecases
 */

/**
 * Logger interface for RGPD-safe structured logging
 *
 * SECURITY & RGPD:
 * - NO personal data (P2/P3) in logs
 * - Only technical events (P0/P1)
 * - UUIDs and technical IDs only
 */
export interface Logger {
  /**
   * Log info level message
   * @param data - P0/P1 data only (IDs, timestamps, event types)
   * @param message - Description of the event
   */
  info(data: Record<string, unknown>, message: string): void;

  /**
   * Log warning level message
   * @param data - P0/P1 data only
   * @param message - Description of the warning
   */
  warn(data: Record<string, unknown>, message: string): void;

  /**
   * Log error level message
   * @param data - P0/P1 data only (error.message allowed, no user data)
   * @param message - Description of the error
   */
  error(data: Record<string, unknown>, message: string): void;

  /**
   * Log debug level message (development only)
   * @param data - P0/P1 data only
   * @param message - Description for debugging
   */
  debug(data: Record<string, unknown>, message: string): void;
}
