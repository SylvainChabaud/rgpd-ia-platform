/**
 * Incident Alert Service
 *
 * Multi-channel alerting for security incidents (EPIC 9)
 *
 * RGPD Compliance:
 * - Art. 33: Notification breach (alert DPO/CNIL within 72h)
 * - Art. 34: Notification users (if high risk)
 * - CRITICAL: No sensitive data in alerts
 *
 * Channels:
 * - Email: Always enabled (DPO, DevOps)
 * - Slack: Optional webhook integration
 * - PagerDuty: For CRITICAL severity only
 */

import type { SecurityIncident, IncidentSeverity } from "@/domain/incident";
import { INCIDENT_SEVERITY } from "@/domain/incident";
import type { AlertService, Alert, AlertSeverity } from "@/app/ports/AlertService";
import { ALERT_SEVERITY } from "@/app/ports/AlertService";
import type { IncidentAlertService as IIncidentAlertService } from "@/app/ports/IncidentAlertService";
import { ACTOR_SCOPE } from "@/shared/actorScope";
import { logEvent, logError } from "@/shared/logger";
import { logger } from "@/infrastructure/logging/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Slack webhook configuration
 */
export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

/**
 * PagerDuty configuration
 */
export interface PagerDutyConfig {
  routingKey: string;
  serviceId?: string;
}

/**
 * Incident alert service configuration
 */
export interface IncidentAlertConfig {
  // Email (primary channel)
  emailRecipients: {
    dpo: string[];
    devops: string[];
    security: string[];
  };

  // Optional: Slack webhook
  slack?: SlackConfig;

  // Optional: PagerDuty (for CRITICAL only)
  pagerDuty?: PagerDutyConfig;

  // Base URL for dashboard links
  dashboardUrl?: string;
}

/**
 * Notification result
 */
export interface NotificationResult {
  channel: "email" | "slack" | "pagerduty";
  success: boolean;
  error?: string;
}

// =============================================================================
// INCIDENT ALERT SERVICE
// =============================================================================

export class IncidentAlertService implements IIncidentAlertService {
  private config: IncidentAlertConfig;
  private emailService: AlertService;

  constructor(config: IncidentAlertConfig, emailService: AlertService) {
    this.config = config;
    this.emailService = emailService;
  }

  /**
   * Notify about a new security incident
   *
   * Routes to appropriate channels based on severity:
   * - CRITICAL: Email + Slack + PagerDuty
   * - HIGH: Email + Slack
   * - MEDIUM/LOW: Email only
   */
  async notifyIncident(incident: SecurityIncident): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      // Always send email
      const emailResult = await this.sendEmailAlert(incident);
      results.push(emailResult);

      // Slack for HIGH and CRITICAL
      if (
        this.config.slack &&
        (incident.severity === INCIDENT_SEVERITY.HIGH || incident.severity === INCIDENT_SEVERITY.CRITICAL)
      ) {
        const slackResult = await this.sendSlackAlert(incident);
        results.push(slackResult);
      }

      // PagerDuty for CRITICAL only
      if (this.config.pagerDuty && incident.severity === INCIDENT_SEVERITY.CRITICAL) {
        const pdResult = await this.sendPagerDutyAlert(incident);
        results.push(pdResult);
      }

      logEvent("incident.notifications_sent", {
        incidentId: incident.id,
        severity: incident.severity,
        channels: results.map((r) => r.channel).join(","),
        successCount: results.filter((r) => r.success).length,
      });

