/**
 * PgPurposeTemplateRepo - PostgreSQL implementation
 * LOT 12.2 - Purpose Templates System (RGPD-Compliant)
 *
 * Classification: P0 (technical metadata, no personal data)
 * Purpose: manage platform-level purpose templates in PostgreSQL
 *
 * RGPD Notes:
 * - Templates are platform-level (NOT tenant-scoped)
 * - Read-only for tenants (full access for platform admins)
 * - No personal data stored
 */

import { Pool } from 'pg';
import {
  PurposeTemplate,
  PurposeTemplateRepo,
  CreateTemplateInput,
  UpdateTemplateInput,
  PurposeCategory,
  RiskLevel,
  LawfulBasis,
  DataClass,
  Sector,
  DATA_CLASS,
  SECTOR,
  DEFAULT_TEMPLATE_RETENTION_DAYS,
} from '@/app/ports/PurposeTemplateRepo';

// =========================
// Database Row Type
// =========================

interface PurposeTemplateRow {
  id: string;
  code: string;
  version: number;
  name: string;
  description: string;
  lawful_basis: string;
  category: string;
  risk_level: string;
  default_retention_days: number;
  requires_dpia: boolean;
  max_data_class: string;
  is_active: boolean;
  is_ai_purpose: boolean;
  sector: string;
  cnil_reference: string | null;
  created_at: Date;
  updated_at: Date;
}

// =========================
// Row to Domain Mapper
// =========================

