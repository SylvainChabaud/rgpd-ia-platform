/**
 * Domain: Incident (EPIC 9)
 *
 * Security Incident & Data Breach management
 * for RGPD Art. 33-34 compliance
 */

// Entity
export {
  type SecurityIncident,
  type CreateSecurityIncidentInput,
  type IncidentSeverity,
  type IncidentType,
  type RiskLevel,
  type DataCategory,
  type DetectionSource,
  createSecurityIncident,
  isCnilNotificationRequired,
  isUsersNotificationRequired,
  getCnilDeadline,
  isCnilDeadlineApproaching,
  isCnilDeadlineOverdue,
  SEVERITY_ORDER,
  RISK_LEVEL_ORDER,
} from "./SecurityIncident";

// Repository Port
export {
  type SecurityIncidentRepo,
  type IncidentFilters,
  type PaginationOptions,
  type PaginatedResult,
  type UpdateSecurityIncidentInput,
} from "./SecurityIncidentRepo";
