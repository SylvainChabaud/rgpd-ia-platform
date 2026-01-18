/**
 * Unit Tests: User Dispute Domain Entity
 * Coverage: src/domain/rgpd/UserDispute.ts
 * RGPD: Art. 22 - Right to Human Intervention
 */

import { describe, it, expect } from '@jest/globals';
import {
  createDispute,
  canDisputeJob,
  isDisputePending,
  isDisputeResolved,
  toPublicDispute,
  toAuditEvent,
  MIN_REASON_LENGTH,
  MAX_REASON_LENGTH,
  MAX_DISPUTE_AGE_DAYS,
  type UserDispute,
} from '@/domain/rgpd/UserDispute';

describe('createDispute', () => {
  it('should create valid dispute', () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'This AI decision is incorrect because...',
      attachmentUrl: 'https://example.com/proof.pdf',
    };

    const dispute = createDispute(input);

    expect(dispute.tenantId).toBe('tenant-1');
    expect(dispute.userId).toBe('user-1');
    expect(dispute.aiJobId).toBe('job-1');
    expect(dispute.reason).toBe('This AI decision is incorrect because...');
    expect(dispute.attachmentUrl).toBe('https://example.com/proof.pdf');
  });

  it('should handle missing attachment', () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Valid reason here',
    };

    const dispute = createDispute(input);

    expect(dispute.attachmentUrl).toBeNull();
  });

  it('should throw if tenantId missing', () => {
    const input = {
      tenantId: '',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Valid reason',
    };

    expect(() => createDispute(input)).toThrow('tenantId, userId and aiJobId are required');
  });

  it('should throw if userId missing', () => {
    const input = {
      tenantId: 'tenant-1',
      userId: '',
      aiJobId: 'job-1',
      reason: 'Valid reason',
    };

    expect(() => createDispute(input)).toThrow('tenantId, userId and aiJobId are required');
  });

  it('should throw if aiJobId missing', () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: '',
      reason: 'Valid reason',
    };

    expect(() => createDispute(input)).toThrow('tenantId, userId and aiJobId are required');
  });

  it('should throw if reason too short', () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Short',
    };

    expect(() => createDispute(input)).toThrow(
      `Reason must be at least ${MIN_REASON_LENGTH} characters`
    );
  });

  it('should throw if reason too long', () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'a'.repeat(MAX_REASON_LENGTH + 1),
    };

    expect(() => createDispute(input)).toThrow(
      `Reason cannot exceed ${MAX_REASON_LENGTH} characters`
    );
  });

  it('should accept reason at minimum length', () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'a'.repeat(MIN_REASON_LENGTH),
    };

    const dispute = createDispute(input);

    expect(dispute.reason).toHaveLength(MIN_REASON_LENGTH);
  });

  it('should accept reason at maximum length', () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'a'.repeat(MAX_REASON_LENGTH),
    };

    const dispute = createDispute(input);

    expect(dispute.reason).toHaveLength(MAX_REASON_LENGTH);
  });
});

describe('canDisputeJob', () => {
  it('should allow dispute within MAX_DISPUTE_AGE_DAYS', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(canDisputeJob(yesterday)).toBe(true);
  });

  it('should allow dispute exactly at MAX_DISPUTE_AGE_DAYS', () => {
    const maxAgeDate = new Date();
    maxAgeDate.setDate(maxAgeDate.getDate() - MAX_DISPUTE_AGE_DAYS);

    expect(canDisputeJob(maxAgeDate)).toBe(true);
  });

  it('should reject dispute after MAX_DISPUTE_AGE_DAYS', () => {
    const tooOld = new Date();
    tooOld.setDate(tooOld.getDate() - MAX_DISPUTE_AGE_DAYS - 1);

    expect(canDisputeJob(tooOld)).toBe(false);
  });

  it('should allow dispute for job completed today', () => {
    const today = new Date();

    expect(canDisputeJob(today)).toBe(true);
  });

  it('should handle future dates (edge case)', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);

    expect(canDisputeJob(future)).toBe(true);
  });
});

describe('isDisputePending', () => {
  it('should return true for pending dispute', () => {
    const dispute: UserDispute = {
      id: '1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Test reason here',
      attachmentUrl: null,
      status: 'pending',
      createdAt: new Date(),
      resolvedAt: null,
      reviewedAt: null,
      adminResponse: null,
      reviewedBy: null,
    };

    expect(isDisputePending(dispute)).toBe(true);
  });

  it('should return false for resolved dispute', () => {
    const dispute: UserDispute = {
      id: '1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Test reason',
      attachmentUrl: null,
      status: 'resolved',
      createdAt: new Date(),
      resolvedAt: new Date(),
      reviewedAt: new Date(),
      adminResponse: 'Resolved',
      reviewedBy: 'admin-1',
    };

    expect(isDisputePending(dispute)).toBe(false);
  });

  it('should return false for rejected dispute', () => {
    const dispute: UserDispute = {
      id: '1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Test reason',
      attachmentUrl: null,
      status: 'rejected',
      createdAt: new Date(),
      resolvedAt: new Date(),
      reviewedAt: new Date(),
      adminResponse: 'Rejected',
      reviewedBy: 'admin-1',
    };

    expect(isDisputePending(dispute)).toBe(false);
  });
});

