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
  // Constants
  INCIDENT_SEVERITY,
  INCIDENT_TYPE,
  INCIDENT_RISK_LEVEL,
  INCIDENT_DATA_CATEGORY,
  DETECTION_SOURCE,
} from "./SecurityIncident";

// Repository Port - MOVED to app/ports/SecurityIncidentRepo
// Use the port interface directly from app/ports/SecurityIncidentRepo
