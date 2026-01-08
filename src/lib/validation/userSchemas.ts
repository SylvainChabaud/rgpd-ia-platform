import { z } from 'zod'

/**
 * Validation schemas for User management (LOT 11.2)
 *
 * RGPD Compliance:
 * - Email validation (P2 data - hash stored in backend)
 * - Password strength validation (P3 data - never logged)
 * - DisplayName sanitization (prevent XSS)
 */

// ============================================
// Primitive Schemas
// ============================================

/**
 * Email validation schema
 * - Format standard email
 * - Lowercase normalization
 */
export const emailSchema = z
  .string()
  .min(1, 'L\'email est requis')
  .email('Format email invalide')
  .toLowerCase()
  .trim()

/**
 * DisplayName validation schema
 * - Min 2 chars (avoid single letter names)
 * - Max 255 chars (DB constraint)
 * - Trim whitespace
 */
export const displayNameSchema = z
  .string()
  .min(2, 'Le nom doit contenir au moins 2 caractères')
  .max(255, 'Le nom ne peut pas dépasser 255 caractères')
  .trim()

/**
 * Password strength validation schema
 *
 * Requirements (RGPD Art. 32 - Sécurité):
 * - Minimum 12 characters (strong password)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*)')

/**
 * Tenant ID validation schema
 */
export const tenantIdSchema = z
  .string()
  .uuid('ID tenant invalide')

/**
 * Role validation schema
 * Only ADMIN and MEMBER roles allowed for tenant users
 */
export const roleSchema = z
  .enum(['ADMIN', 'MEMBER'], {
    message: 'Rôle invalide (ADMIN ou MEMBER)',
  })

// ============================================
// User Creation Schema
// ============================================

/**
 * Schema for creating a new user
 *
 * Required fields:
 * - email: Unique per tenant (validated backend)
 * - displayName: User's full name
 * - tenantId: Tenant association
 * - role: ADMIN or MEMBER
 * - password: Strong password (12+ chars)
 */
export const createUserSchema = z.object({
  email: emailSchema,
  displayName: displayNameSchema,
  tenantId: tenantIdSchema,
  role: roleSchema,
  password: passwordSchema,
})

export type CreateUserFormData = z.infer<typeof createUserSchema>

// ============================================
// User Update Schema
// ============================================

/**
 * Schema for updating an existing user
 *
 * Editable fields:
 * - displayName: User's full name (optional)
 * - role: ADMIN or MEMBER (optional)
 *
 * NOT editable:
 * - email: Immutable (SHA-256 hash unique constraint)
 * - tenantId: Immutable (tenant isolation)
 * - password: Use separate password reset flow
 */
export const updateUserSchema = z.object({
  displayName: displayNameSchema.optional(),
  role: roleSchema.optional(),
})

export type UpdateUserFormData = z.infer<typeof updateUserSchema>

// ============================================
// Suspension Schema (Art. 18 RGPD)
// ============================================

/**
 * Schema for suspending user data processing
 *
 * Required fields:
 * - userId: User to suspend
 * - reason: Suspension reason (audit trail)
 */
export const suspendUserSchema = z.object({
  userId: z.string().uuid('ID utilisateur invalide'),
  reason: z
    .string()
    .min(3, 'La raison doit contenir au moins 3 caractères')
    .max(500, 'La raison ne peut pas dépasser 500 caractères')
    .trim(),
})

export type SuspendUserFormData = z.infer<typeof suspendUserSchema>

// ============================================
// Bulk Operations Schemas (LOT 11.2)
// ============================================

/**
 * Schema for bulk suspend operation
 *
 * Required fields:
 * - userIds: Array of user IDs to suspend
 * - reason: Suspension reason (audit trail)
 */
export const bulkSuspendSchema = z.object({
  userIds: z
    .array(z.string().uuid('ID utilisateur invalide'))
    .min(1, 'Vous devez sélectionner au moins un utilisateur')
    .max(100, 'Vous ne pouvez pas suspendre plus de 100 utilisateurs à la fois'),
  reason: z
    .string()
    .min(3, 'La raison doit contenir au moins 3 caractères')
    .max(500, 'La raison ne peut pas dépasser 500 caractères')
    .trim(),
})

export type BulkSuspendFormData = z.infer<typeof bulkSuspendSchema>

/**
 * Schema for bulk reactivate operation
 *
 * Required fields:
 * - userIds: Array of user IDs to reactivate
 */
export const bulkReactivateSchema = z.object({
  userIds: z
    .array(z.string().uuid('ID utilisateur invalide'))
    .min(1, 'Vous devez sélectionner au moins un utilisateur')
    .max(100, 'Vous ne pouvez pas réactiver plus de 100 utilisateurs à la fois'),
})

export type BulkReactivateFormData = z.infer<typeof bulkReactivateSchema>
