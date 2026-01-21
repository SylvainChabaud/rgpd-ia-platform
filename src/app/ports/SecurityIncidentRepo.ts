/**
 * Security Incident Repository Port
 *
 * RGPD Compliance:
 * - Art. 33.5: Registre des violations
 * - Tenant-scoped access (except SUPER_ADMIN/DPO)
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 */

import type {
  SecurityIncident,
  CreateSecurityIncidentInput,
  IncidentSeverity,
  IncidentType,
  RiskLevel,
} from "@/domain/incident/SecurityIncident";

// =============================================================================
// REPOSITORY INTERFACE
// =============================================================================

/**
 * Filters for querying incidents
 */
export interface IncidentFilters {
  tenantId?: string | null; // null = platform-wide only
  severity?: IncidentSeverity | IncidentSeverity[];
  type?: IncidentType | IncidentType[];
  riskLevel?: RiskLevel | RiskLevel[];
  resolved?: boolean;
  cnilNotified?: boolean;
  usersNotified?: boolean;
  detectedAfter?: Date;
  detectedBefore?: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: "detected_at" | "severity" | "risk_level" | "created_at";
  orderDir?: "ASC" | "DESC";
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Update input for incident
 */
export interface UpdateSecurityIncidentInput {
  severity?: IncidentSeverity;
  type?: IncidentType;
  title?: string;
  description?: string;
  dataCategories?: string[];
  usersAffected?: number;
  recordsAffected?: number;
  riskLevel?: RiskLevel;
  remediationActions?: string | null;
}

/**
 * Repository interface for security incidents
 */
export interface SecurityIncidentRepo {
  /**
   * Create a new security incident
   */
  create(input: CreateSecurityIncidentInput): Promise<SecurityIncident>;

  /**
   * Find incident by ID
   * @param tenantId - Tenant scope (null for platform-wide search by SUPER_ADMIN)
   */
  findById(
    incidentId: string,
    tenantId?: string | null
  ): Promise<SecurityIncident | null>;

  /**
   * Find all incidents with filters and pagination
   */
  findAll(
    filters?: IncidentFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SecurityIncident>>;

  /**
   * Find incidents by tenant
   */
  findByTenant(
    tenantId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SecurityIncident>>;

  /**
   * Find unresolved incidents (for dashboard)
   */
  findUnresolved(
    filters?: IncidentFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SecurityIncident>>;

  /**
   * Find incidents pending CNIL notification (deadline approaching)
   */
  findPendingCnilNotification(): Promise<SecurityIncident[]>;

  /**
   * Update incident details
   */
  update(
    incidentId: string,
    input: UpdateSecurityIncidentInput,
    actorId?: string
  ): Promise<SecurityIncident>;

  /**
   * Mark incident as notified to CNIL (Art. 33)
   */
  markCnilNotified(
    incidentId: string,
    cnilReference?: string,
    actorId?: string
  ): Promise<SecurityIncident>;

  /**
   * Mark users as notified (Art. 34)
   */
  markUsersNotified(
    incidentId: string,
    actorId?: string
  ): Promise<SecurityIncident>;

  /**
   * Mark incident as resolved
   */
  markResolved(
    incidentId: string,
    remediationActions: string,
    actorId?: string
  ): Promise<SecurityIncident>;

  /**
   * Count incidents by severity (for dashboard metrics)
   */
  countBySeverity(tenantId?: string | null): Promise<Record<IncidentSeverity, number>>;

  /**
   * Count incidents by type (for analytics)
   */
  countByType(tenantId?: string | null): Promise<Record<IncidentType, number>>;
}
