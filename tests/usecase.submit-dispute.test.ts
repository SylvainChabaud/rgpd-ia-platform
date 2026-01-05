/**
 * Use Case Tests: submitDispute
 * RGPD: Art. 22 (Human review)
 */

import { describe, it, expect } from '@jest/globals';
import type { DisputeRepo } from '../src/app/ports/DisputeRepo';
import { InMemoryAuditEventWriter } from '../src/app/audit/InMemoryAuditEventWriter';
import { submitDispute } from '../src/app/usecases/dispute/submitDispute';

function createDisputeRepo(): DisputeRepo {
  return {
    create: async (_tenantId, input) => ({
      id: 'disp-1',
      tenantId: input.tenantId,
      userId: input.userId,
      aiJobId: input.aiJobId ?? null,
      reason: input.reason,
      attachmentUrl: input.attachmentUrl ?? null,
      status: 'pending',
      adminResponse: null,
      reviewedBy: null,
      createdAt: new Date(),
      reviewedAt: null,
      resolvedAt: null,
      metadata: input.metadata,
    }),
  } as DisputeRepo;
}

describe('UseCase: submitDispute', () => {
  it('submits a valid dispute and emits audit event', async () => {
    const repo = createDisputeRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await submitDispute(repo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'This reason is long enough for submission',
    });

    expect(result.dispute.status).toBe('pending');
    expect(result.dispute.aiJobId).toBe('job-1');
    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].eventName).toBe('dispute.submitted');
  });

  it('requires minimum reason length', async () => {
    const repo = createDisputeRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      submitDispute(repo, auditWriter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        reason: 'Too short',
      })
    ).rejects.toThrow('Reason must be at least');
  });

  it('supports optional attachments', async () => {
    const repo = createDisputeRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await submitDispute(repo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      reason: 'This reason is long enough for submission',
      attachmentUrl: 'https://storage.example.com/evidence.pdf',
    });

    expect(result.dispute.attachmentUrl).toBe('https://storage.example.com/evidence.pdf');
  });

  it('requires tenantId', async () => {
    const repo = createDisputeRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      submitDispute(repo, auditWriter, {
        tenantId: '',
        userId: 'user-1',
        reason: 'This reason is long enough for submission',
      })
    ).rejects.toThrow('tenantId and userId are required');
  });
});
