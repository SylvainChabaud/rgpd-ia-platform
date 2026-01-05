/**
 * Use Case Tests: submitOpposition
 * RGPD: Art. 21 (Right to object)
 */

import { describe, it, expect } from '@jest/globals';
import type { OppositionRepo } from '../src/app/ports/OppositionRepo';
import type { TreatmentType } from '../src/domain/legal/UserOpposition';
import { InMemoryAuditEventWriter } from '../src/app/audit/InMemoryAuditEventWriter';
import { submitOpposition } from '../src/app/usecases/opposition/submitOpposition';

function createOppositionRepo(): OppositionRepo {
  return {
    create: async (_tenantId, input) => ({
      id: 'opp-1',
      tenantId: input.tenantId,
      userId: input.userId,
      treatmentType: input.treatmentType,
      reason: input.reason,
      status: 'pending',
      adminResponse: null,
      reviewedBy: null,
      createdAt: new Date(),
      reviewedAt: null,
      metadata: input.metadata,
    }),
  } as OppositionRepo;
}

describe('UseCase: submitOpposition', () => {
  it('submits a valid opposition and emits audit event', async () => {
    const repo = createOppositionRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await submitOpposition(repo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      treatmentType: 'analytics',
      reason: 'No analytics please',
    });

    expect(result.opposition.status).toBe('pending');
    expect(result.opposition.treatmentType).toBe('analytics');
    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].eventName).toBe('opposition.submitted');
  });

  it('requires minimum reason length', async () => {
    const repo = createOppositionRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      submitOpposition(repo, auditWriter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        treatmentType: 'analytics',
        reason: 'short',
      })
    ).rejects.toThrow('Reason must be at least');
  });

  it('requires treatment type', async () => {
    const repo = createOppositionRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      submitOpposition(repo, auditWriter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        treatmentType: undefined as unknown as TreatmentType,
        reason: 'Reason long enough',
      })
    ).rejects.toThrow('tenantId, userId and treatmentType are required');
  });

  it('requires tenantId', async () => {
    const repo = createOppositionRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      submitOpposition(repo, auditWriter, {
        tenantId: '',
        userId: 'user-1',
        treatmentType: 'marketing',
        reason: 'Reason long enough',
      })
    ).rejects.toThrow('tenantId, userId and treatmentType are required');
  });
});
