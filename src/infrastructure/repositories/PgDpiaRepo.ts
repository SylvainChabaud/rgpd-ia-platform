/**
 * PostgreSQL implementation of DpiaRepo
 * LOT 12.4 - Fonctionnalités DPO (DPIA + Registre Art. 30)
 *
 * Classification: P1 (technical metadata)
 * CRITICAL RGPD: ALL queries MUST include tenant_id for isolation
 *
 * Art. 35: DPIA records management
 * Art. 38.3: DPO-only validation
 */

import type {
  DpiaRepo,
  DpiaListParams,
  DpiaStats,
} from '@/app/ports/DpiaRepo';
import type {
  Dpia,
  DpiaRisk,
  CreateDpiaInput,
  CreateDpiaRiskInput,
  UpdateDpiaInput,
} from '@/domain/dpia';
import {
  DPIA_STATUS,
  getRiskTemplate,
} from '@/domain/dpia';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import type { QueryResult } from 'pg';

// =============================================================================
// Row mappers
// =============================================================================

interface DpiaRow {
  id: string;
  tenant_id: string;
  purpose_id: string;
  title: string;
  description: string;
  overall_risk_level: string;
  data_processed: string[];
  data_classification: string;
  security_measures: string[];
  status: string;
  dpo_comments: string | null;
  validated_at: string | null;
  validated_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Revision request fields (LOT 12.4)
  revision_requested_at: string | null;
  revision_requested_by: string | null;
  revision_comments: string | null;
  // Joined fields
  purpose_label?: string;
  purpose_is_active?: boolean;
}

interface DpiaRiskRow {
  id: string;
  dpia_id: string;
  tenant_id: string;
  risk_name: string;
  description: string;
  likelihood: string;
  impact: string;
  mitigation: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapRowToDpia(row: DpiaRow): Dpia {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    purposeId: row.purpose_id,
    title: row.title,
    description: row.description,
    overallRiskLevel: row.overall_risk_level as Dpia['overallRiskLevel'],
    dataProcessed: Object.freeze(row.data_processed || []),
    dataClassification: row.data_classification as Dpia['dataClassification'],
    securityMeasures: Object.freeze(row.security_measures || []),
    status: row.status as Dpia['status'],
    dpoComments: row.dpo_comments,
    validatedAt: row.validated_at ? new Date(row.validated_at) : null,
    validatedBy: row.validated_by,
    rejectionReason: row.rejection_reason,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    revisionRequestedAt: row.revision_requested_at ? new Date(row.revision_requested_at) : null,
    revisionRequestedBy: row.revision_requested_by,
    revisionComments: row.revision_comments,
    purposeLabel: row.purpose_label,
    purposeIsActive: row.purpose_is_active,
  };
}

