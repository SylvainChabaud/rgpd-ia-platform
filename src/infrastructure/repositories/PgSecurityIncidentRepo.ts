/**
 * PostgreSQL implementation of SecurityIncidentRepo
 *
 * RGPD Compliance:
 * - Art. 33.5: Registre des violations (append-only)
 * - Art. 33: Notification CNIL tracking
 * - Art. 34: Users notification tracking
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 */

import { pool } from "@/infrastructure/db/pg";
import {
  withTenantContext,
  withPlatformContext,
} from "@/infrastructure/db/tenantContext";
import { randomUUID } from "crypto";
import type {
  SecurityIncident,
  CreateSecurityIncidentInput,
  IncidentSeverity,
  IncidentType,
  DataCategory,
} from "@/domain/incident/SecurityIncident";
import type {
  SecurityIncidentRepo,
  IncidentFilters,
  PaginationOptions,
  PaginatedResult,
  UpdateSecurityIncidentInput,
} from "@/domain/incident/SecurityIncidentRepo";

// =============================================================================
// HELPER: Map DB row to domain entity
// =============================================================================

function mapRowToIncident(row: Record<string, unknown>): SecurityIncident {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string | null,
    severity: row.severity as IncidentSeverity,
    type: row.type as IncidentType,
    title: row.title as string,
    description: row.description as string,
    dataCategories: (row.data_categories as DataCategory[]) || [],
    usersAffected: (row.users_affected as number) || 0,
    recordsAffected: (row.records_affected as number) || 0,
    riskLevel: row.risk_level as SecurityIncident["riskLevel"],
    cnilNotified: row.cnil_notified as boolean,
    cnilNotifiedAt: row.cnil_notified_at
      ? new Date(row.cnil_notified_at as string)
      : null,
    cnilReference: row.cnil_reference as string | null,
    usersNotified: row.users_notified as boolean,
    usersNotifiedAt: row.users_notified_at
      ? new Date(row.users_notified_at as string)
      : null,
    remediationActions: row.remediation_actions as string | null,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : null,
    detectedAt: new Date(row.detected_at as string),
    detectedBy: row.detected_by as SecurityIncident["detectedBy"],
    sourceIp: row.source_ip as string | null,
    createdBy: row.created_by as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

export class PgSecurityIncidentRepo implements SecurityIncidentRepo {
  /**
   * Create a new security incident
   */
  async create(input: CreateSecurityIncidentInput): Promise<SecurityIncident> {
    const id = randomUUID();
    const now = new Date();

    return await withPlatformContext(pool, async (client) => {
      const result = await client.query(
        `INSERT INTO security_incidents (
          id, tenant_id, severity, type, title, description,
          data_categories, users_affected, records_affected, risk_level,
          detected_by, source_ip, created_by, detected_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16
        ) RETURNING *`,
        [
          id,
          input.tenantId ?? null,
          input.severity,
          input.type,
          input.title,
          input.description,
          input.dataCategories ?? [],
          input.usersAffected ?? 0,
          input.recordsAffected ?? 0,
          input.riskLevel ?? "UNKNOWN",
          input.detectedBy ?? "SYSTEM",
          input.sourceIp ?? null,
          input.createdBy ?? null,
          now,
          now,
          now,
        ]
      );

      // Log to audit table
      await client.query(
        `INSERT INTO incident_audit_log (incident_id, action, new_values, actor_id, actor_role)
         VALUES ($1, 'CREATED', $2, $3, $4)`,
        [
          id,
          JSON.stringify({
            severity: input.severity,
            type: input.type,
            title: input.title,
            riskLevel: input.riskLevel ?? "UNKNOWN",
          }),
          input.createdBy ?? null,
          "SYSTEM",
        ]
      );

      return mapRowToIncident(result.rows[0]);
    });
  }

  /**
   * Find incident by ID
   */
  async findById(
    incidentId: string,
    tenantId?: string | null
  ): Promise<SecurityIncident | null> {
    // If tenantId provided, use tenant context (for tenant admin)
    if (tenantId) {
      return await withTenantContext(pool, tenantId, async (client) => {
        const result = await client.query(
          `SELECT * FROM security_incidents WHERE id = $1 AND tenant_id = $2`,
          [incidentId, tenantId]
        );
        return result.rows.length > 0 ? mapRowToIncident(result.rows[0]) : null;
      });
    }

    // Platform context (SUPER_ADMIN / DPO)
    return await withPlatformContext(pool, async (client) => {
      const result = await client.query(
        `SELECT * FROM security_incidents WHERE id = $1`,
        [incidentId]
      );
      return result.rows.length > 0 ? mapRowToIncident(result.rows[0]) : null;
    });
  }

  /**
   * Find all incidents with filters and pagination
   */
  async findAll(
    filters?: IncidentFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SecurityIncident>> {
    return await withPlatformContext(pool, async (client) => {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (filters?.tenantId !== undefined) {
        if (filters.tenantId === null) {
          conditions.push("tenant_id IS NULL");
        } else {
          conditions.push(`tenant_id = $${paramIndex++}`);
          params.push(filters.tenantId);
        }
      }

      if (filters?.severity) {
        const severities = Array.isArray(filters.severity)
          ? filters.severity
          : [filters.severity];
        conditions.push(`severity = ANY($${paramIndex++})`);
        params.push(severities);
      }

      if (filters?.type) {
        const types = Array.isArray(filters.type)
          ? filters.type
          : [filters.type];
        conditions.push(`type = ANY($${paramIndex++})`);
        params.push(types);
      }

      if (filters?.riskLevel) {
        const riskLevels = Array.isArray(filters.riskLevel)
          ? filters.riskLevel
          : [filters.riskLevel];
        conditions.push(`risk_level = ANY($${paramIndex++})`);
        params.push(riskLevels);
      }

      if (filters?.resolved !== undefined) {
        conditions.push(
          filters.resolved ? "resolved_at IS NOT NULL" : "resolved_at IS NULL"
        );
      }

      if (filters?.cnilNotified !== undefined) {
        conditions.push(`cnil_notified = $${paramIndex++}`);
        params.push(filters.cnilNotified);
      }

      if (filters?.usersNotified !== undefined) {
        conditions.push(`users_notified = $${paramIndex++}`);
        params.push(filters.usersNotified);
      }

      if (filters?.detectedAfter) {
        conditions.push(`detected_at >= $${paramIndex++}`);
        params.push(filters.detectedAfter);
      }

      if (filters?.detectedBefore) {
        conditions.push(`detected_at <= $${paramIndex++}`);
        params.push(filters.detectedBefore);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Pagination
      const limit = pagination?.limit ?? 50;
      const offset = pagination?.offset ?? 0;
      const orderBy = pagination?.orderBy ?? "detected_at";
      const orderDir = pagination?.orderDir ?? "DESC";

      // Count total
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM security_incidents ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // Fetch data
      const dataResult = await client.query(
        `SELECT * FROM security_incidents ${whereClause}
         ORDER BY ${orderBy} ${orderDir}
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      );

      return {
        data: dataResult.rows.map(mapRowToIncident),
        total,
        limit,
        offset,
      };
    });
  }

  /**
   * Find incidents by tenant
   */
  async findByTenant(
    tenantId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SecurityIncident>> {
    return this.findAll({ tenantId }, pagination);
  }

  /**
   * Find unresolved incidents
   */
  async findUnresolved(
    filters?: IncidentFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SecurityIncident>> {
    return this.findAll({ ...filters, resolved: false }, pagination);
  }

  /**
   * Find incidents pending CNIL notification (HIGH risk, not notified, < 72h)
   */
  async findPendingCnilNotification(): Promise<SecurityIncident[]> {
    return await withPlatformContext(pool, async (client) => {
      const result = await client.query(
        `SELECT * FROM security_incidents
         WHERE risk_level IN ('HIGH', 'MEDIUM')
           AND cnil_notified = FALSE
           AND detected_at > NOW() - INTERVAL '72 hours'
         ORDER BY detected_at ASC`
      );
      return result.rows.map(mapRowToIncident);
    });
  }

  /**
   * Update incident details
   */
  async update(
    incidentId: string,
    input: UpdateSecurityIncidentInput,
    actorId?: string
  ): Promise<SecurityIncident> {
    return await withPlatformContext(pool, async (client) => {
      // Get old values for audit
      const oldResult = await client.query(
        `SELECT * FROM security_incidents WHERE id = $1`,
        [incidentId]
      );

      if (oldResult.rows.length === 0) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      const oldValues = oldResult.rows[0];

      // Build SET clause dynamically
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (input.severity !== undefined) {
        updates.push(`severity = $${paramIndex++}`);
        params.push(input.severity);
      }
      if (input.type !== undefined) {
        updates.push(`type = $${paramIndex++}`);
        params.push(input.type);
      }
      if (input.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        params.push(input.title);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(input.description);
      }
      if (input.dataCategories !== undefined) {
        updates.push(`data_categories = $${paramIndex++}`);
        params.push(input.dataCategories);
      }
      if (input.usersAffected !== undefined) {
        updates.push(`users_affected = $${paramIndex++}`);
        params.push(input.usersAffected);
      }
      if (input.recordsAffected !== undefined) {
        updates.push(`records_affected = $${paramIndex++}`);
        params.push(input.recordsAffected);
      }
      if (input.riskLevel !== undefined) {
        updates.push(`risk_level = $${paramIndex++}`);
        params.push(input.riskLevel);
      }
      if (input.remediationActions !== undefined) {
        updates.push(`remediation_actions = $${paramIndex++}`);
        params.push(input.remediationActions);
      }

      updates.push(`updated_at = $${paramIndex++}`);
      params.push(new Date());

      params.push(incidentId);

      const result = await client.query(
        `UPDATE security_incidents
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex}
         RETURNING *`,
        params
      );

      // Log to audit
      await client.query(
        `INSERT INTO incident_audit_log (incident_id, action, old_values, new_values, actor_id)
         VALUES ($1, 'UPDATED', $2, $3, $4)`,
        [incidentId, JSON.stringify(oldValues), JSON.stringify(input), actorId]
      );

      return mapRowToIncident(result.rows[0]);
    });
  }

  /**
   * Mark incident as notified to CNIL
   */
  async markCnilNotified(
    incidentId: string,
    cnilReference?: string,
    actorId?: string
  ): Promise<SecurityIncident> {
    return await withPlatformContext(pool, async (client) => {
      const now = new Date();

      const result = await client.query(
        `UPDATE security_incidents
         SET cnil_notified = TRUE, cnil_notified_at = $1, cnil_reference = $2, updated_at = $3
         WHERE id = $4
         RETURNING *`,
        [now, cnilReference ?? null, now, incidentId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      // Log to audit
      await client.query(
        `INSERT INTO incident_audit_log (incident_id, action, new_values, actor_id)
         VALUES ($1, 'CNIL_NOTIFIED', $2, $3)`,
        [
          incidentId,
          JSON.stringify({ cnilNotifiedAt: now, cnilReference }),
          actorId,
        ]
      );

      return mapRowToIncident(result.rows[0]);
    });
  }

  /**
   * Mark users as notified
   */
  async markUsersNotified(
    incidentId: string,
    actorId?: string
  ): Promise<SecurityIncident> {
    return await withPlatformContext(pool, async (client) => {
      const now = new Date();

      const result = await client.query(
        `UPDATE security_incidents
         SET users_notified = TRUE, users_notified_at = $1, updated_at = $2
         WHERE id = $3
         RETURNING *`,
        [now, now, incidentId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      // Log to audit
      await client.query(
        `INSERT INTO incident_audit_log (incident_id, action, new_values, actor_id)
         VALUES ($1, 'USERS_NOTIFIED', $2, $3)`,
        [incidentId, JSON.stringify({ usersNotifiedAt: now }), actorId]
      );

      return mapRowToIncident(result.rows[0]);
    });
  }

  /**
   * Mark incident as resolved
   */
  async markResolved(
    incidentId: string,
    remediationActions: string,
    actorId?: string
  ): Promise<SecurityIncident> {
    return await withPlatformContext(pool, async (client) => {
      const now = new Date();

      const result = await client.query(
        `UPDATE security_incidents
         SET resolved_at = $1, remediation_actions = $2, updated_at = $3
         WHERE id = $4
         RETURNING *`,
        [now, remediationActions, now, incidentId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      // Log to audit
      await client.query(
        `INSERT INTO incident_audit_log (incident_id, action, new_values, actor_id)
         VALUES ($1, 'RESOLVED', $2, $3)`,
        [
          incidentId,
          JSON.stringify({ resolvedAt: now, remediationActions }),
          actorId,
        ]
      );

      return mapRowToIncident(result.rows[0]);
    });
  }

  /**
   * Count incidents by severity
   */
  async countBySeverity(
    tenantId?: string | null
  ): Promise<Record<IncidentSeverity, number>> {
    return await withPlatformContext(pool, async (client) => {
      const tenantCondition = tenantId
        ? "WHERE tenant_id = $1"
        : tenantId === null
          ? "WHERE tenant_id IS NULL"
          : "";

      const params = tenantId ? [tenantId] : [];

      const result = await client.query(
        `SELECT severity, COUNT(*) as count
         FROM security_incidents
         ${tenantCondition}
         GROUP BY severity`,
        params
      );

      const counts: Record<IncidentSeverity, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      };

      for (const row of result.rows) {
        counts[row.severity as IncidentSeverity] = parseInt(row.count, 10);
      }

      return counts;
    });
  }

  /**
   * Count incidents by type
   */
  async countByType(
    tenantId?: string | null
  ): Promise<Record<IncidentType, number>> {
    return await withPlatformContext(pool, async (client) => {
      const tenantCondition = tenantId
        ? "WHERE tenant_id = $1"
        : tenantId === null
          ? "WHERE tenant_id IS NULL"
          : "";

      const params = tenantId ? [tenantId] : [];

      const result = await client.query(
        `SELECT type, COUNT(*) as count
         FROM security_incidents
         ${tenantCondition}
         GROUP BY type`,
        params
      );

      const counts: Record<IncidentType, number> = {
        UNAUTHORIZED_ACCESS: 0,
        CROSS_TENANT_ACCESS: 0,
        DATA_LEAK: 0,
        PII_IN_LOGS: 0,
        DATA_LOSS: 0,
        SERVICE_UNAVAILABLE: 0,
        MALWARE: 0,
        VULNERABILITY_EXPLOITED: 0,
        OTHER: 0,
      };

      for (const row of result.rows) {
        counts[row.type as IncidentType] = parseInt(row.count, 10);
      }

      return counts;
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const securityIncidentRepo = new PgSecurityIncidentRepo();
