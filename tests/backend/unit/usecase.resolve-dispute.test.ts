/**
 * Use Case Tests: resolveDispute
 * RGPD: Art. 22 (Human review)
 */

import { describe, it, expect } from '@jest/globals';
import type { DisputeRepo } from '@/app/ports/DisputeRepo';
import type { UserDispute } from '@/domain/legal/UserDispute';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { resolveDispute } from '@/app/usecases/dispute/resolveDispute';

function createDisputeRepo(): { repo: DisputeRepo; setDispute: (status: UserDispute['status']) => void } {
  let dispute: UserDispute = {
    id: 'disp-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    aiJobId: 'job-1',
    reason: 'Reason long enough',
    attachmentUrl: null,
    status: 'pending' as const,
    adminResponse: null,
    reviewedBy: null,
    createdAt: new Date(),
    reviewedAt: null,
    resolvedAt: null,
  };

  const repo: DisputeRepo = {
    findById: async (_tenantId: string, id: string) => (id === dispute.id ? dispute : null),
    review: async (_tenantId: string, _id: string, review) => {
      dispute = {
        ...dispute,
        status: review.status,
        adminResponse: review.adminResponse ?? null,
        reviewedBy: review.reviewedBy,
        reviewedAt: new Date(),
        resolvedAt: review.status === 'resolved' || review.status === 'rejected' ? new Date() : null,
      };
      return dispute;
    },
  } as DisputeRepo;

  return {
    repo,
    setDispute: (status: UserDispute['status']) => {
      dispute = { ...dispute, status };
    },
  };
}

describe('UseCase: resolveDispute', () => {
  it('resolves dispute with admin response and emits audit event', async () => {
    const { repo } = createDisputeRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await resolveDispute(repo, auditWriter, {
      tenantId: 'tenant-1',
      disputeId: 'disp-1',
      status: 'resolved',
      adminResponse: 'Resolved after review',
      reviewedBy: 'admin-1',
    });

    expect(result.dispute.status).toBe('resolved');
    expect(result.dispute.adminResponse).toBe('Resolved after review');
    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].eventName).toBe('dispute.reviewed');
  });

  it('requires admin response when resolved', async () => {
    const { repo } = createDisputeRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      resolveDispute(repo, auditWriter, {
        tenantId: 'tenant-1',
        disputeId: 'disp-1',
        status: 'resolved',
        reviewedBy: 'admin-1',
      })
    ).rejects.toThrow('Admin response is required');
  });

  it('rejects when dispute is not found', async () => {
    const { repo } = createDisputeRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      resolveDispute(repo, auditWriter, {
        tenantId: 'tenant-1',
        disputeId: 'missing',
        status: 'resolved',
        adminResponse: 'Resolved',
        reviewedBy: 'admin-1',
      })
    ).rejects.toThrow('Dispute not found');
  });

  it('rejects when status is not reviewable', async () => {
    const { repo, setDispute } = createDisputeRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    setDispute('rejected');

    await expect(
      resolveDispute(repo, auditWriter, {
        tenantId: 'tenant-1',
        disputeId: 'disp-1',
        status: 'under_review',
        reviewedBy: 'admin-1',
      })
    ).rejects.toThrow('Only pending or under_review disputes can be updated');
  });
});
