# Runbook: PII Cron Jobs

> **Audience**: DevOps, SRE, Security Team
> **Purpose**: Operational guide for PII anonymization and monitoring cron jobs
> **RGPD Compliance**: Art. 5.1.e (Retention), Art. 32 (Security), Art. 33 (Breach Notification)

---

## Overview

This runbook describes the operation, monitoring, and troubleshooting of two critical RGPD compliance cron jobs:

1. **IP Anonymization Job** (daily at 3:00 AM)
2. **PII Log Scanner Job** (daily at 4:00 AM)

---

## Job 1: IP Anonymization

### Purpose

Automatically anonymize IP addresses in audit logs after the retention period (90 days) to comply with RGPD Art. 5.1.e (Retention Limitation).

### Schedule

- **Cron**: `0 3 * * *` (Daily at 3:00 AM local time)
- **Duration**: ~1-5 minutes (depends on log volume)
- **Priority**: HIGH (RGPD compliance blocker)

### Implementation

**File**: [src/infrastructure/jobs/anonymize-ips.job.ts](../../src/infrastructure/jobs/anonymize-ips.job.ts)

**Functions**:
- `anonymizeOldIPs()`: Main job function
- `anonymizeIP(ip: string)`: Anonymization logic

**Anonymization Strategy**:
- **IPv4**: Zero last octet (`192.168.1.42` → `192.168.1.0`)
- **IPv6**: Zero last 64 bits (`2001:db8::1` → `2001:db8:0:0::`)

### Monitoring

#### Success Metrics

```json
{
  "event": "job.ip_anonymization_completed",
  "meta": {
    "anonymized_count": 1234,
    "skipped_count": 56,
    "already_anonymized_count": 789,
    "duration_ms": 1500
  }
}
```

#### Expected Values

| Metric | Typical Range | Alert Threshold |
|--------|---------------|-----------------|
| `anonymized_count` | 100-10,000 | N/A |
| `skipped_count` | 0-100 | >1000 (investigate) |
| `already_anonymized_count` | 0-50% of total | >80% (inefficiency) |
| `duration_ms` | 1000-5000 | >60,000 (1 min) |

#### Failure Metrics

```json
{
  "event": "job.ip_anonymization_failed",
  "meta": {
    "error": "Database connection timeout",
    "duration_ms": 30000
  }
}
```

### Alerts

| Alert | Severity | Action |
|-------|----------|--------|
| Job failed | CRITICAL | Investigate immediately (RGPD blocker) |
| Duration >1 min | WARNING | Review database performance |
| No records processed | INFO | Verify job is running |

### Troubleshooting

#### Issue: Job Failed

**Symptoms**:
- `job.ip_anonymization_failed` event logged
- Error message in logs

**Diagnosis**:
1. Check database connection:
   ```bash
   docker exec -it rgpd-platform-db pg_isready
   ```
2. Review error logs:
   ```bash
   docker logs rgpd-platform-app | grep ip_anonymization_failed
   ```

**Resolution**:
- Database connection issue: Restart database container
- Query timeout: Increase timeout, optimize query
- Disk space: Free up space, purge old logs

#### Issue: High `skipped_count`

**Symptoms**:
- `skipped_count` > 1000
- Logs show "Invalid IP address" errors

**Diagnosis**:
- Review skipped IP addresses in logs
- Validate IP format in database

**Resolution**:
- Fix invalid IP format in application code
- Add data validation before insertion

#### Issue: Job Not Running

**Symptoms**:
- No `job.ip_anonymization_started` events
- IPs not anonymized after 90 days

**Diagnosis**:
1. Check cron scheduler is running:
   ```bash
   docker exec rgpd-platform-app ps aux | grep cron
   ```
2. Verify cron schedule configuration

**Resolution**:
- Restart application container
- Verify cron setup in production

---

## Job 2: PII Log Scanner

### Purpose

Scan application logs daily for accidental PII leaks and alert security team on violations (safety net for RGPD Art. 32 Security).

### Schedule

- **Cron**: `0 4 * * *` (Daily at 4:00 AM local time)
- **Duration**: ~5-30 minutes (depends on log volume)
- **Priority**: HIGH (security monitoring)

### Implementation

**File**: [src/infrastructure/jobs/scan-pii-logs.job.ts](../../src/infrastructure/jobs/scan-pii-logs.job.ts)

**Functions**:
- `scanLogsForPII(alertService)`: Main job function
- `scanLogLines(logLines)`: Scanning logic

**PII Types Detected**:
- EMAIL, PHONE, PERSON, SSN, IBAN

**Severity Levels**:
- **CRITICAL**: SSN, IBAN, or >10 PII instances
- **WARNING**: EMAIL, PHONE, PERSON, or >5 PII instances
- **INFO**: Other cases

### Monitoring

#### Success Metrics (No Leaks)

```json
{
  "event": "job.pii_log_scan_completed",
  "meta": {
    "total_lines": 10000,
    "leak_count": 0,
    "duration_ms": 5000
  }
}
```

#### Success Metrics (Leaks Found)

```json
{
  "event": "job.pii_log_scan_completed",
  "meta": {
    "total_lines": 10000,
    "leak_count": 3,
    "duration_ms": 5500
  }
}
```

**Alert Email Sent**:
```
Subject: [RGPD Alert] CRITICAL: PII Leak Detected in Logs
Body:
  Detected 1 critical PII leak(s) in application logs.
  This is a RGPD compliance violation (Art. 32 Security).
  Action required: Review and remediate immediately.
  Total leaks: 3
  Lines scanned: 10000
```

#### Expected Values

| Metric | Typical Range | Alert Threshold |
|--------|---------------|-----------------|
| `total_lines` | 10,000-1,000,000 | N/A |
| `leak_count` | 0 | >0 (investigate) |
| `duration_ms` | 5000-30000 | >60,000 (1 min) |

