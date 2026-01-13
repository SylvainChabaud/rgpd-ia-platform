/**
 * scanner.ts — PII log scanner (RGPD safety net)
 *
 * RGPD Compliance:
 * - Art. 32 (Security): Proactive PII leak detection in logs
 * - Art. 33 (Breach Notification): Alert on PII leaks
 *
 * Purpose:
 * - Scan application logs for accidental PII leaks
 * - Alert security team on violations
 * - Prevent RGPD compliance incidents
 *
 * CRITICAL: This is a safety net. Logs should NEVER contain PII in the first place.
 */

import { detectPII } from "./detector";
import type { PiiType } from "@/domain/anonymization";
import { PII_TYPE } from "@/domain/anonymization";
import { ALERT_SEVERITY, type AlertSeverity } from "@/app/ports/AlertService";

/**
 * Log line with metadata
 */
export interface LogLine {
  /**
   * Log line content
   */
  content: string;

  /**
   * Line number in log file
   */
  lineNumber: number;

  /**
   * Timestamp of log entry (optional)
   */
  timestamp?: Date;

  /**
   * Log level (optional)
   */
  level?: string;
}

/**
 * PII leak detection result
 */
export interface PiiLeakResult {
  /**
   * Log line where PII was detected
   */
  logLine: LogLine;

  /**
   * PII types detected
   */
  piiTypes: PiiType[];

  /**
   * Number of PII instances detected
   */
  piiCount: number;

  /**
   * Severity of the leak (info, warning, critical)
   */
  severity: AlertSeverity;
}

/**
 * PII scan result
 */
export interface PiiScanResult {
  /**
   * Total log lines scanned
   */
  totalLines: number;

  /**
   * Number of lines with PII leaks
   */
  leakCount: number;

  /**
   * PII leak details
   */
  leaks: PiiLeakResult[];

  /**
   * Scan duration in milliseconds
   */
  duration_ms: number;
}

/**
 * Scans a log line for PII leaks
 *
 * @param logLine - Log line to scan
 * @returns PII leak result if PII detected, null otherwise
 *
 * @example
 * const logLine = { content: "User jean@example.com logged in", lineNumber: 42 };
 * const leak = scanLogLine(logLine);
 * // leak = { logLine, piiTypes: ["EMAIL"], piiCount: 1, severity: "warning" }
 */
export function scanLogLine(logLine: LogLine): PiiLeakResult | null {
  const detection = detectPII(logLine.content);

  if (detection.totalCount === 0) {
    return null;
  }

  // Determine severity based on PII types
  const piiTypes = Array.from(
    new Set(detection.entities.map((e) => e.type))
  );
  const severity = determineSeverity(piiTypes, detection.totalCount);

  return {
    logLine,
    piiTypes,
    piiCount: detection.totalCount,
    severity,
  };
}

/**
 * Scans multiple log lines for PII leaks
 *
 * @param logLines - Log lines to scan
 * @returns PII scan result with all leaks detected
 *
 * @example
 * const logLines = [
 *   { content: "User logged in", lineNumber: 1 },
 *   { content: "Email: jean@example.com", lineNumber: 2 },
 * ];
 * const result = scanLogLines(logLines);
 * // result = { totalLines: 2, leakCount: 1, leaks: [...], duration_ms: 5 }
 */
export function scanLogLines(logLines: LogLine[]): PiiScanResult {
  const startTime = performance.now();
  const leaks: PiiLeakResult[] = [];

  for (const logLine of logLines) {
    const leak = scanLogLine(logLine);
    if (leak) {
      leaks.push(leak);
    }
  }

  const duration = Math.round(performance.now() - startTime);

  return {
    totalLines: logLines.length,
    leakCount: leaks.length,
    leaks,
    duration_ms: duration,
  };
}

/**
 * Determines leak severity based on PII types and count
 *
 * @param piiTypes - PII types detected
 * @param piiCount - Number of PII instances
 * @returns Severity level
 *
 * Severity rules:
 * - CRITICAL: SSN, IBAN, or >10 PII instances
 * - WARNING: EMAIL, PHONE, PERSON, or >5 PII instances
 * - INFO: Other cases
 */
function determineSeverity(
  piiTypes: PiiType[],
  piiCount: number
): AlertSeverity {
  // Critical PII types
  const criticalTypes: PiiType[] = [PII_TYPE.SSN, PII_TYPE.IBAN];
  if (piiTypes.some((t) => criticalTypes.includes(t))) {
    return ALERT_SEVERITY.CRITICAL;
  }

  // High PII count
  if (piiCount > 10) {
    return ALERT_SEVERITY.CRITICAL;
  }

  // Warning PII types
  const warningTypes: PiiType[] = [PII_TYPE.EMAIL, PII_TYPE.PHONE, PII_TYPE.PERSON];
  if (piiTypes.some((t) => warningTypes.includes(t))) {
    return ALERT_SEVERITY.WARNING;
  }

  // Medium PII count
  if (piiCount > 5) {
    return ALERT_SEVERITY.WARNING;
  }

  return ALERT_SEVERITY.INFO;
}

/**
 * Parses a log file into log lines
 *
 * @param logContent - Log file content
 * @returns Array of log lines
 *
 * @example
 * const logContent = "Line 1\nLine 2\nLine 3";
 * const logLines = parseLogFile(logContent);
 * // logLines = [
 * //   { content: "Line 1", lineNumber: 1 },
 * //   { content: "Line 2", lineNumber: 2 },
 * //   { content: "Line 3", lineNumber: 3 },
 * // ]
 */
export function parseLogFile(logContent: string): LogLine[] {
  const lines = logContent.split("\n");
  return lines.map((content, index) => ({
    content,
    lineNumber: index + 1,
  }));
}
