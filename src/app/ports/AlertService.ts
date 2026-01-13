/**
 * AlertService.ts — Alert service interface (port)
 *
 * RGPD Compliance:
 * - Art. 33 (Breach Notification): Alert on PII leaks in logs
 * - Art. 32 (Security): Proactive monitoring and alerting
 *
 * Port (Hexagonal Architecture):
 * - Defines contract for alert services
 * - Implementations: Email, Slack, PagerDuty, etc.
 */

/**
 * Alert severity level constants
 */
export const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;

export type AlertSeverity = (typeof ALERT_SEVERITY)[keyof typeof ALERT_SEVERITY];

/**
 * Alert message
 */
export interface Alert {
  /**
   * Alert severity level
   */
  severity: AlertSeverity;

  /**
   * Alert title (subject)
   */
  title: string;

  /**
   * Alert message body
   */
  message: string;

  /**
   * Additional metadata (optional)
   */
  metadata?: Record<string, string | number | boolean>;

  /**
   * Timestamp of the alert
   */
  timestamp: Date;
}

/**
 * Alert service interface
 *
 * Implementations must ensure that:
 * - Alerts are sent reliably
 * - No sensitive data is included in alert messages
 * - Alerts are rate-limited to prevent spam
 */
export interface AlertService {
  /**
   * Sends an alert
   *
   * @param alert - Alert to send
   * @returns Promise that resolves when alert is sent
   *
   * @throws Error if alert fails to send
   */
  sendAlert(alert: Alert): Promise<void>;

  /**
   * Sends a batch of alerts
   *
   * @param alerts - Alerts to send
   * @returns Promise that resolves when all alerts are sent
   *
   * @throws Error if any alert fails to send
   */
  sendAlerts(alerts: Alert[]): Promise<void>;
}

/**
 * Creates an alert
 *
 * @param severity - Alert severity
 * @param title - Alert title
 * @param message - Alert message
 * @param metadata - Optional metadata
 * @returns Alert object
 */
export function createAlert(
  severity: AlertSeverity,
  title: string,
  message: string,
  metadata?: Record<string, string | number | boolean>
): Alert {
  return {
    severity,
    title,
    message,
    metadata,
    timestamp: new Date(),
  };
}