describe('isDisputeResolved', () => {
  it('should return true for resolved dispute', () => {
    const dispute: UserDispute = {
      id: '1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Test',
      attachmentUrl: null,
      status: 'resolved',
      createdAt: new Date(),
      resolvedAt: new Date(),
      reviewedAt: new Date(),
      adminResponse: 'Fixed',
      reviewedBy: 'admin-1',
    };

    expect(isDisputeResolved(dispute)).toBe(true);
  });

  it('should return false for pending dispute', () => {
    const dispute: UserDispute = {
      id: '1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Test',
      attachmentUrl: null,
      status: 'pending',
      createdAt: new Date(),
      resolvedAt: null,
      reviewedAt: null,
      adminResponse: null,
      reviewedBy: null,
    };

    expect(isDisputeResolved(dispute)).toBe(false);
  });

  it('should return false for rejected dispute', () => {
    const dispute: UserDispute = {
      id: '1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Test',
      attachmentUrl: null,
      status: 'rejected',
      createdAt: new Date(),
      resolvedAt: new Date(),
      reviewedAt: new Date(),
      adminResponse: 'Not valid',
      reviewedBy: 'admin-1',
    };

    expect(isDisputeResolved(dispute)).toBe(false);
  });
});

describe('toPublicDispute', () => {
  it('should map to public format (hide sensitive fields)', () => {
    const dispute: UserDispute = {
      id: 'dispute-1',
      tenantId: 'tenant-secret',
      userId: 'user-secret',
      aiJobId: 'job-1',
      reason: 'Public reason',
      attachmentUrl: 'https://example.com/file.pdf',
      status: 'pending',
      createdAt: new Date('2024-01-01'),
      resolvedAt: null,
      reviewedAt: null,
      adminResponse: null,
      reviewedBy: null,
    };

    const publicDispute = toPublicDispute(dispute);

    expect(publicDispute).toEqual({
      id: 'dispute-1',
      aiJobId: 'job-1',
      reason: 'Public reason',
      status: 'pending',
      createdAt: dispute.createdAt,
      resolvedAt: null,
      adminResponse: null,
    });

    // Verify sensitive fields excluded
    expect((publicDispute as UserDispute).tenantId).toBeUndefined();
    expect((publicDispute as UserDispute).userId).toBeUndefined();
    expect((publicDispute as UserDispute).attachmentUrl).toBeUndefined();
    expect((publicDispute as UserDispute).reviewedBy).toBeUndefined();
  });

  it('should include admin response when resolved', () => {
    const dispute: UserDispute = {
      id: 'dispute-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Test',
      attachmentUrl: null,
      status: 'resolved',
      createdAt: new Date(),
      resolvedAt: new Date(),
      reviewedAt: new Date(),
      adminResponse: 'Issue has been fixed',
      reviewedBy: 'admin-1',
    };

    const publicDispute = toPublicDispute(dispute);

    expect(publicDispute.adminResponse).toBe('Issue has been fixed');
    expect(publicDispute.resolvedAt).not.toBeNull();
  });
});

describe('toAuditEvent', () => {
  it('should create RGPD-safe audit event (no PII)', () => {
    const dispute: UserDispute = {
      id: 'dispute-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Sensitive reason with PII',
      attachmentUrl: 'https://example.com/file.pdf',
      status: 'pending',
      createdAt: new Date(),
      resolvedAt: null,
      reviewedAt: null,
      adminResponse: null,
      reviewedBy: null,
    };

    const auditEvent = toAuditEvent(dispute, 'dispute.created');

    expect(auditEvent).toEqual({
      eventType: 'dispute.created',
      tenantId: 'tenant-1',
      actorId: 'user-1',
      metadata: {
        disputeId: 'dispute-1',
        aiJobId: 'job-1',
        status: 'pending',
        hasAttachment: true,
      },
    });

    // Verify NO PII in audit event
    const auditEventRecord = auditEvent as Record<string, unknown>;
    expect(auditEventRecord.reason).toBeUndefined();
    expect(auditEventRecord.attachmentUrl).toBeUndefined();
  });

  it('should handle dispute without attachment', () => {
    const dispute: UserDispute = {
      id: 'dispute-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      aiJobId: 'job-1',
      reason: 'Test',
      attachmentUrl: null,
      status: 'resolved',
      createdAt: new Date(),
      resolvedAt: new Date(),
      reviewedAt: new Date(),
      adminResponse: 'Done',
      reviewedBy: 'admin-1',
    };

    const auditEvent = toAuditEvent(dispute, 'dispute.resolved');

    expect(auditEvent.metadata.hasAttachment).toBe(false);
    expect(auditEvent.metadata.status).toBe('resolved');
  });
});
