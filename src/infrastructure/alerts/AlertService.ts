/**
 * AlertService.ts — Email alert service implementation
 *
 * RGPD Compliance:
 * - Art. 33 (Breach Notification): Email alerts on PII leaks
 * - CRITICAL: No sensitive data in alert emails
 *
 * Implementation:
 * - Email-based alerting (console logging for dev/test)
 * - Rate limiting to prevent spam
 * - Alert deduplication
 */

import type {
  AlertService,
  Alert,
} from "@/app/ports/AlertService";
import { logEvent, logError } from "@/shared/logger";
import { logger } from "@/infrastructure/logging/logger";

/**
 * Email alert service configuration
 */
export interface EmailAlertConfig {
  /**
   * Recipient email addresses
   */
  recipients: string[];

  /**
   * Sender email address
   */
  from: string;

  /**
   * Email subject prefix
   */
  subjectPrefix?: string;

  /**
   * Enable rate limiting
   */
  enableRateLimiting?: boolean;

  /**
   * Rate limit: max alerts per hour
   */
  maxAlertsPerHour?: number;
}

/**
 * Email alert service implementation
 *
 * PLACEHOLDER: In production, integrate with actual email service (SendGrid, AWS SES, etc.)
 */
export class EmailAlertService implements AlertService {
  private config: EmailAlertConfig;
  private sentAlerts: Map<string, number> = new Map(); // Alert hash -> timestamp

  constructor(config: EmailAlertConfig) {
    this.config = {
      enableRateLimiting: true,
      maxAlertsPerHour: 10,
      subjectPrefix: "[RGPD Alert]",
      ...config,
    };
  }

  /**
   * Sends an alert via email
   *
   * @param alert - Alert to send
   * @returns Promise that resolves when alert is sent
   */
  async sendAlert(alert: Alert): Promise<void> {
    // Check rate limiting
    if (this.config.enableRateLimiting && this.isRateLimited(alert)) {
      logEvent("alert.rate_limited", {
        severity: alert.severity,
        title: alert.title,
      });
      return;
    }

    try {
      // PLACEHOLDER: In production, send actual email
      // Example with SendGrid:
      // await sendgrid.send({
      //   to: this.config.recipients,
      //   from: this.config.from,
      //   subject: `${this.config.subjectPrefix} ${alert.title}`,
      //   text: this.formatAlertEmail(alert),
      // });

      // For dev/test: Log to structured logger
      logger.info({
        event: "alert.dev_output",
        severity: alert.severity,
        title: alert.title,
      }, `[ALERT] ${alert.severity.toUpperCase()}: ${alert.title}`);

      logEvent("alert.sent", {
        severity: alert.severity,
        title: alert.title,
        recipient_count: this.config.recipients.length,
      });

      // Record sent alert for deduplication
      this.recordSentAlert(alert);
    } catch (error) {
      logError("alert.send_failed", {
        error: error instanceof Error ? error.message : String(error),
        severity: alert.severity,
        title: alert.title,
      });

      throw error;
    }
  }

  /**
   * Sends multiple alerts
   *
   * @param alerts - Alerts to send
   * @returns Promise that resolves when all alerts are sent
   */
  async sendAlerts(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  /**
   * Checks if alert is rate limited
   *
   * @param alert - Alert to check
   * @returns true if rate limited, false otherwise
   */
  private isRateLimited(alert: Alert): boolean {
    const alertHash = this.hashAlert(alert);
    const lastSentTime = this.sentAlerts.get(alertHash);

    if (!lastSentTime) {
      return false;
    }

    const hourAgo = Date.now() - 60 * 60 * 1000;
    return lastSentTime > hourAgo;
  }

  /**
   * Records a sent alert for deduplication
   *
   * @param alert - Alert that was sent
   */
  private recordSentAlert(alert: Alert): void {
    const alertHash = this.hashAlert(alert);
    this.sentAlerts.set(alertHash, Date.now());

    // Clean up old entries (older than 1 hour)
    const hourAgo = Date.now() - 60 * 60 * 1000;
    for (const [hash, timestamp] of this.sentAlerts.entries()) {
      if (timestamp < hourAgo) {
        this.sentAlerts.delete(hash);
      }
    }
  }

  /**
   * Creates a hash for alert deduplication
   *
   * @param alert - Alert to hash
   * @returns Hash string
   */
  private hashAlert(alert: Alert): string {
    return `${alert.severity}:${alert.title}`;
  }

  /**
   * Formats alert as email body
   *
   * @param alert - Alert to format
   * @returns Email body text
   */
  private formatAlertEmail(alert: Alert): string {
    const lines = [
      `Severity: ${alert.severity.toUpperCase()}`,
      `Time: ${alert.timestamp.toISOString()}`,
      "",
      alert.message,
    ];

    if (alert.metadata) {
      lines.push("");
      lines.push("Metadata:");
      for (const [key, value] of Object.entries(alert.metadata)) {
        lines.push(`  ${key}: ${value}`);
      }
    }

    return lines.join("\n");
  }
}

/**
 * Creates an email alert service with default configuration
 *
 * @param recipients - Recipient email addresses
 * @returns Email alert service instance
 */
export function createEmailAlertService(
  recipients: string[]
): EmailAlertService {
  return new EmailAlertService({
    recipients,
    from: "noreply@rgpd-ia-platform.local",
    subjectPrefix: "[RGPD Alert]",
  });
}
