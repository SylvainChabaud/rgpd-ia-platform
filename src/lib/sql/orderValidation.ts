/**
 * SQL ORDER BY Validation Utilities
 *
 * SECURITY: Prevent SQL injection in dynamic ORDER BY clauses
 * Uses strict whitelist approach for column names and direction
 */

/**
 * Allowed sort directions
 */
const ALLOWED_ORDER_DIRECTIONS = ['ASC', 'DESC'] as const;
export type OrderDirection = (typeof ALLOWED_ORDER_DIRECTIONS)[number];

/**
 * Validate and normalize ORDER BY direction
 *
 * @param direction - User-provided direction
 * @param defaultDir - Default direction if invalid
 * @returns Safe direction value
 */
export function validateOrderDirection(
  direction: string | undefined | null,
  defaultDir: OrderDirection = 'DESC'
): OrderDirection {
  if (!direction) return defaultDir;

  const normalized = direction.toUpperCase().trim();
  if (ALLOWED_ORDER_DIRECTIONS.includes(normalized as OrderDirection)) {
    return normalized as OrderDirection;
  }

  return defaultDir;
}

/**
 * Create a column validator for a specific table
 *
 * @param allowedColumns - Array of allowed column names
 * @param defaultColumn - Default column if invalid
 * @returns Validation function
 */
export function createColumnValidator<T extends string>(
  allowedColumns: readonly T[],
  defaultColumn: T
): (column: string | undefined | null) => T {
  const columnSet = new Set(allowedColumns);

  return (column: string | undefined | null): T => {
    if (!column) return defaultColumn;

    // Normalize: lowercase, trim
    const normalized = column.toLowerCase().trim();

    if (columnSet.has(normalized as T)) {
      return normalized as T;
    }

    return defaultColumn;
  };
}

/**
 * Security Incidents table columns
 */
export const SECURITY_INCIDENT_COLUMNS = [
  'id',
  'tenant_id',
  'type',
  'severity',
  'description',
  'detected_at',
  'resolved_at',
  'reported_to_cnil',
  'created_at',
] as const;

export const validateSecurityIncidentColumn = createColumnValidator(
  SECURITY_INCIDENT_COLUMNS,
  'detected_at'
);

/**
 * Users table columns
 */
export const USER_COLUMNS = [
  'id',
  'tenant_id',
  'email_hash',
  'name',
  'role',
  'status',
  'created_at',
  'updated_at',
  'deleted_at',
  'last_login_at',
] as const;

export const validateUserColumn = createColumnValidator(
  USER_COLUMNS,
  'created_at'
);

/**
 * Audit events table columns
 */
export const AUDIT_EVENT_COLUMNS = [
  'id',
  'tenant_id',
  'event_type',
  'actor_id',
  'target_id',
  'created_at',
] as const;

export const validateAuditEventColumn = createColumnValidator(
  AUDIT_EVENT_COLUMNS,
  'created_at'
);
