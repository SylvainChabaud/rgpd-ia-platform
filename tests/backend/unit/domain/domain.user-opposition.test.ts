/**
 * Unit Tests: User Opposition Domain Entity
 * Coverage: src/domain/rgpd/UserOpposition.ts
 * RGPD: Art. 21 - Right to Object
 */

import { describe, it, expect } from '@jest/globals';

describe('UserOpposition Domain', () => {
  it('should import module', () => {
    const module = require('@/domain/rgpd/UserOpposition');
    expect(module).toBeDefined();
  });

  it('should define opposition types', () => {
    const module = require('@/domain/rgpd/UserOpposition');
    expect(module.createOpposition).toBeDefined();
  });

  it('should create opposition with valid data', () => {
    const { createOpposition } = require('@/domain/rgpd/UserOpposition');

    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      reason: 'I object to automated processing of my data',
      scope: 'ALL_AI_PROCESSING',
    };

    const opposition = createOpposition(input);

    expect(opposition.tenantId).toBe('tenant-1');
    expect(opposition.userId).toBe('user-1');
    expect(opposition.reason).toBeDefined();
  });

  it('should validate opposition reason length', () => {
    const { createOpposition, MIN_REASON_LENGTH } = require('@/domain/rgpd/UserOpposition');

    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      reason: 'Short',
      scope: 'ALL_AI_PROCESSING',
    };

    expect(() => createOpposition(input)).toThrow();
  });
});
