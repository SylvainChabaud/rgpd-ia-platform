/**
 * Incident Use Cases (EPIC 9)
 *
 * Exports all incident-related use cases for the application layer.
 */

// Create incident
export {
  createIncident,
  createIncidentUseCase,
  type CreateIncidentInput,
  type CreateIncidentResult,
  type CreateIncidentDeps,
} from "./CreateIncidentUseCase";

// Detect incident (automatic detection)
export {
  evaluateDetectionEvent,
  getDefaultSeverity,
  mapEventToIncidentType,
  DETECTION_THRESHOLDS,
  type DetectionEvent,
  type BruteForceEvent,
  type CrossTenantEvent,
  type MassExportEvent,
  type PiiInLogsEvent,
  type BackupFailureEvent,
} from "./DetectIncidentUseCase";
