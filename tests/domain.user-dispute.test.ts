/**
 * Domain Entity Tests: UserDispute
 *
 * RGPD: Art. 22 (Human review)
 */

import { describe, it, expect } from '@jest/globals';
import type { UserDispute } from '../src/domain/legal/UserDispute';
import {
  createUserDispute,
  getDaysUntilSla,
  hasHumanReview,
  isAttachmentExpired,
  isDisputeResolved,
  isSlaExceeded,
  reviewDispute,
  toAuditEvent,
  toPublicUserDispute,
} from '../src/domain/legal/UserDispute';

describe('Domain: UserDispute', () => {
  it('creates a pending dispute with optional attachment', () => {
    const result = createUserDispute({
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'This reason is long enough for submission',
      attachmentUrl: 'https://storage.example.com/evidence.pdf',
    });

    expect(result.status).toBe('pending');
    expect(result.attachmentUrl).toBe('https://storage.example.com/evidence.pdf');
  });

  it('rejects disputes with short reason', () => {
    expect(() =>
      createUserDispute({
        tenantId: 'tenant-1',
        userId: 'user-1',
        reason: 'Too short',
      })
    ).toThrow('Reason must be at least');
  });

  it('rejects disputes with overly long reason', () => {
    const longReason = 'a'.repeat(5001);
    expect(() =>
      createUserDispute({
        tenantId: 'tenant-1',
        userId: 'user-1',
        reason: longReason,
      })
    ).toThrow('Reason must not exceed');
  });

  it('reviews a dispute and sets resolved timestamp', () => {
    const dispute: UserDispute = {
      id: 'disp-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Reason long enough for review',
      attachmentUrl: null,
      status: 'pending',
      adminResponse: null,
      reviewedBy: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      reviewedAt: null,
      resolvedAt: null,
    };

    const reviewed = reviewDispute(dispute, {
      status: 'resolved',
      adminResponse: 'Resolved after review',
      reviewedBy: 'admin-1',
    });

    expect(reviewed.status).toBe('resolved');
    expect(reviewed.reviewedAt).toBeInstanceOf(Date);
    expect(reviewed.resolvedAt).toBeInstanceOf(Date);
  });

  it('rejects review when dispute is already resolved', () => {
    const dispute: UserDispute = {
      id: 'disp-2',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Reason long enough',
      attachmentUrl: null,
      status: 'resolved',
      adminResponse: 'Done',
      reviewedBy: 'admin-1',
      createdAt: new Date(),
      reviewedAt: new Date(),
      resolvedAt: new Date(),
    };

    expect(() =>
      reviewDispute(dispute, {
        status: 'under_review',
        reviewedBy: 'admin-2',
      })
    ).toThrow('Only pending or under_review disputes can be updated');
  });

  it('detects SLA exceeded for old pending dispute', () => {
    const dispute: UserDispute = {
      id: 'disp-3',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: null,
      reason: 'Reason long enough',
      attachmentUrl: null,
      status: 'pending',
      adminResponse: null,
      reviewedBy: null,
      createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      reviewedAt: null,
      resolvedAt: null,
    };

    expect(isSlaExceeded(dispute)).toBe(true);
    expect(getDaysUntilSla(dispute)).toBe(0);
  });

  it('detects expired attachments', () => {
    const dispute: UserDispute = {
      id: 'disp-4',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: null,
      reason: 'Reason long enough',
      attachmentUrl: 'https://storage.example.com/evidence.pdf',
      status: 'pending',
      adminResponse: null,
      reviewedBy: null,
      createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
      reviewedAt: null,
      resolvedAt: null,
    };

    expect(isAttachmentExpired(dispute)).toBe(true);
  });

  it('marks dispute resolved and human reviewed', () => {
    const dispute: UserDispute = {
      id: 'disp-5',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: null,
      reason: 'Reason long enough',
      attachmentUrl: null,
      status: 'resolved',
      adminResponse: 'Done',
      reviewedBy: 'admin-1',
      createdAt: new Date(),
      reviewedAt: new Date(),
      resolvedAt: new Date(),
    };

    expect(isDisputeResolved(dispute)).toBe(true);
    expect(hasHumanReview(dispute)).toBe(true);
  });

  it('maps to public response and audit event', () => {
    const dispute: UserDispute = {
      id: 'disp-6',
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
    };

    const publicDispute = toPublicUserDispute(dispute);
    expect(publicDispute.hasAttachment).toBe(false);

    const audit = toAuditEvent(dispute, 'created');
    expect(audit.eventType).toBe('dispute.created');
    expect(audit.metadata.disputeId).toBe('disp-6');
  });
});
