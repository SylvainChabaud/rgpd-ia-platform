/**
 * Domain Entity Tests: DataSuspension
 * RGPD: Art. 18 (data limitation)
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateSuspensionEmailMessage,
  getSuspensionDuration,
  getSuspensionReasonLabel,
  isDataSuspended,
  isLongTermSuspension,
  suspendUserData,
  toPublicDataSuspension,
  unsuspendUserData,
} from '@/domain/rgpd/DataSuspension';

describe('Domain: DataSuspension', () => {
  it('creates a suspension with required fields', () => {
    const suspension = suspendUserData({
      tenantId: 'tenant-1',
      userId: 'user-1',
      reason: 'user_request',
      requestedBy: 'user-1',
    });

    expect(suspension.suspended).toBe(true);
    expect(suspension.suspendedAt).toBeInstanceOf(Date);
    expect(suspension.suspendedReason).toBe('user_request');
  });

  it('rejects notes longer than allowed', () => {
    const longNotes = 'a'.repeat(1001);
    expect(() =>
      suspendUserData({
        tenantId: 'tenant-1',
        userId: 'user-1',
        reason: 'user_request',
        requestedBy: 'user-1',
        notes: longNotes,
      })
    ).toThrow('Notes must not exceed');
  });

  it('unsuspends a suspended user', () => {
    const suspension = suspendUserData({
      tenantId: 'tenant-1',
      userId: 'user-1',
      reason: 'legal_claim',
      requestedBy: 'admin-1',
    });

    const unsuspended = unsuspendUserData(suspension, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      requestedBy: 'admin-1',
    });

    expect(unsuspended.suspended).toBe(false);
    expect(unsuspended.unsuspendedAt).toBeInstanceOf(Date);
  });

  it('calculates suspension duration and long-term flag', () => {
    const suspension = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      suspended: true,
      suspendedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      suspendedReason: 'user_request' as const,
      unsuspendedAt: null,
      requestedBy: 'user-1',
      notes: null,
    };

    expect(isDataSuspended(suspension)).toBe(true);
    expect(getSuspensionDuration(suspension)).toBeGreaterThan(30);
    expect(isLongTermSuspension(suspension)).toBe(true);
  });

  it('returns null duration when suspendedAt is missing', () => {
    const suspension = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      suspended: false,
      suspendedAt: null,
      suspendedReason: null,
      unsuspendedAt: null,
      requestedBy: 'user-1',
      notes: null,
    };

    expect(getSuspensionDuration(suspension)).toBeNull();
    expect(isLongTermSuspension(suspension)).toBe(false);
  });

  it('maps reason label and public suspension output', () => {
    const suspension = suspendUserData({
      tenantId: 'tenant-1',
      userId: 'user-1',
      reason: 'opposition_pending',
      requestedBy: 'user-1',
    });

    expect(getSuspensionReasonLabel('opposition_pending')).toContain('Opposition');
    const publicData = toPublicDataSuspension(suspension);
    expect(publicData.suspended).toBe(true);
    expect(publicData.reason).toContain('Opposition');
  });

  it('generates email messages for suspended and unsuspended states', () => {
    const suspended = suspendUserData({
      tenantId: 'tenant-1',
      userId: 'user-1',
      reason: 'user_request',
      requestedBy: 'user-1',
    });
    const suspendedEmail = generateSuspensionEmailMessage(suspended);
    expect(suspendedEmail.subject).toContain('Suspension');

    const unsuspended = unsuspendUserData(suspended, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      requestedBy: 'user-1',
    });
    const unsuspendedEmail = generateSuspensionEmailMessage(unsuspended);
    expect(unsuspendedEmail.subject).toContain('Reprise');
  });
});
