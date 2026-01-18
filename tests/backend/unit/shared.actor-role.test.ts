/**
 * Shared Constants Tests: actorRole
 * LOT 11.2 - Normalized role taxonomy
 *
 * Ensures RBAC role constants are properly defined
 */

import { describe, it, expect } from '@jest/globals';
import { ACTOR_ROLE, type ActorRole } from '@/shared/actorRole';

describe('Shared: actorRole', () => {
  describe('ACTOR_ROLE constants', () => {
    it('defines SUPERADMIN role', () => {
      expect(ACTOR_ROLE.SUPERADMIN).toBe('SUPERADMIN');
    });

    it('defines TENANT_ADMIN role', () => {
      expect(ACTOR_ROLE.TENANT_ADMIN).toBe('TENANT_ADMIN');
    });

    it('defines MEMBER role', () => {
      expect(ACTOR_ROLE.MEMBER).toBe('MEMBER');
    });

    it('defines DPO role', () => {
      expect(ACTOR_ROLE.DPO).toBe('DPO');
    });

    it('has exactly 4 roles', () => {
      const roleCount = Object.keys(ACTOR_ROLE).length;
      expect(roleCount).toBe(4);
    });

    it('all role values are strings', () => {
      Object.values(ACTOR_ROLE).forEach(role => {
        expect(typeof role).toBe('string');
      });
    });

    it('all role values are uppercase', () => {
      Object.values(ACTOR_ROLE).forEach(role => {
        expect(role).toBe(role.toUpperCase());
      });
    });

    it('role keys match role values', () => {
      expect(ACTOR_ROLE.SUPERADMIN).toBe('SUPERADMIN');
      expect(ACTOR_ROLE.TENANT_ADMIN).toBe('TENANT_ADMIN');
      expect(ACTOR_ROLE.MEMBER).toBe('MEMBER');
      expect(ACTOR_ROLE.DPO).toBe('DPO');
    });

    it('all role values are unique', () => {
      const values = Object.values(ACTOR_ROLE);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('does not define deprecated ADMIN role', () => {
      expect((ACTOR_ROLE as Record<string, unknown>).ADMIN).toBeUndefined();
    });

    it('does not define deprecated USER role', () => {
      expect((ACTOR_ROLE as Record<string, unknown>).USER).toBeUndefined();
    });

    it('does not define deprecated TENANT_USER role', () => {
      expect((ACTOR_ROLE as Record<string, unknown>).TENANT_USER).toBeUndefined();
    });
  });

  describe('ActorRole type', () => {
    it('accepts SUPERADMIN', () => {
      const role: ActorRole = ACTOR_ROLE.SUPERADMIN;
      expect(role).toBe('SUPERADMIN');
    });

    it('accepts TENANT_ADMIN', () => {
      const role: ActorRole = ACTOR_ROLE.TENANT_ADMIN;
      expect(role).toBe('TENANT_ADMIN');
    });

    it('accepts MEMBER', () => {
      const role: ActorRole = ACTOR_ROLE.MEMBER;
      expect(role).toBe('MEMBER');
    });

    it('accepts DPO', () => {
      const role: ActorRole = ACTOR_ROLE.DPO;
      expect(role).toBe('DPO');
    });
  });

  describe('Role hierarchy', () => {
    it('defines platform-level role (SUPERADMIN)', () => {
      expect(ACTOR_ROLE.SUPERADMIN).toBeDefined();
    });

    it('defines tenant-level admin role (TENANT_ADMIN)', () => {
      expect(ACTOR_ROLE.TENANT_ADMIN).toBeDefined();
    });

    it('defines tenant-level user role (MEMBER)', () => {
      expect(ACTOR_ROLE.MEMBER).toBeDefined();
    });

    it('defines RGPD compliance role (DPO)', () => {
      expect(ACTOR_ROLE.DPO).toBeDefined();
    });
  });

  describe('Role naming conventions', () => {
    it('uses snake_case for multi-word roles', () => {
      expect(ACTOR_ROLE.TENANT_ADMIN).toContain('_');
    });

    it('does not use hyphens', () => {
      Object.values(ACTOR_ROLE).forEach(role => {
        expect(role).not.toContain('-');
      });
    });

    it('does not use lowercase', () => {
      Object.values(ACTOR_ROLE).forEach(role => {
        expect(role).toBe(role.toUpperCase());
      });
    });

    it('does not use spaces', () => {
      Object.values(ACTOR_ROLE).forEach(role => {
        expect(role).not.toContain(' ');
      });
    });
  });

  describe('Const assertion', () => {
    it('enforces type safety at compile time', () => {
      // Note: 'as const' is a TypeScript compile-time feature, not runtime protection.
      // This test validates that the values are correctly typed as literal strings.
      const superadmin: 'SUPERADMIN' = ACTOR_ROLE.SUPERADMIN;
      const tenantAdmin: 'TENANT_ADMIN' = ACTOR_ROLE.TENANT_ADMIN;
      const member: 'MEMBER' = ACTOR_ROLE.MEMBER;
      const dpo: 'DPO' = ACTOR_ROLE.DPO;

      expect(superadmin).toBe('SUPERADMIN');
      expect(tenantAdmin).toBe('TENANT_ADMIN');
      expect(member).toBe('MEMBER');
      expect(dpo).toBe('DPO');
    });
  });

  describe('Role validation', () => {
    it('can check if string is valid role', () => {
      const roleValues = Object.values(ACTOR_ROLE);

      expect(roleValues.includes('SUPERADMIN')).toBe(true);
      expect(roleValues.includes('TENANT_ADMIN')).toBe(true);
      expect(roleValues.includes('MEMBER')).toBe(true);
      expect(roleValues.includes('DPO')).toBe(true);
      expect(roleValues.includes('INVALID_ROLE' as ActorRole)).toBe(false);
    });

    it('provides all valid roles for iteration', () => {
      const allRoles = Object.values(ACTOR_ROLE);

      expect(allRoles).toHaveLength(4);
      expect(allRoles).toContain('SUPERADMIN');
      expect(allRoles).toContain('TENANT_ADMIN');
      expect(allRoles).toContain('MEMBER');
      expect(allRoles).toContain('DPO');
    });
  });
});
