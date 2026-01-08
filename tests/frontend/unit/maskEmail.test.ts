import { describe, it, expect } from '@jest/globals'
import { maskEmail } from '@/lib/utils/maskEmail'

describe('maskEmail', () => {
  describe('Valid emails', () => {
    it('should mask standard email', () => {
      expect(maskEmail('john.doe@example.com')).toBe('j***@e***')
    })

    it('should mask short email', () => {
      expect(maskEmail('a@b.co')).toBe('a***@b***')
    })

    it('should mask email with long local part', () => {
      expect(maskEmail('very.long.email.address@company.org')).toBe('v***@c***')
    })

    it('should mask email with subdomain', () => {
      expect(maskEmail('user@mail.example.com')).toBe('u***@m***')
    })

    it('should mask email with numbers', () => {
      expect(maskEmail('user123@test456.com')).toBe('u***@t***')
    })

    it('should mask email with special characters in local part', () => {
      expect(maskEmail('user+test@example.com')).toBe('u***@e***')
    })
  })

  describe('Invalid inputs', () => {
    it('should return [INVALID] for email without @', () => {
      expect(maskEmail('invalid')).toBe('[INVALID]')
    })

    it('should return [INVALID] for empty string', () => {
      expect(maskEmail('')).toBe('[INVALID]')
    })

    it('should return [INVALID] for multiple @', () => {
      expect(maskEmail('user@@example.com')).toBe('[INVALID]')
    })

    it('should return [INVALID] for @ at start', () => {
      expect(maskEmail('@example.com')).toBe('[INVALID]')
    })

    it('should return [INVALID] for @ at end', () => {
      expect(maskEmail('user@')).toBe('[INVALID]')
    })

    it('should return [INVALID] for only @', () => {
      expect(maskEmail('@')).toBe('[INVALID]')
    })
  })

  describe('Edge cases', () => {
    it('should handle null by returning [INVALID]', () => {
      expect(maskEmail(null as unknown as string)).toBe('[INVALID]')
    })

    it('should handle undefined by returning [INVALID]', () => {
      expect(maskEmail(undefined as unknown as string)).toBe('[INVALID]')
    })

    it('should handle non-string types by returning [INVALID]', () => {
      expect(maskEmail(123 as unknown as string)).toBe('[INVALID]')
      expect(maskEmail({} as unknown as string)).toBe('[INVALID]')
      expect(maskEmail([] as unknown as string)).toBe('[INVALID]')
    })
  })

  describe('RGPD Compliance', () => {
    it('should NOT expose full email (P2 data)', () => {
      const masked = maskEmail('john.doe@example.com')

      // Vérifier que l'email complet n'est PAS présent
      expect(masked).not.toContain('john.doe')
      expect(masked).not.toContain('example.com')

      // Vérifier le format masqué
      expect(masked).toMatch(/^[a-zA-Z0-9]\*\*\*@[a-zA-Z0-9]\*\*\*$/)
    })

    it('should expose only first character (minimal data)', () => {
      const masked = maskEmail('sensitive@private.org')

      // Uniquement premier char local + premier char domaine
      expect(masked).toBe('s***@p***')

      // Pas de données additionnelles exposées
      expect(masked.length).toBeLessThan(15)
    })

    it('should mask all test emails consistently', () => {
      const testEmails = [
        'admin@tenant1.com',
        'user@tenant2.org',
        'test@tenant3.net',
      ]

      testEmails.forEach(email => {
        const masked = maskEmail(email)

        // Tous doivent suivre le pattern x***@y***
        expect(masked).toMatch(/^[a-zA-Z0-9]\*\*\*@[a-zA-Z0-9]\*\*\*$/)

        // Aucun ne doit exposer l'email complet
        expect(masked).not.toContain(email.split('@')[0].substring(1))
        expect(masked).not.toContain(email.split('@')[1].split('.')[0].substring(1))
      })
    })
  })
})
