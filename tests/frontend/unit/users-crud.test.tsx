import { describe, it, expect } from '@jest/globals'
import { ACTOR_ROLE } from '@/shared/actorRole'
import { maskEmail } from '@/lib/utils/maskEmail'
import { createUserSchema, updateUserSchema, bulkSuspendSchema, bulkReactivateSchema } from '@/lib/validation/userSchemas'

/**
 * Users CRUD Tests (LOT 11.2)
 *
 * Test coverage:
 * - Validation schemas (createUser, updateUser, bulk operations)
 * - RGPD compliance (email masking, password strength)
 * - Business logic validation
 *
 * Total: 21 tests
 */

describe('Users CRUD - Business Logic', () => {
  // ============================================
  // Groupe 1: Create User Validation (5 tests)
  // ============================================
  describe('Create User Validation', () => {
    it('should validate correct user creation data', () => {
      const validData = {
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: ACTOR_ROLE.ADMIN,
        password: 'SecurePass123!@#',
      }

      const result = createUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        displayName: 'John Doe',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: ACTOR_ROLE.ADMIN,
        password: 'SecurePass123!@#',
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject weak password (less than 12 chars)', () => {
      const invalidData = {
        email: 'john@example.com',
        displayName: 'John Doe',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: ACTOR_ROLE.ADMIN,
        password: 'short',
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject password without uppercase letter', () => {
      const invalidData = {
        email: 'john@example.com',
        displayName: 'John Doe',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: ACTOR_ROLE.ADMIN,
        password: 'securepass123!@#',
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject password without special character', () => {
      const invalidData = {
        email: 'john@example.com',
        displayName: 'John Doe',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: ACTOR_ROLE.ADMIN,
        password: 'SecurePass1234',
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Groupe 2: Update User Validation (4 tests)
  // ============================================
  describe('Update User Validation', () => {
    it('should validate correct user update data', () => {
      const validData = {
        displayName: 'John Doe Updated',
        role: ACTOR_ROLE.MEMBER,
      }

      const result = updateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow updating only displayName', () => {
      const validData = {
        displayName: 'New Name',
      }

      const result = updateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow updating only role', () => {
      const validData = {
        role: ACTOR_ROLE.ADMIN,
      }

      const result = updateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject displayName shorter than 2 chars', () => {
      const invalidData = {
        displayName: 'A',
      }

      const result = updateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Groupe 3: Bulk Operations Validation (4 tests)
  // ============================================
  describe('Bulk Operations Validation', () => {
    it('should validate bulk suspend with valid data', () => {
      const validData = {
        userIds: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
        reason: 'Bulk suspension pour test',
      }

      const result = bulkSuspendSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject bulk suspend with empty userIds array', () => {
      const invalidData = {
        userIds: [],
        reason: 'Test reason',
      }

      const result = bulkSuspendSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject bulk suspend with more than 100 users', () => {
      const invalidData = {
        userIds: Array(101).fill('550e8400-e29b-41d4-a716-446655440000'),
        reason: 'Test reason',
      }

      const result = bulkSuspendSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate bulk reactivate with valid data', () => {
      const validData = {
        userIds: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
      }

      const result = bulkReactivateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Groupe 4: RGPD Compliance (5 tests)
  // ============================================
  describe('RGPD Compliance', () => {
    it('should mask email correctly (m***@e***)', () => {
      const masked = maskEmail('john.doe@example.com')
      expect(masked).toBe('j***@e***')
    })

    it('should NOT expose full email in masked result', () => {
      const email = 'sensitive.user@private.org'
      const masked = maskEmail(email)

      // Email complet NOT présent
      expect(masked).not.toContain('sensitive.user')
      expect(masked).not.toContain('private.org')

      // Format masqué valide
      expect(masked).toMatch(/^[a-zA-Z0-9]\*\*\*@[a-zA-Z0-9]\*\*\*$/)
    })

    it('should expose only first character of local and domain parts', () => {
      const masked = maskEmail('admin@tenant.com')

      // Uniquement premiers caractères
      expect(masked).toBe('a***@t***')
      expect(masked.length).toBeLessThan(15)
    })

    it('should handle multiple test emails consistently', () => {
      const testEmails = [
        'admin@tenant1.com',
        'user@tenant2.org',
        'test@tenant3.net',
      ]

      testEmails.forEach(email => {
        const masked = maskEmail(email)

        // Tous suivent le pattern x***@y***
        expect(masked).toMatch(/^[a-zA-Z0-9]\*\*\*@[a-zA-Z0-9]\*\*\*$/)

        // Aucun n'expose l'email complet
        const [local, domain] = email.split('@')
        expect(masked).not.toContain(local.substring(1))
        expect(masked).not.toContain(domain.split('.')[0].substring(1))
      })
    })

    it('should return [INVALID] for malformed emails', () => {
      expect(maskEmail('no-at-sign')).toBe('[INVALID]')
      expect(maskEmail('')).toBe('[INVALID]')
      expect(maskEmail('@only-at')).toBe('[INVALID]')
      expect(maskEmail('user@')).toBe('[INVALID]')
    })
  })

  // ============================================
  // Groupe 5: Role and Tenant Validation (3 tests)
  // ============================================
  describe('Role and Tenant Validation', () => {
    it('should accept valid ADMIN role', () => {
      const validData = {
        email: 'admin@example.com',
        displayName: 'Admin User',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: ACTOR_ROLE.ADMIN,
        password: 'SecurePass123!@#',
      }

      const result = createUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept valid MEMBER role', () => {
      const validData = {
        email: 'member@example.com',
        displayName: 'Member User',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: ACTOR_ROLE.MEMBER,
        password: 'SecurePass123!@#',
      }

      const result = createUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID for tenantId', () => {
      const invalidData = {
        email: 'user@example.com',
        displayName: 'Test User',
        tenantId: 'invalid-uuid',
        role: ACTOR_ROLE.MEMBER,
        password: 'SecurePass123!@#',
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
