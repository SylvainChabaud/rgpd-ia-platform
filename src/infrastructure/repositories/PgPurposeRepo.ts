import type {
  PurposeRepo,
  Purpose,
  CreatePurposeInput,
  UpdatePurposeInput,
  CreatePurposeFromTemplateInput,
} from "@/app/ports/PurposeRepo";
import {
  PURPOSE_CATEGORY,
  RISK_LEVEL,
  DATA_CLASS,
  VALIDATION_STATUS,
} from "@/app/ports/PurposeTemplateRepo";
import { pool } from "@/infrastructure/db/pg";
import { withTenantContext } from "@/infrastructure/db/tenantContext";
import type { QueryResult } from "pg";

/**
 * PostgreSQL implementation of PurposeRepo
 * LOT 12.2 - Purpose Templates System (RGPD-Compliant)
 *
 * Classification: P1 (technical metadata)
 * CRITICAL RGPD: ALL queries MUST include tenant_id for isolation
 */

interface PurposeRow {
  id: string;
  tenant_id: string;
  template_id: string | null;
  label: string;
  description: string;
  lawful_basis: string;
  category: string;
  risk_level: string;
  max_data_class: string;
  requires_dpia: boolean;
  is_required: boolean;
  is_active: boolean;
  is_from_template: boolean;
  is_system: boolean;
  validation_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapRowToPurpose(row: PurposeRow): Purpose {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    templateId: row.template_id,
    label: row.label,
    description: row.description,
    lawfulBasis: row.lawful_basis as Purpose['lawfulBasis'],
    category: row.category as Purpose['category'],
    riskLevel: row.risk_level as Purpose['riskLevel'],
    maxDataClass: row.max_data_class as Purpose['maxDataClass'],
    requiresDpia: row.requires_dpia,
    isRequired: row.is_required,
    isActive: row.is_active,
    isFromTemplate: row.is_from_template,
    isSystem: row.is_system,
    validationStatus: row.validation_status as Purpose['validationStatus'],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

const SELECT_COLUMNS = `
  id, tenant_id, template_id, label, description,
  lawful_basis, category, risk_level, max_data_class, requires_dpia,
  is_required, is_active, is_from_template, is_system, validation_status,
  created_at, updated_at, deleted_at
`;

export class PgPurposeRepo implements PurposeRepo {
  async findAll(tenantId: string, includeInactive: boolean = false): Promise<Purpose[]> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose queries");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const query = includeInactive
        ? `SELECT ${SELECT_COLUMNS}
           FROM purposes
           WHERE tenant_id = $1 AND deleted_at IS NULL
           ORDER BY is_from_template DESC, created_at DESC`
        : `SELECT ${SELECT_COLUMNS}
           FROM purposes
           WHERE tenant_id = $1 AND is_active = true AND deleted_at IS NULL
           ORDER BY is_from_template DESC, created_at DESC`;

      const res: QueryResult<PurposeRow> = await client.query(query, [tenantId]);
      return res.rows.map(mapRowToPurpose);
    });
  }

  async findById(tenantId: string, id: string): Promise<Purpose | null> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose queries");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<PurposeRow> = await client.query(
        `SELECT ${SELECT_COLUMNS}
         FROM purposes
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, id]
      );

      return res.rowCount ? mapRowToPurpose(res.rows[0]) : null;
    });
  }

  async findByLabel(tenantId: string, label: string): Promise<Purpose | null> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose queries");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<PurposeRow> = await client.query(
        `SELECT ${SELECT_COLUMNS}
         FROM purposes
         WHERE tenant_id = $1 AND LOWER(label) = LOWER($2) AND deleted_at IS NULL`,
        [tenantId, label]
      );

      return res.rowCount ? mapRowToPurpose(res.rows[0]) : null;
    });
  }

  async create(tenantId: string, input: CreatePurposeInput): Promise<Purpose> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose creation");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<PurposeRow> = await client.query(
        `INSERT INTO purposes (
          tenant_id, label, description,
          lawful_basis, category, risk_level, max_data_class, requires_dpia,
          is_required, is_active, is_from_template, is_system, validation_status
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, false, '${VALIDATION_STATUS.VALIDATED}')
         RETURNING ${SELECT_COLUMNS}`,
        [
          tenantId,
          input.label,
          input.description,
          input.lawfulBasis,
          input.category ?? PURPOSE_CATEGORY.AI_PROCESSING,
          input.riskLevel ?? RISK_LEVEL.MEDIUM,
          input.maxDataClass ?? DATA_CLASS.P1,
          input.requiresDpia ?? false,
          input.isRequired ?? false,
          input.isActive ?? true,
        ]
      );

      return mapRowToPurpose(res.rows[0]);
    });
  }

  async update(tenantId: string, id: string, input: UpdatePurposeInput): Promise<Purpose | null> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose update");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Build dynamic update query
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 3; // $1 = tenantId, $2 = id

      if (input.label !== undefined) {
        fields.push(`label = $${paramIndex++}`);
        values.push(input.label);
      }
      if (input.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      if (input.isRequired !== undefined) {
        fields.push(`is_required = $${paramIndex++}`);
        values.push(input.isRequired);
      }
      if (input.isActive !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(input.isActive);
      }

      if (fields.length === 0) {
        // No fields to update, just return current purpose
        return this.findById(tenantId, id);
      }

      const res: QueryResult<PurposeRow> = await client.query(
        `UPDATE purposes
         SET ${fields.join(", ")}, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
         RETURNING ${SELECT_COLUMNS}`,
        [tenantId, id, ...values]
      );

      return res.rowCount ? mapRowToPurpose(res.rows[0]) : null;
    });
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose deletion");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Check if this is a system purpose (cannot be deleted)
      const existing = await this.findById(tenantId, id);
      if (existing?.isSystem) {
        throw new Error("Cannot delete system purpose. Deactivate it instead.");
      }

      const res = await client.query(
        `UPDATE purposes
         SET deleted_at = NOW(), is_active = false, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, id]
      );

      return (res.rowCount ?? 0) > 0;
    });
  }

  async countConsents(tenantId: string, purposeId: string): Promise<number> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for consent count");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Count consents that reference this purpose by purpose_id OR by matching label
      const purpose = await this.findById(tenantId, purposeId);
      if (!purpose) {
        return 0;
      }

      const res = await client.query(
        `SELECT COUNT(*) as count
         FROM consents
         WHERE tenant_id = $1 AND (purpose_id = $2 OR purpose = $3)`,
        [tenantId, purposeId, purpose.label]
      );

      return parseInt(res.rows[0].count, 10);
    });
  }

  // =========================
  // Template-related methods
  // =========================

  async createFromTemplate(tenantId: string, input: CreatePurposeFromTemplateInput): Promise<Purpose> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose creation");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // First, get the template
      const templateRes = await client.query(
        `SELECT id, name, description, lawful_basis, category, risk_level,
                max_data_class, requires_dpia, is_ai_purpose
         FROM purpose_templates
         WHERE id = $1 AND is_active = true`,
        [input.templateId]
      );

      if (templateRes.rowCount === 0) {
        throw new Error("Template not found or inactive");
      }

      const template = templateRes.rows[0];

      // Check if already adopted
      const existingRes = await client.query(
        `SELECT id FROM purposes
         WHERE tenant_id = $1 AND template_id = $2 AND deleted_at IS NULL`,
        [tenantId, input.templateId]
      );

      if (existingRes.rowCount && existingRes.rowCount > 0) {
        throw new Error("Template already adopted by this tenant");
      }

      // Create purpose from template
      const res: QueryResult<PurposeRow> = await client.query(
        `INSERT INTO purposes (
          tenant_id, template_id, label, description,
          lawful_basis, category, risk_level, max_data_class, requires_dpia,
          is_required, is_active, is_from_template, is_system, validation_status
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, true, true, '${VALIDATION_STATUS.VALIDATED}')
         RETURNING ${SELECT_COLUMNS}`,
        [
          tenantId,
          input.templateId,
          input.label ?? template.name,
          input.description ?? template.description,
          template.lawful_basis,
          template.category,
          template.risk_level,
          template.max_data_class,
          template.requires_dpia,
          input.isRequired ?? false,
        ]
      );

      return mapRowToPurpose(res.rows[0]);
    });
  }

  async findByTemplateId(tenantId: string, templateId: string): Promise<Purpose | null> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose queries");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<PurposeRow> = await client.query(
        `SELECT ${SELECT_COLUMNS}
         FROM purposes
         WHERE tenant_id = $1 AND template_id = $2 AND deleted_at IS NULL`,
        [tenantId, templateId]
      );

      return res.rowCount ? mapRowToPurpose(res.rows[0]) : null;
    });
  }

  async findSystemPurposes(tenantId: string): Promise<Purpose[]> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose queries");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<PurposeRow> = await client.query(
        `SELECT ${SELECT_COLUMNS}
         FROM purposes
         WHERE tenant_id = $1 AND is_from_template = true AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [tenantId]
      );

      return res.rows.map(mapRowToPurpose);
    });
  }

  async findCustomPurposes(tenantId: string): Promise<Purpose[]> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose queries");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<PurposeRow> = await client.query(
        `SELECT ${SELECT_COLUMNS}
         FROM purposes
         WHERE tenant_id = $1 AND is_from_template = false AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [tenantId]
      );

      return res.rows.map(mapRowToPurpose);
    });
  }

  async isTemplateAdopted(tenantId: string, templateId: string): Promise<boolean> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purpose queries");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `SELECT 1 FROM purposes
         WHERE tenant_id = $1 AND template_id = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [tenantId, templateId]
      );

      return (res.rowCount ?? 0) > 0;
    });
  }
}
