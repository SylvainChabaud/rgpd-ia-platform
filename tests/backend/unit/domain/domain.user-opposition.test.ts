/**
 * Unit Tests: User Opposition Domain Entity
 * Coverage: src/domain/rgpd/UserOpposition.ts
 * RGPD: Art. 21 - Right to Object
 */

/* eslint-disable @typescript-eslint/no-require-imports */

import { describe, it, expect } from '@jest/globals';

describe('UserOpposition Domain', () => {
  it('should import module', () => {
    const userOppositionModule = require('@/domain/rgpd/UserOpposition');
    expect(userOppositionModule).toBeDefined();
  });

  it('should define opposition types', () => {
    const userOppositionModule = require('@/domain/rgpd/UserOpposition');
    expect(userOppositionModule.createOpposition).toBeDefined();
  });

  it('should create opposition with valid data', () => {
    const { createOpposition } = require('@/domain/rgpd/UserOpposition');

    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      reason: 'I object to automated processing of my data',
      treatmentType: 'ai_processing',
    };

    const opposition = createOpposition(input);

    expect(opposition.tenantId).toBe('tenant-1');
    expect(opposition.userId).toBe('user-1');
    expect(opposition.reason).toBe('I object to automated processing of my data');
    expect(opposition.treatmentType).toBe('ai_processing');
  });

  it('should validate opposition reason length', () => {
    const { createOpposition, MIN_REASON_LENGTH: _MIN_REASON_LENGTH } = require('@/domain/rgpd/UserOpposition');

    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      reason: 'Short',
      treatmentType: 'ai_processing',
    };

    expect(() => createOpposition(input)).toThrow();
  });
});
