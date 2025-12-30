/**
 * AiJobRepo port
 *
 * Classification: P1 (metadata only, technical data)
 * Purpose: track AI processing jobs status and timing
 * Retention: 30-90 days max
 *
 * CRITICAL RGPD / SECURITY:
 * - This repo manages METADATA ONLY (status, timestamps, references)
 * - NO CONTENT storage: prompts, outputs, embeddings are P3 data
 * - Content must be stored separately with encryption (LOT 6+)
 * - ALL operations MUST include tenantId (strict isolation)
 */

export type AiJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface AiJob {
  id: string;
  tenantId: string;
  userId: string | null;
  purpose: string;
  modelRef: string | null;
  status: AiJobStatus;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface CreateAiJobInput {
  userId?: string | null;
  purpose: string;
  modelRef?: string | null;
}

export interface UpdateAiJobStatusInput {
  status: AiJobStatus;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AiJobRepo {
  /**
   * Create new AI job (initial status: PENDING)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param input - job metadata (NO CONTENT)
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  create(tenantId: string, input: CreateAiJobInput): Promise<string>;

  /**
   * Update job status
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param jobId - job identifier
   * @param input - status update
   * @throws Error if job not found or belongs to different tenant
   */
  updateStatus(
    tenantId: string,
    jobId: string,
    input: UpdateAiJobStatusInput
  ): Promise<void>;

  /**
   * Find job by ID within tenant
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param jobId - job identifier
   * @returns Job or null if not found / different tenant
   */
  findById(tenantId: string, jobId: string): Promise<AiJob | null>;

  /**
   * List jobs for user (RGPD export)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @param limit - max results (default 100)
   */
  findByUser(
    tenantId: string,
    userId: string,
    limit?: number
  ): Promise<AiJob[]>;

  /**
   * Soft delete all AI jobs for user (cascade RGPD deletion)
   * LOT 5.2 - Art. 17 RGPD
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  softDeleteByUser(tenantId: string, userId: string): Promise<number>;

  /**
   * Hard delete all AI jobs for user (purge after retention period)
   * LOT 5.2 - Art. 17 RGPD
   * CRITICAL: Only call after soft delete + retention period
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  hardDeleteByUser(tenantId: string, userId: string): Promise<number>;
}