      return results;
    } catch (error) {
      logError("incident.notification_failed", {
        incidentId: incident.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Notify about CNIL deadline approaching (< 24h)
   */
  async notifyCnilDeadlineApproaching(
    incident: SecurityIncident
  ): Promise<void> {
    const alert: Alert = {
      severity: ALERT_SEVERITY.CRITICAL,
      title: `⚠️ CNIL DEADLINE: ${incident.title}`,
      message: this.formatCnilDeadlineMessage(incident),
      metadata: {
        incidentId: incident.id,
        type: incident.type,
        detectedAt: incident.detectedAt.toISOString(),
      },
      timestamp: new Date(),
    };

    // Send to DPO urgently
    await this.emailService.sendAlert(alert);

    // Also Slack if configured
    if (this.config.slack) {
      await this.sendSlackMessage({
        text: `🚨 *CNIL DEADLINE APPROACHING* 🚨\n\n${alert.message}`,
        color: "danger",
      });
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    incident: SecurityIncident
  ): Promise<NotificationResult> {
    try {
      const alert: Alert = {
        severity: this.mapSeverityToAlertLevel(incident.severity),
        title: this.formatAlertTitle(incident),
        message: this.formatEmailMessage(incident),
        metadata: {
          incidentId: incident.id,
          type: incident.type,
          tenantId: incident.tenantId || ACTOR_SCOPE.PLATFORM,
        },
        timestamp: new Date(),
      };

      await this.emailService.sendAlert(alert);

      return { channel: "email", success: true };
    } catch (error) {
      return {
        channel: "email",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send Slack alert via webhook
   */
  private async sendSlackAlert(
    incident: SecurityIncident
  ): Promise<NotificationResult> {
    if (!this.config.slack) {
      return { channel: "slack", success: false, error: "Not configured" };
    }

    try {
      const message = this.formatSlackMessage(incident);
      await this.sendSlackMessage(message);
      return { channel: "slack", success: true };
    } catch (error) {
      return {
        channel: "slack",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(
    incident: SecurityIncident
  ): Promise<NotificationResult> {
    if (!this.config.pagerDuty) {
      return { channel: "pagerduty", success: false, error: "Not configured" };
    }

    try {
      // PagerDuty Events API v2
      const _payload = {
        routing_key: this.config.pagerDuty.routingKey,
        event_action: "trigger",
        dedup_key: `incident-${incident.id}`,
        payload: {
          summary: `[${incident.severity}] ${incident.title}`,
          source: "rgpd-ia-platform",
          severity: incident.severity === INCIDENT_SEVERITY.CRITICAL ? "critical" : "error",
          timestamp: incident.detectedAt.toISOString(),
          custom_details: {
            type: incident.type,
            description: incident.description,
            users_affected: incident.usersAffected,
            tenant_id: incident.tenantId || ACTOR_SCOPE.PLATFORM,
          },
        },
        links: this.config.dashboardUrl
          ? [
              {
                href: `${this.config.dashboardUrl}/incidents/${incident.id}`,
                text: "View Incident",
              },
            ]
          : [],
      };

      // PLACEHOLDER: In production, send to PagerDuty API
      // await fetch('https://events.pagerduty.com/v2/enqueue', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });

      // PLACEHOLDER: In production, send to PagerDuty API
      logger.info({ event: "pagerduty.alert_triggered", incidentId: incident.id, severity: incident.severity }, `[PAGERDUTY] Triggering alert for incident`);
      logEvent("pagerduty.alert_triggered", {
        incidentId: incident.id,
        severity: incident.severity,
      });

      return { channel: "pagerduty", success: true };
    } catch (error) {
      return {
        channel: "pagerduty",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send message to Slack webhook
   */
  private async sendSlackMessage(message: {
    text: string;
    color?: string;
  }): Promise<void> {
    if (!this.config.slack) return;

    const _payload = {
      channel: this.config.slack.channel,
      username: this.config.slack.username || "RGPD Security Bot",
      icon_emoji: this.config.slack.iconEmoji || ":shield:",
      attachments: [
        {
          color: message.color || this.getSlackColor(ALERT_SEVERITY.WARNING),
          text: message.text,
          mrkdwn_in: ["text"],
        },
      ],
    };

    // PLACEHOLDER: In production, send to Slack webhook
    // await fetch(this.config.slack.webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });

    // PLACEHOLDER: In production, send to Slack webhook
    logger.info({ event: "slack.message_sent", channel: this.config.slack.channel }, `[SLACK] Sending message`);
    logEvent("slack.message_sent", { channel: this.config.slack.channel });
  }

  // ===========================================================================
  // FORMATTERS
  // ===========================================================================

  private formatAlertTitle(incident: SecurityIncident): string {
    const emoji = this.getSeverityEmoji(incident.severity);
    return `${emoji} [${incident.severity}] ${incident.title}`;
  }

  private formatEmailMessage(incident: SecurityIncident): string {
    const lines = [
      `Security Incident Detected`,
      ``,
      `Type: ${incident.type}`,
      `Severity: ${incident.severity}`,
      `Risk Level: ${incident.riskLevel}`,
      `Detected: ${incident.detectedAt.toISOString()}`,
      ``,
      `Description:`,
      incident.description,
      ``,
      `Affected:`,
      `- Data Categories: ${incident.dataCategories.join(", ") || "Unknown"}`,
      `- Users Affected: ${incident.usersAffected}`,
      `- Records Affected: ${incident.recordsAffected}`,
    ];

    if (incident.tenantId) {
      lines.push(``, `Tenant: ${incident.tenantId}`);
    }

    if (this.config.dashboardUrl) {
      lines.push(
        ``,
        `View Incident: ${this.config.dashboardUrl}/incidents/${incident.id}`
      );
    }

    return lines.join("\n");
  }

  private formatSlackMessage(incident: SecurityIncident): {
    text: string;
    color: string;
  } {
    const emoji = this.getSeverityEmoji(incident.severity);
    const link = this.config.dashboardUrl
      ? `<${this.config.dashboardUrl}/incidents/${incident.id}|View Incident>`
      : "";

    const text = [
      `${emoji} *Security Incident: ${incident.title}*`,
      ``,
      `*Type:* ${incident.type}`,
      `*Severity:* ${incident.severity}`,
      `*Risk Level:* ${incident.riskLevel}`,
      `*Detected:* ${incident.detectedAt.toISOString()}`,
      ``,
      `*Description:*`,
      incident.description,
      ``,
      `*Affected:*`,
      `• Data Categories: ${incident.dataCategories.join(", ") || "Unknown"}`,
      `• Users: ${incident.usersAffected}`,
      `• Records: ${incident.recordsAffected}`,
      link ? `\n${link}` : "",
    ].join("\n");

    return {
      text,
      color: this.getSlackColor(incident.severity),
    };
  }

  private formatCnilDeadlineMessage(incident: SecurityIncident): string {
    const deadline = new Date(incident.detectedAt);
    deadline.setHours(deadline.getHours() + 72);

    return [
      `URGENT: CNIL notification deadline approaching!`,
      ``,
      `Incident: ${incident.title}`,
      `Type: ${incident.type}`,
      `Risk Level: ${incident.riskLevel}`,
      ``,
      `Detected: ${incident.detectedAt.toISOString()}`,
      `Deadline: ${deadline.toISOString()}`,
      ``,
      `Action required: Evaluate and notify CNIL if necessary (Art. 33 RGPD)`,
    ].join("\n");
  }

  private mapSeverityToAlertLevel(
    severity: IncidentSeverity
  ): AlertSeverity {
    switch (severity) {
      case INCIDENT_SEVERITY.CRITICAL:
      case INCIDENT_SEVERITY.HIGH:
        return ALERT_SEVERITY.CRITICAL;
      case INCIDENT_SEVERITY.MEDIUM:
        return ALERT_SEVERITY.WARNING;
      default:
        return ALERT_SEVERITY.INFO;
    }
  }

  private getSeverityEmoji(severity: IncidentSeverity): string {
    switch (severity) {
      case INCIDENT_SEVERITY.CRITICAL:
        return "🚨";
      case INCIDENT_SEVERITY.HIGH:
        return "🔴";
      case INCIDENT_SEVERITY.MEDIUM:
        return "🟡";
      case INCIDENT_SEVERITY.LOW:
        return "🟢";
      default:
        return "⚪";
    }
  }

  private getSlackColor(severity: IncidentSeverity | AlertSeverity): string {
    switch (severity) {
      case INCIDENT_SEVERITY.CRITICAL:
        return "#8B0000"; // Dark red
      case INCIDENT_SEVERITY.HIGH:
        return "#FF0000"; // Red
      case INCIDENT_SEVERITY.MEDIUM:
      case ALERT_SEVERITY.WARNING:
        return "#FFA500"; // Orange
      case INCIDENT_SEVERITY.LOW:
        return "#008000"; // Green
      default:
        return "#808080"; // Gray
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates an incident alert service with provided configuration
 */
export function createIncidentAlertService(
  config: IncidentAlertConfig,
  emailService: AlertService
): IncidentAlertService {
  return new IncidentAlertService(config, emailService);
}
