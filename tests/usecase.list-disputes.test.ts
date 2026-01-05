/**
 * Use Case Tests: listDisputes
 * RGPD: Art. 22 (Human review)
 */

import { describe, it, expect } from '@jest/globals';
import type { DisputeRepo } from '../src/app/ports/DisputeRepo';
import { listDisputes } from '../src/app/usecases/dispute/listDisputes';

describe('UseCase: listDisputes', () => {
  it('lists disputes and counts pending/under_review', async () => {
    const repo = {
      findByUser: async () => ([
        {
          id: 'disp-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          aiJobId: 'job-1',
          reason: 'Reason long enough',
          attachmentUrl: null,
          status: 'pending',
          adminResponse: null,
          reviewedBy: null,
          createdAt: new Date(),
          reviewedAt: null,
          resolvedAt: null,
        },
        {
          id: 'disp-2',
          tenantId: 'tenant-1',
          userId: 'user-1',
          aiJobId: 'job-2',
          reason: 'Reason long enough',
          attachmentUrl: null,
          status: 'under_review',
          adminResponse: null,
          reviewedBy: 'admin-1',
          createdAt: new Date(),
          reviewedAt: new Date(),
          resolvedAt: null,
        },
      ]),
    } as unknown as DisputeRepo;

    const result = await listDisputes(repo, {
      tenantId: 'tenant-1',
      userId: 'user-1',
    });

    expect(result.disputes).toHaveLength(2);
    expect(result.pendingCount).toBe(1);
    expect(result.underReviewCount).toBe(1);
  });

  it('requires tenantId and userId', async () => {
    const repo = {
      findByUser: async () => [],
    } as unknown as DisputeRepo;

    await expect(
      listDisputes(repo, { tenantId: '', userId: 'user-1' })
    ).rejects.toThrow('tenantId and userId are required');
  });
});
