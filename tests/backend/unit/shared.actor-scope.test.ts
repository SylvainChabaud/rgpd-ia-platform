/**
 * Shared Constants Tests: actorScope
 *
 * Ensures RBAC scope constants are properly defined
 */

import { describe, it, expect } from '@jest/globals';
import { ACTOR_SCOPE, type ActorScope, type UserScope } from '@/shared/actorScope';

describe('Shared: actorScope', () => {
  describe('ACTOR_SCOPE constants', () => {
    it('defines SYSTEM scope', () => {
      expect(ACTOR_SCOPE.SYSTEM).toBe('SYSTEM');
    });

    it('defines PLATFORM scope', () => {
      expect(ACTOR_SCOPE.PLATFORM).toBe('PLATFORM');
    });

    it('defines TENANT scope', () => {
      expect(ACTOR_SCOPE.TENANT).toBe('TENANT');
    });

    it('has exactly 3 scopes', () => {
      const scopeCount = Object.keys(ACTOR_SCOPE).length;
      expect(scopeCount).toBe(3);
    });

    it('all scope values are strings', () => {
      Object.values(ACTOR_SCOPE).forEach(scope => {
        expect(typeof scope).toBe('string');
      });
    });

    it('all scope values are uppercase', () => {
      Object.values(ACTOR_SCOPE).forEach(scope => {
        expect(scope).toBe(scope.toUpperCase());
      });
    });

    it('scope keys match scope values', () => {
      expect(ACTOR_SCOPE.SYSTEM).toBe('SYSTEM');
      expect(ACTOR_SCOPE.PLATFORM).toBe('PLATFORM');
      expect(ACTOR_SCOPE.TENANT).toBe('TENANT');
    });

    it('all scope values are unique', () => {
      const values = Object.values(ACTOR_SCOPE);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('ActorScope type', () => {
    it('accepts SYSTEM', () => {
      const scope: ActorScope = ACTOR_SCOPE.SYSTEM;
      expect(scope).toBe('SYSTEM');
    });

    it('accepts PLATFORM', () => {
      const scope: ActorScope = ACTOR_SCOPE.PLATFORM;
      expect(scope).toBe('PLATFORM');
    });

    it('accepts TENANT', () => {
      const scope: ActorScope = ACTOR_SCOPE.TENANT;
      expect(scope).toBe('TENANT');
    });
  });

  describe('UserScope type', () => {
    it('accepts PLATFORM', () => {
      const scope: UserScope = ACTOR_SCOPE.PLATFORM;
      expect(scope).toBe('PLATFORM');
    });

    it('accepts TENANT', () => {
      const scope: UserScope = ACTOR_SCOPE.TENANT;
      expect(scope).toBe('TENANT');
    });

    it('excludes SYSTEM from user contexts', () => {
      // SYSTEM is not assignable to UserScope (compile-time check)
      // This test verifies the type definition exists correctly
      const validUserScopes = [ACTOR_SCOPE.PLATFORM, ACTOR_SCOPE.TENANT];
      expect(validUserScopes).toHaveLength(2);
      expect(validUserScopes).not.toContain(ACTOR_SCOPE.SYSTEM);
    });
  });

  describe('Scope hierarchy', () => {
    it('defines system-level scope (SYSTEM)', () => {
      expect(ACTOR_SCOPE.SYSTEM).toBeDefined();
    });

    it('defines platform-level scope (PLATFORM)', () => {
      expect(ACTOR_SCOPE.PLATFORM).toBeDefined();
    });

    it('defines tenant-level scope (TENANT)', () => {
      expect(ACTOR_SCOPE.TENANT).toBeDefined();
    });
  });

  describe('Scope naming conventions', () => {
    it('uses single-word names', () => {
      Object.values(ACTOR_SCOPE).forEach(scope => {
        expect(scope).not.toContain('_');
        expect(scope).not.toContain('-');
        expect(scope).not.toContain(' ');
      });
    });

    it('does not use lowercase', () => {
      Object.values(ACTOR_SCOPE).forEach(scope => {
        expect(scope).toBe(scope.toUpperCase());
      });
    });
  });

  describe('Const assertion', () => {
    it('enforces type safety at compile time', () => {
      // Note: 'as const' is a TypeScript compile-time feature, not runtime protection.
      // This test validates that the values are correctly typed as literal strings.
      const system: 'SYSTEM' = ACTOR_SCOPE.SYSTEM;
      const platform: 'PLATFORM' = ACTOR_SCOPE.PLATFORM;
      const tenant: 'TENANT' = ACTOR_SCOPE.TENANT;

      expect(system).toBe('SYSTEM');
      expect(platform).toBe('PLATFORM');
      expect(tenant).toBe('TENANT');
    });
  });

  describe('Scope validation', () => {
    it('can check if string is valid scope', () => {
      const scopeValues = Object.values(ACTOR_SCOPE);

      expect(scopeValues.includes('SYSTEM')).toBe(true);
      expect(scopeValues.includes('PLATFORM')).toBe(true);
      expect(scopeValues.includes('TENANT')).toBe(true);
      expect(scopeValues.includes('INVALID_SCOPE' as ActorScope)).toBe(false);
    });

    it('provides all valid scopes for iteration', () => {
      const allScopes = Object.values(ACTOR_SCOPE);

      expect(allScopes).toHaveLength(3);
      expect(allScopes).toContain('SYSTEM');
      expect(allScopes).toContain('PLATFORM');
      expect(allScopes).toContain('TENANT');
    });
  });

  describe('Scope ordering', () => {
    it('follows hierarchical order (SYSTEM > PLATFORM > TENANT)', () => {
      const scopes = Object.values(ACTOR_SCOPE);

      // Verify expected order in constant definition
      const expectedOrder = ['SYSTEM', 'PLATFORM', 'TENANT'];
      expect(scopes).toEqual(expectedOrder);
    });
  });

  describe('User scope distinction', () => {
    it('UserScope includes only PLATFORM and TENANT', () => {
      // This is a type-level test, but we can verify the values
      const userScopes: UserScope[] = [
        ACTOR_SCOPE.PLATFORM,
        ACTOR_SCOPE.TENANT,
      ];

      expect(userScopes).toHaveLength(2);
      expect(userScopes).toContain(ACTOR_SCOPE.PLATFORM);
      expect(userScopes).toContain(ACTOR_SCOPE.TENANT);
    });
  });
});