#### Failure Metrics

```json
{
  "event": "job.pii_log_scan_failed",
  "meta": {
    "error": "Log file not found",
    "duration_ms": 100
  }
}
```

### Alerts

| Alert | Severity | Action |
|-------|----------|--------|
| CRITICAL PII leak | CRITICAL | Immediate remediation (RGPD violation) |
| WARNING PII leak | WARNING | Review and fix within 24h |
| INFO PII leak | INFO | Review and fix within 1 week |
| Job failed | WARNING | Investigate (monitoring gap) |

### Troubleshooting

#### Issue: CRITICAL PII Leak Alert

**Symptoms**:
- Email alert: "CRITICAL: PII Leak Detected in Logs"
- `leak_count` > 0 with severity "critical"

**Diagnosis**:
1. Review alert email for leak details
2. Identify log source (file, line number)
3. Trace back to code that logged PII

**Resolution**:
1. **IMMEDIATE**: Purge leaked PII from logs
   ```bash
   # Rotate logs immediately
   docker exec rgpd-platform-app logrotate -f /etc/logrotate.conf
   ```
2. **SHORT-TERM**: Fix code to NOT log PII
3. **LONG-TERM**: Code review, add pre-commit hook

**Root Cause Examples**:
- Logging user input directly: `log.info({ email: user.email })`
- Logging API responses with PII: `log.debug({ response })`
- Exception stack traces with PII in variables

#### Issue: Job Failed

**Symptoms**:
- `job.pii_log_scan_failed` event logged
- Error: "Log file not found"

**Diagnosis**:
1. Verify log file paths:
   ```bash
   docker exec rgpd-platform-app ls -la /var/log/app/
   ```
2. Check file permissions
3. Review error logs

**Resolution**:
- Log file not found: Verify log configuration
- Permission denied: Fix file permissions
- Disk space: Free up space

#### Issue: High Scan Duration

**Symptoms**:
- `duration_ms` > 60,000 (1 minute)
- Scan times out

**Diagnosis**:
- Check log volume: `wc -l /var/log/app/*.log`
- Review system resources (CPU, memory)

**Resolution**:
- Implement log rotation (daily/weekly)
- Scan only recent logs (last 24h)
- Optimize scanner performance

---

## Setup & Configuration

### Production Setup

```typescript
// File: src/infrastructure/jobs/index.ts
import cron from "node-cron";
import { anonymizeOldIPs, IP_ANONYMIZATION_CRON } from "./anonymize-ips.job";
import { scanLogsForPII, PII_LOG_SCAN_CRON } from "./scan-pii-logs.job";
import { createEmailAlertService } from "@/infrastructure/alerts/AlertService";

// Configure alert service
const alertService = createEmailAlertService([
  "security@example.com",
  "compliance@example.com",
]);

// Schedule IP anonymization job (3 AM daily)
cron.schedule(IP_ANONYMIZATION_CRON, async () => {
  try {
    await anonymizeOldIPs();
  } catch (error) {
    console.error("IP anonymization job failed:", error);
  }
});

// Schedule PII log scan job (4 AM daily)
cron.schedule(PII_LOG_SCAN_CRON, async () => {
  try {
    await scanLogsForPII(alertService);
  } catch (error) {
    console.error("PII log scan job failed:", error);
  }
});
```

### Environment Variables

```bash
# Alert service configuration
ALERT_RECIPIENTS=security@example.com,compliance@example.com
ALERT_FROM=noreply@rgpd-platform.example.com

# Job configuration
IP_RETENTION_DAYS=90
LOG_SCAN_PATH=/var/log/app/*.log

# Monitoring
ENABLE_JOB_METRICS=true
```

### Manual Execution (Dev/Testing)

```bash
# Run IP anonymization job manually
npm run job:anonymize-ips

# Run PII log scan job manually
npm run job:scan-pii-logs
```

---

## Monitoring Dashboard

### Key Metrics to Track

1. **Job Execution Status**
   - Success rate (target: 100%)
   - Failure count (target: 0)
   - Last execution timestamp

2. **IP Anonymization**
   - Records anonymized per day
   - Anonymization rate (target: <5 sec/1000 records)
   - Skip rate (target: <1%)

3. **PII Log Scan**
   - Lines scanned per day
   - Leak count (target: 0)
   - Scan rate (target: <10 sec/10,000 lines)

### Grafana Dashboard (Recommended)

```yaml
Dashboard: "RGPD Compliance Jobs"
Panels:
  - Job Execution Status (last 30 days)
  - IP Anonymization Metrics (graph)
  - PII Leak Alerts (table)
  - Job Duration (histogram)
```

---

## Compliance Validation

### Monthly Checklist

- [ ] Review IP anonymization job logs (success rate)
- [ ] Verify no IP addresses older than 90 days in database
- [ ] Review PII leak alerts (should be 0)
- [ ] Test manual job execution (dev environment)
- [ ] Update runbook with new insights

### Audit Evidence

For CNIL audits, provide:
1. Job execution logs (last 12 months)
2. IP anonymization metrics (anonymized count)
3. PII leak alert history (should be empty)
4. Incident response records (if any leaks occurred)

---

## References

- [LOT8_IMPLEMENTATION.md](../implementation/LOT8_IMPLEMENTATION.md) — Implementation details
- [BOUNDARIES.md](../architecture/BOUNDARIES.md) — Architecture constraints
- [RGPD_TESTING.md](../testing/RGPD_TESTING.md) — Testing guidelines

---

**Last Updated**: 2025-12-27
**Owner**: Security Team, DevOps
**Review Cycle**: Quarterly
