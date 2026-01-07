/**
 * Use Case Tests: listOppositions
 * RGPD: Art. 21 (Right to object)
 */

import { describe, it, expect } from '@jest/globals';
import type { OppositionRepo } from '@/app/ports/OppositionRepo';
import { listOppositions } from '@/app/usecases/opposition/listOppositions';

describe('UseCase: listOppositions', () => {
  it('lists user oppositions and counts pending', async () => {
    const repo = {
      findByUser: async () => ([
        {
          id: 'opp-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          treatmentType: 'analytics',
          reason: 'Reason one',
          status: 'pending',
          adminResponse: null,
          reviewedBy: null,
          createdAt: new Date(),
          reviewedAt: null,
        },
        {
          id: 'opp-2',
          tenantId: 'tenant-1',
          userId: 'user-1',
          treatmentType: 'marketing',
          reason: 'Reason two',
          status: 'accepted',
          adminResponse: 'Accepted',
          reviewedBy: 'admin-1',
          createdAt: new Date(),
          reviewedAt: new Date(),
        },
      ]),
    } as unknown as OppositionRepo;

    const result = await listOppositions(repo, {
      tenantId: 'tenant-1',
      userId: 'user-1',
    });

    expect(result.oppositions).toHaveLength(2);
    expect(result.pendingCount).toBe(1);
  });

  it('returns zero pending when none are pending', async () => {
    const repo = {
      findByUser: async () => ([
        {
          id: 'opp-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          treatmentType: 'analytics',
          reason: 'Reason one',
          status: 'rejected',
          adminResponse: 'Rejected',
          reviewedBy: 'admin-1',
          createdAt: new Date(),
          reviewedAt: new Date(),
        },
      ]),
    } as unknown as OppositionRepo;

    const result = await listOppositions(repo, {
      tenantId: 'tenant-1',
      userId: 'user-1',
    });

    expect(result.pendingCount).toBe(0);
  });

  it('requires tenantId and userId', async () => {
    const repo = {
      findByUser: async () => [],
    } as unknown as OppositionRepo;

    await expect(
      listOppositions(repo, { tenantId: '', userId: 'user-1' })
    ).rejects.toThrow('tenantId and userId are required');
  });
});
