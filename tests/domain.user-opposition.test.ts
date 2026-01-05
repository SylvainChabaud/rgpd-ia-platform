/**
 * Domain Entity Tests: UserOpposition
 *
 * RGPD: Art. 21 (Right to object)
 */

import { describe, it, expect } from '@jest/globals';
import type { UserOpposition } from '../src/domain/legal/UserOpposition';
import {
  createUserOpposition,
  getDaysUntilSla,
  isOppositionAccepted,
  isSlaExceeded,
  reviewOpposition,
  toAuditEvent,
  toPublicUserOpposition,
} from '../src/domain/legal/UserOpposition';

describe('Domain: UserOpposition', () => {
  it('creates a pending opposition with trimmed reason', () => {
    const result = createUserOpposition({
      tenantId: 'tenant-1',
      userId: 'user-1',
      treatmentType: 'analytics',
      reason: '  No analytics please  ',
    });

    expect(result.status).toBe('pending');
    expect(result.reason).toBe('No analytics please');
  });

  it('rejects opposition without treatment type', () => {
    expect(() =>
      createUserOpposition({
        tenantId: 'tenant-1',
        userId: 'user-1',
        treatmentType: undefined as unknown as UserOpposition['treatmentType'],
        reason: 'Valid reason',
      })
    ).toThrow('tenantId, userId and treatmentType are required');
  });

  it('reviews a pending opposition with admin response', () => {
    const opposition: UserOpposition = {
      id: 'opp-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      treatmentType: 'marketing',
      reason: 'No marketing emails',
      status: 'pending',
      adminResponse: null,
      reviewedBy: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      reviewedAt: null,
    };

    const reviewed = reviewOpposition(opposition, {
      status: 'accepted',
      adminResponse: 'Accepted and applied',
      reviewedBy: 'admin-1',
    });

    expect(reviewed.status).toBe('accepted');
    expect(reviewed.adminResponse).toBe('Accepted and applied');
    expect(reviewed.reviewedBy).toBe('admin-1');
    expect(reviewed.reviewedAt).toBeInstanceOf(Date);
  });

  it('rejects overly long reasons', () => {
    const longReason = 'a'.repeat(2001);
    expect(() =>
      createUserOpposition({
        tenantId: 'tenant-1',
        userId: 'user-1',
        treatmentType: 'analytics',
        reason: longReason,
      })
    ).toThrow('Reason must not exceed');
  });

  it('rejects short admin responses', () => {
    const opposition: UserOpposition = {
      id: 'opp-short',
      tenantId: 'tenant-1',
      userId: 'user-1',
      treatmentType: 'analytics',
      reason: 'Reason long enough',
      status: 'pending',
      adminResponse: null,
      reviewedBy: null,
      createdAt: new Date(),
      reviewedAt: null,
    };

    expect(() =>
      reviewOpposition(opposition, {
        status: 'rejected',
        adminResponse: 'short',
        reviewedBy: 'admin-1',
      })
    ).toThrow('Admin response is required');
  });

  it('rejects review when opposition is not pending', () => {
    const opposition: UserOpposition = {
      id: 'opp-2',
      tenantId: 'tenant-1',
      userId: 'user-1',
      treatmentType: 'marketing',
      reason: 'No marketing',
      status: 'accepted',
      adminResponse: 'Accepted',
      reviewedBy: 'admin-1',
      createdAt: new Date(),
      reviewedAt: new Date(),
    };

    expect(() =>
      reviewOpposition(opposition, {
        status: 'rejected',
        adminResponse: 'Cannot review twice',
        reviewedBy: 'admin-2',
      })
    ).toThrow('Only pending oppositions can be reviewed');
  });

  it('detects SLA exceeded for old pending opposition', () => {
    const opposition: UserOpposition = {
      id: 'opp-3',
      tenantId: 'tenant-1',
      userId: 'user-1',
      treatmentType: 'analytics',
      reason: 'Reason long enough',
      status: 'pending',
      adminResponse: null,
      reviewedBy: null,
      createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      reviewedAt: null,
    };

    expect(isSlaExceeded(opposition)).toBe(true);
  });

  it('returns zero days for non-pending SLA check', () => {
    const opposition: UserOpposition = {
      id: 'opp-4',
      tenantId: 'tenant-1',
      userId: 'user-1',
      treatmentType: 'analytics',
      reason: 'Reason long enough',
      status: 'rejected',
      adminResponse: 'Rejected',
      reviewedBy: 'admin-1',
      createdAt: new Date(),
      reviewedAt: new Date(),
    };

    expect(getDaysUntilSla(opposition)).toBe(0);
  });

  it('calculates days until SLA for pending opposition', () => {
    const opposition: UserOpposition = {
      id: 'opp-7',
      tenantId: 'tenant-1',
      userId: 'user-1',
      treatmentType: 'analytics',
      reason: 'Reason long enough',
      status: 'pending',
      adminResponse: null,
      reviewedBy: null,
      createdAt: new Date(),
      reviewedAt: null,
    };

    const daysLeft = getDaysUntilSla(opposition);
    expect(daysLeft).toBeGreaterThanOrEqual(0);
  });

  it('flags accepted oppositions', () => {
    const opposition: UserOpposition = {
      id: 'opp-5',
      tenantId: 'tenant-1',
      userId: 'user-1',
      treatmentType: 'profiling',
      reason: 'No profiling',
      status: 'accepted',
      adminResponse: 'Accepted',
      reviewedBy: 'admin-1',
      createdAt: new Date(),
      reviewedAt: new Date(),
    };

    expect(isOppositionAccepted(opposition)).toBe(true);
  });

  it('maps to public response and audit event', () => {
    const opposition: UserOpposition = {
      id: 'opp-6',
      tenantId: 'tenant-1',
      userId: 'user-1',
      treatmentType: 'analytics',
      reason: 'No analytics',
      status: 'pending',
      adminResponse: null,
      reviewedBy: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      reviewedAt: null,
    };

    const publicOpposition = toPublicUserOpposition(opposition);
    expect(publicOpposition.id).toBe('opp-6');
    expect(publicOpposition.status).toBe('pending');

    const audit = toAuditEvent(opposition, 'created');
    expect(audit.eventType).toBe('opposition.created');
    expect(audit.metadata.treatmentType).toBe('analytics');
  });
});