function rowToTemplate(row: PurposeTemplateRow): PurposeTemplate {
  return {
    id: row.id,
    code: row.code,
    version: row.version,
    name: row.name,
    description: row.description,
    lawfulBasis: row.lawful_basis as LawfulBasis,
    category: row.category as PurposeCategory,
    riskLevel: row.risk_level as RiskLevel,
    defaultRetentionDays: row.default_retention_days,
    requiresDpia: row.requires_dpia,
    maxDataClass: row.max_data_class as DataClass,
    isActive: row.is_active,
    isAiPurpose: row.is_ai_purpose,
    sector: (row.sector || SECTOR.GENERAL) as Sector,
    cnilReference: row.cnil_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =========================
// Repository Implementation
// =========================

export class PgPurposeTemplateRepo implements PurposeTemplateRepo {
  constructor(private pool: Pool) {}

  /**
   * List all purpose templates
   */
  async findAll(activeOnly: boolean = true): Promise<PurposeTemplate[]> {
    const query = activeOnly
      ? `SELECT * FROM purpose_templates WHERE is_active = true ORDER BY category, name`
      : `SELECT * FROM purpose_templates ORDER BY category, name`;

    const result = await this.pool.query<PurposeTemplateRow>(query);
    return result.rows.map(rowToTemplate);
  }

  /**
   * Find template by code
   */
  async findByCode(code: string): Promise<PurposeTemplate | null> {
    const result = await this.pool.query<PurposeTemplateRow>(
      `SELECT * FROM purpose_templates WHERE code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return rowToTemplate(result.rows[0]);
  }

  /**
   * Find template by ID
   */
  async findById(id: string): Promise<PurposeTemplate | null> {
    const result = await this.pool.query<PurposeTemplateRow>(
      `SELECT * FROM purpose_templates WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return rowToTemplate(result.rows[0]);
  }

  /**
   * Create new template (Platform Admin only)
   */
  async create(input: CreateTemplateInput): Promise<PurposeTemplate> {
    const result = await this.pool.query<PurposeTemplateRow>(
      `INSERT INTO purpose_templates (
        code, name, description, lawful_basis, category, risk_level,
        default_retention_days, requires_dpia, max_data_class, is_ai_purpose, sector, cnil_reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        input.code,
        input.name,
        input.description,
        input.lawfulBasis,
        input.category,
        input.riskLevel,
        input.defaultRetentionDays ?? DEFAULT_TEMPLATE_RETENTION_DAYS,
        input.requiresDpia ?? false,
        input.maxDataClass ?? DATA_CLASS.P1,
        input.isAiPurpose ?? true,
        input.sector ?? SECTOR.GENERAL,
        input.cnilReference ?? null,
      ]
    );

    return rowToTemplate(result.rows[0]);
  }

  /**
   * Update template (Platform Admin only)
   * Note: lawfulBasis, category, riskLevel are immutable
   */
  async update(id: string, input: UpdateTemplateInput): Promise<PurposeTemplate | null> {
    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.defaultRetentionDays !== undefined) {
      updates.push(`default_retention_days = $${paramIndex++}`);
      values.push(input.defaultRetentionDays);
    }
    if (input.requiresDpia !== undefined) {
      updates.push(`requires_dpia = $${paramIndex++}`);
      values.push(input.requiresDpia);
    }
    if (input.maxDataClass !== undefined) {
      updates.push(`max_data_class = $${paramIndex++}`);
      values.push(input.maxDataClass);
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }
    if (input.cnilReference !== undefined) {
      updates.push(`cnil_reference = $${paramIndex++}`);
      values.push(input.cnilReference);
    }

    if (updates.length === 0) {
      // Nothing to update
      return this.findById(id);
    }

    values.push(id);

    const result = await this.pool.query<PurposeTemplateRow>(
      `UPDATE purpose_templates SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return rowToTemplate(result.rows[0]);
  }

  /**
   * Deactivate template (soft delete)
   */
  async deactivate(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE purpose_templates SET is_active = false, updated_at = now()
       WHERE id = $1`,
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Count tenants that have adopted a template
   */
  async countAdoptions(templateId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT tenant_id) as count
       FROM purposes
       WHERE template_id = $1 AND deleted_at IS NULL`,
      [templateId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * List templates by category
   */
  async findByCategory(category: PurposeCategory): Promise<PurposeTemplate[]> {
    const result = await this.pool.query<PurposeTemplateRow>(
      `SELECT * FROM purpose_templates
       WHERE category = $1 AND is_active = true
       ORDER BY name`,
      [category]
    );

    return result.rows.map(rowToTemplate);
  }

  /**
   * List templates by risk level
   */
  async findByRiskLevel(riskLevel: RiskLevel): Promise<PurposeTemplate[]> {
    const result = await this.pool.query<PurposeTemplateRow>(
      `SELECT * FROM purpose_templates
       WHERE risk_level = $1 AND is_active = true
       ORDER BY category, name`,
      [riskLevel]
    );

    return result.rows.map(rowToTemplate);
  }

  /**
   * List AI-specific templates
   */
  async findAiTemplates(): Promise<PurposeTemplate[]> {
    const result = await this.pool.query<PurposeTemplateRow>(
      `SELECT * FROM purpose_templates
       WHERE is_ai_purpose = true AND is_active = true
       ORDER BY name`
    );

    return result.rows.map(rowToTemplate);
  }

  /**
   * List templates by sector
   */
  async findBySector(sector: Sector): Promise<PurposeTemplate[]> {
    const result = await this.pool.query<PurposeTemplateRow>(
      `SELECT * FROM purpose_templates
       WHERE sector = $1 AND is_active = true
       ORDER BY category, name`,
      [sector]
    );

    return result.rows.map(rowToTemplate);
  }

  /**
   * List templates with combined filters (AND logic)
   * All filters are optional and cumulative
   */
  async findWithFilters(filters: {
    category?: PurposeCategory;
    riskLevel?: RiskLevel;
    sector?: Sector;
    aiOnly?: boolean;
  }): Promise<PurposeTemplate[]> {
    const conditions: string[] = ['is_active = true'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(filters.category);
    }

    if (filters.riskLevel) {
      conditions.push(`risk_level = $${paramIndex++}`);
      values.push(filters.riskLevel);
    }

    if (filters.sector) {
      conditions.push(`sector = $${paramIndex++}`);
      values.push(filters.sector);
    }

    if (filters.aiOnly) {
      conditions.push(`is_ai_purpose = true`);
    }

    const query = `
      SELECT * FROM purpose_templates
      WHERE ${conditions.join(' AND ')}
      ORDER BY category, name
    `;

    const result = await this.pool.query<PurposeTemplateRow>(query, values);
    return result.rows.map(rowToTemplate);
  }
}

// =========================
// Factory Function
// =========================

export function createPurposeTemplateRepo(pool: Pool): PurposeTemplateRepo {
  return new PgPurposeTemplateRepo(pool);
}