function mapRowToDpiaRisk(row: DpiaRiskRow): DpiaRisk {
  return {
    id: row.id,
    dpiaId: row.dpia_id,
    tenantId: row.tenant_id,
    riskName: row.risk_name,
    description: row.description,
    likelihood: row.likelihood as DpiaRisk['likelihood'],
    impact: row.impact as DpiaRisk['impact'],
    mitigation: row.mitigation,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// =============================================================================
// SQL constants
// =============================================================================

const DPIA_COLUMNS = [
  'id', 'tenant_id', 'purpose_id', 'title', 'description',
  'overall_risk_level', 'data_processed', 'data_classification',
  'security_measures', 'status', 'dpo_comments',
  'validated_at', 'validated_by', 'rejection_reason',
  'created_at', 'updated_at', 'deleted_at',
  'revision_requested_at', 'revision_requested_by', 'revision_comments'
];

const DPIA_SELECT_COLUMNS = DPIA_COLUMNS.join(', ');

// Helper to prefix columns with table alias
function prefixColumns(columns: string[], alias: string): string {
  return columns.map(c => `${alias}.${c}`).join(', ');
}

const DPIA_RISK_SELECT_COLUMNS = `
  id, dpia_id, tenant_id, risk_name, description,
  likelihood, impact, mitigation, sort_order,
  created_at, updated_at
`;

// =============================================================================
// PgDpiaRepo implementation
// =============================================================================

export class PgDpiaRepo implements DpiaRepo {
  // =========================================================================
  // DPIA Operations
  // =========================================================================

  async findAll(tenantId: string, params?: DpiaListParams): Promise<Dpia[]> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA queries');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const where: string[] = ['d.tenant_id = $1', 'd.deleted_at IS NULL'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (params?.status) {
        where.push(`d.status = $${paramIndex++}`);
        values.push(params.status);
      }

      if (params?.riskLevel) {
        where.push(`d.overall_risk_level = $${paramIndex++}`);
        values.push(params.riskLevel);
      }

      if (params?.purposeId) {
        where.push(`d.purpose_id = $${paramIndex++}`);
        values.push(params.purposeId);
      }

      let query = `
        SELECT ${prefixColumns(DPIA_COLUMNS, 'd')},
               p.label as purpose_label,
               p.is_active as purpose_is_active
        FROM dpias d
        LEFT JOIN purposes p ON d.purpose_id = p.id
        WHERE ${where.join(' AND ')}
        ORDER BY d.created_at DESC
      `;

      if (params?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(params.limit);
      }

      if (params?.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(params.offset);
      }

      const res: QueryResult<DpiaRow> = await client.query(query, values);
      return res.rows.map(mapRowToDpia);
    });
  }

  async findById(tenantId: string, id: string): Promise<Dpia | null> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA queries');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Get DPIA with purpose label and active status
      const dpiaRes: QueryResult<DpiaRow> = await client.query(
        `SELECT ${prefixColumns(DPIA_COLUMNS, 'd')},
                p.label as purpose_label,
                p.is_active as purpose_is_active
         FROM dpias d
         LEFT JOIN purposes p ON d.purpose_id = p.id
         WHERE d.tenant_id = $1 AND d.id = $2 AND d.deleted_at IS NULL`,
        [tenantId, id]
      );

      if (dpiaRes.rowCount === 0) {
        return null;
      }

      const dpia = mapRowToDpia(dpiaRes.rows[0]);

      // Get risks
      const risksRes: QueryResult<DpiaRiskRow> = await client.query(
        `SELECT ${DPIA_RISK_SELECT_COLUMNS}
         FROM dpia_risks
         WHERE tenant_id = $1 AND dpia_id = $2
         ORDER BY sort_order ASC`,
        [tenantId, id]
      );

      return {
        ...dpia,
        risks: Object.freeze(risksRes.rows.map(mapRowToDpiaRisk)),
      };
    });
  }

  async findByPurposeId(tenantId: string, purposeId: string): Promise<Dpia | null> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA queries');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DpiaRow> = await client.query(
        `SELECT ${DPIA_SELECT_COLUMNS}
         FROM dpias
         WHERE tenant_id = $1 AND purpose_id = $2 AND deleted_at IS NULL`,
        [tenantId, purposeId]
      );

      return res.rowCount ? mapRowToDpia(res.rows[0]) : null;
    });
  }

  /**
   * Batch fetch DPIAs by multiple purpose IDs
   * Optimized to avoid N+1 queries
   */
  async findByPurposeIds(tenantId: string, purposeIds: string[]): Promise<Dpia[]> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA queries');
    }

    if (purposeIds.length === 0) {
      return [];
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DpiaRow> = await client.query(
        `SELECT ${DPIA_SELECT_COLUMNS}
         FROM dpias
         WHERE tenant_id = $1 AND purpose_id = ANY($2) AND deleted_at IS NULL`,
        [tenantId, purposeIds]
      );

      return res.rows.map(mapRowToDpia);
    });
  }

  async create(tenantId: string, input: CreateDpiaInput): Promise<Dpia> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA creation');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Check if DPIA already exists for this purpose
      const existingRes = await client.query(
        `SELECT id FROM dpias WHERE tenant_id = $1 AND purpose_id = $2 AND deleted_at IS NULL`,
        [tenantId, input.purposeId]
      );

      if (existingRes.rowCount && existingRes.rowCount > 0) {
        throw new Error('DPIA already exists for this purpose');
      }

      // Create DPIA
      const dpiaRes: QueryResult<DpiaRow> = await client.query(
        `INSERT INTO dpias (
          tenant_id, purpose_id, title, description,
          overall_risk_level, data_processed, data_classification,
          security_measures, status
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${DPIA_SELECT_COLUMNS}`,
        [
          tenantId,
          input.purposeId,
          input.title,
          input.description,
          input.overallRiskLevel ?? 'MEDIUM',
          input.dataProcessed ?? [],
          input.dataClassification ?? 'P1',
          input.securityMeasures ?? [],
          DPIA_STATUS.PENDING,
        ]
      );

      const dpia = mapRowToDpia(dpiaRes.rows[0]);

      // Auto-generate risks based on risk level template
      const riskTemplate = getRiskTemplate(dpia.overallRiskLevel);
      const risks: DpiaRisk[] = [];

      for (const template of riskTemplate) {
        const riskRes: QueryResult<DpiaRiskRow> = await client.query(
          `INSERT INTO dpia_risks (
            dpia_id, tenant_id, risk_name, description,
            likelihood, impact, mitigation, sort_order
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING ${DPIA_RISK_SELECT_COLUMNS}`,
          [
            dpia.id,
            tenantId,
            template.riskName,
            template.description,
            template.likelihood ?? 'MEDIUM',
            template.impact ?? 'MEDIUM',
            template.mitigation,
            template.sortOrder ?? 0,
          ]
        );

        risks.push(mapRowToDpiaRisk(riskRes.rows[0]));
      }

      return {
        ...dpia,
        risks: Object.freeze(risks),
      };
    });
  }

  async update(tenantId: string, id: string, input: UpdateDpiaInput): Promise<Dpia | null> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA update');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Check if DPIA exists and is still pending
      const existingRes: QueryResult<DpiaRow> = await client.query(
        `SELECT status FROM dpias WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, id]
      );

      if (existingRes.rowCount === 0) {
        return null;
      }

      if (existingRes.rows[0].status !== DPIA_STATUS.PENDING) {
        throw new Error('Cannot update validated DPIA');
      }

      // Build dynamic update query
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 3;

      if (input.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(input.title);
      }
      if (input.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      if (input.dpoComments !== undefined) {
        fields.push(`dpo_comments = $${paramIndex++}`);
        values.push(input.dpoComments);
      }
      if (input.securityMeasures !== undefined) {
        fields.push(`security_measures = $${paramIndex++}`);
        values.push(input.securityMeasures);
      }

      if (fields.length === 0) {
        return this.findById(tenantId, id);
      }

      const res: QueryResult<DpiaRow> = await client.query(
        `UPDATE dpias
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
         RETURNING ${DPIA_SELECT_COLUMNS}`,
        [tenantId, id, ...values]
      );

      return res.rowCount ? mapRowToDpia(res.rows[0]) : null;
    });
  }

  async validate(
    tenantId: string,
    id: string,
    validatedBy: string,
    status: 'APPROVED' | 'REJECTED',
    dpoComments?: string,
    rejectionReason?: string
  ): Promise<Dpia | null> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA validation');
    }

    if (status === DPIA_STATUS.REJECTED && !rejectionReason) {
      throw new Error('Rejection reason is required');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Check if DPIA exists and is still pending
      const existingRes: QueryResult<DpiaRow> = await client.query(
        `SELECT status FROM dpias WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, id]
      );

      if (existingRes.rowCount === 0) {
        return null;
      }

      if (existingRes.rows[0].status !== DPIA_STATUS.PENDING) {
        throw new Error('DPIA is already validated');
      }

      const res: QueryResult<DpiaRow> = await client.query(
        `UPDATE dpias
         SET status = $3,
             validated_at = NOW(),
             validated_by = $4,
             dpo_comments = COALESCE($5, dpo_comments),
             rejection_reason = $6,
             updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
         RETURNING ${DPIA_SELECT_COLUMNS}`,
        [tenantId, id, status, validatedBy, dpoComments, rejectionReason]
      );

      if (res.rowCount === 0) {
        return null;
      }

      // Return with risks
      return this.findById(tenantId, id);
    });
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA deletion');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `UPDATE dpias
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, id]
      );

      return (res.rowCount ?? 0) > 0;
    });
  }

  async getStats(tenantId: string): Promise<DpiaStats> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA stats');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
           COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
           COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
           COUNT(*) FILTER (WHERE overall_risk_level = 'LOW') as risk_low,
           COUNT(*) FILTER (WHERE overall_risk_level = 'MEDIUM') as risk_medium,
           COUNT(*) FILTER (WHERE overall_risk_level = 'HIGH') as risk_high,
           COUNT(*) FILTER (WHERE overall_risk_level = 'CRITICAL') as risk_critical
         FROM dpias
         WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId]
      );

      const row = res.rows[0];
      return {
        total: parseInt(row.total, 10),
        pending: parseInt(row.pending, 10),
        approved: parseInt(row.approved, 10),
        rejected: parseInt(row.rejected, 10),
        byRiskLevel: {
          low: parseInt(row.risk_low, 10),
          medium: parseInt(row.risk_medium, 10),
          high: parseInt(row.risk_high, 10),
          critical: parseInt(row.risk_critical, 10),
        },
      };
    });
  }

  // =========================================================================
  // Risk Operations
  // =========================================================================

  async findRisksByDpiaId(tenantId: string, dpiaId: string): Promise<DpiaRisk[]> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for risk queries');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DpiaRiskRow> = await client.query(
        `SELECT ${DPIA_RISK_SELECT_COLUMNS}
         FROM dpia_risks
         WHERE tenant_id = $1 AND dpia_id = $2
         ORDER BY sort_order ASC`,
        [tenantId, dpiaId]
      );

      return res.rows.map(mapRowToDpiaRisk);
    });
  }

  async createRisk(tenantId: string, input: CreateDpiaRiskInput): Promise<DpiaRisk> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for risk creation');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Verify DPIA exists
      const dpiaRes = await client.query(
        `SELECT id FROM dpias WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, input.dpiaId]
      );

      if (dpiaRes.rowCount === 0) {
        throw new Error('DPIA not found');
      }

      const res: QueryResult<DpiaRiskRow> = await client.query(
        `INSERT INTO dpia_risks (
          dpia_id, tenant_id, risk_name, description,
          likelihood, impact, mitigation, sort_order
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${DPIA_RISK_SELECT_COLUMNS}`,
        [
          input.dpiaId,
          tenantId,
          input.riskName,
          input.description,
          input.likelihood ?? 'MEDIUM',
          input.impact ?? 'MEDIUM',
          input.mitigation,
          input.sortOrder ?? 0,
        ]
      );

      return mapRowToDpiaRisk(res.rows[0]);
    });
  }

  async updateRisk(
    tenantId: string,
    riskId: string,
    input: Partial<Omit<CreateDpiaRiskInput, 'dpiaId' | 'tenantId'>>
  ): Promise<DpiaRisk | null> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for risk update');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 3;

      if (input.riskName !== undefined) {
        fields.push(`risk_name = $${paramIndex++}`);
        values.push(input.riskName);
      }
      if (input.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      if (input.likelihood !== undefined) {
        fields.push(`likelihood = $${paramIndex++}`);
        values.push(input.likelihood);
      }
      if (input.impact !== undefined) {
        fields.push(`impact = $${paramIndex++}`);
        values.push(input.impact);
      }
      if (input.mitigation !== undefined) {
        fields.push(`mitigation = $${paramIndex++}`);
        values.push(input.mitigation);
      }
      if (input.sortOrder !== undefined) {
        fields.push(`sort_order = $${paramIndex++}`);
        values.push(input.sortOrder);
      }

      if (fields.length === 0) {
        // No fields to update
        const res: QueryResult<DpiaRiskRow> = await client.query(
          `SELECT ${DPIA_RISK_SELECT_COLUMNS}
           FROM dpia_risks
           WHERE tenant_id = $1 AND id = $2`,
          [tenantId, riskId]
        );
        return res.rowCount ? mapRowToDpiaRisk(res.rows[0]) : null;
      }

      const res: QueryResult<DpiaRiskRow> = await client.query(
        `UPDATE dpia_risks
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${DPIA_RISK_SELECT_COLUMNS}`,
        [tenantId, riskId, ...values]
      );

      return res.rowCount ? mapRowToDpiaRisk(res.rows[0]) : null;
    });
  }

  async deleteRisk(tenantId: string, riskId: string): Promise<boolean> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for risk deletion');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `DELETE FROM dpia_risks WHERE tenant_id = $1 AND id = $2`,
        [tenantId, riskId]
      );

      return (res.rowCount ?? 0) > 0;
    });
  }

  // =========================================================================
  // Registre Art. 30 Helpers
  // =========================================================================

  async findAllWithPurposeInfo(tenantId: string): Promise<Dpia[]> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA queries');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DpiaRow> = await client.query(
        `SELECT ${prefixColumns(DPIA_COLUMNS, 'd')},
                p.label as purpose_label,
                p.is_active as purpose_is_active
         FROM dpias d
         LEFT JOIN purposes p ON d.purpose_id = p.id
         WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
         ORDER BY d.created_at DESC`,
        [tenantId]
      );

      return res.rows.map(mapRowToDpia);
    });
  }

  // =========================================================================
  // Revision Request (LOT 12.4)
  // =========================================================================

  /**
   * Request revision of a rejected DPIA
   * Tenant Admin can request DPO to re-review a rejected DPIA
   * This resets status to PENDING and records revision request info
   *
   * RGPD: Art. 35.11 - Review required when processing changes
   */
  async requestRevision(
    tenantId: string,
    dpiaId: string,
    requestedBy: string,
    revisionComments: string
  ): Promise<Dpia | null> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA revision request');
    }

    if (!revisionComments || revisionComments.trim().length < 10) {
      throw new Error('Revision comments must be at least 10 characters');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Check if DPIA exists and is rejected
      const existingRes: QueryResult<DpiaRow> = await client.query(
        `SELECT status FROM dpias WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, dpiaId]
      );

      if (existingRes.rowCount === 0) {
        return null;
      }

      if (existingRes.rows[0].status !== DPIA_STATUS.REJECTED) {
        throw new Error('Only rejected DPIAs can request revision');
      }

      // Reset to PENDING with revision request info
      const res: QueryResult<DpiaRow> = await client.query(
        `UPDATE dpias
         SET status = $3,
             revision_requested_at = NOW(),
             revision_requested_by = $4,
             revision_comments = $5,
             validated_at = NULL,
             validated_by = NULL,
             rejection_reason = NULL,
             updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
         RETURNING ${DPIA_SELECT_COLUMNS}`,
        [tenantId, dpiaId, DPIA_STATUS.PENDING, requestedBy, revisionComments.trim()]
      );

      if (res.rowCount === 0) {
        return null;
      }

      // Return with risks
      return this.findById(tenantId, dpiaId);
    });
  }
}
