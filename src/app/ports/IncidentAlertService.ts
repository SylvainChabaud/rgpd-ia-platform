/**
 * Incident Alert Service Port
 *
 * Multi-channel alerting for security incidents (EPIC 9)
 *
 * RGPD Compliance:
 * - Art. 33: Notification breach (alert DPO/CNIL within 72h)
 * - Art. 34: Notification users (if high risk)
 * - CRITICAL: No sensitive data in alerts
 */

import type { SecurityIncident } from "@/domain/incident/SecurityIncident";

/**
 * Notification result from an alert channel
 */
export interface NotificationResult {
  channel: "email" | "slack" | "pagerduty";
  success: boolean;
  error?: string;
}

/**
 * Incident Alert Service interface
 *
 * Implementations should route alerts to appropriate channels based on severity:
 * - CRITICAL: Email + Slack + PagerDuty
 * - HIGH: Email + Slack
 * - MEDIUM/LOW: Email only
 */
export interface IncidentAlertService {
  /**
   * Notify about a new security incident
   *
   * @param incident - The security incident to notify about
   * @returns Array of notification results for each channel
   */
  notifyIncident(incident: SecurityIncident): Promise<NotificationResult[]>;

  /**
   * Notify about CNIL deadline approaching (< 24h)
   *
   * @param incident - The incident with approaching CNIL deadline
   */
  notifyCnilDeadlineApproaching(incident: SecurityIncident): Promise<void>;
}
