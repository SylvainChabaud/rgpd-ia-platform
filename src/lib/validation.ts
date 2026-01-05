/**
 * Reusable Zod Validation Schemas
 * LOT 5.3 - API Layer
 *
 * Common validation schemas for API endpoints
 * Ensures consistent validation across the platform
 */

import { z } from 'zod';
import { ACTOR_SCOPE } from '@/shared/actorScope';

// ============================================
// Primitive types
// ============================================

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const EmailSchema = z.string().email('Invalid email format');

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const DisplayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(255, 'Display name must be at most 255 characters');

export const SlugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(64, 'Slug must be at most 64 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

// ============================================
// Enums
// ============================================

export const ScopeSchema = z.enum([ACTOR_SCOPE.PLATFORM, ACTOR_SCOPE.TENANT]);

export const RoleSchema = z.string().min(1, 'Role is required');

export const ConsentPurposeSchema = z.enum([
  'analytics',
  'ai_processing',
  'marketing',
  'personalization',
]);

export const AiJobStatusSchema = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']);

export const RgpdRequestTypeSchema = z.enum(['EXPORT', 'DELETE']);

export const DpoContactRequestTypeSchema = z.enum([
  'access',
  'rectification',
  'erasure',
  'limitation',
  'portability',
  'opposition',
  'human_review',
  'question',
  'complaint',
]);

// ============================================
// Pagination & Filtering
// ============================================

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const DateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ============================================
// API Request Schemas
// ============================================

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: SlugSchema,
});

export const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export const CreateUserSchema = z.object({
  email: EmailSchema,
  displayName: DisplayNameSchema,
  password: PasswordSchema,
  role: RoleSchema,
});

export const UpdateUserSchema = z.object({
  displayName: DisplayNameSchema.optional(),
  role: RoleSchema.optional(),
});

export const GrantConsentSchema = z.object({
  purpose: ConsentPurposeSchema,
});

export const AiInvokeSchema = z.object({
  prompt: z.string().min(1).max(10000),
  purpose: ConsentPurposeSchema,
  modelRef: z.string().optional(),
});

export const ExportRequestSchema = z.object({
  // No body params needed, uses authenticated user context
});

export const DeleteRequestSchema = z.object({
  // No body params needed, uses authenticated user context
});

export const DpoContactRequestSchema = z.object({
  requestType: DpoContactRequestTypeSchema,
  email: EmailSchema,
  message: z.string().min(20, 'Message must be at least 20 characters').max(2000),
});

// ============================================
// Helper: Validate request body
// ============================================

/**
 * Parse and validate request body with Zod schema
 * Throws ZodError if validation fails (handled by error middleware)
 */
export async function validateBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

/**
 * Parse and validate query params with Zod schema
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  const params = Object.fromEntries(searchParams.entries());
  return schema.parse(params);
}
