/**
 * Unit Tests - Tenant Suspension (LOT 11.0 - US 11.4)
 *
 * RGPD Compliance:
 * - Audit trail verification
 * - Suspension reason required
 * - Reversibility tested
 */

import { suspendTenant } from '@app/usecases/tenants/suspendTenant'
import { unsuspendTenant } from '@app/usecases/tenants/unsuspendTenant'
import type { TenantRepo } from '@/app/ports/TenantRepo'
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter'

describe('Tenant Suspension Use Cases', () => {
  let mockTenantRepo: jest.Mocked<TenantRepo>
  let mockAuditWriter: jest.Mocked<AuditEventWriter>

  beforeEach(() => {
    mockTenantRepo = {
      getById: jest.fn(),
      suspend: jest.fn(),
      unsuspend: jest.fn(),
    } as unknown as jest.Mocked<TenantRepo>

    mockAuditWriter = {
      write: jest.fn(),
    } as jest.Mocked<AuditEventWriter>
  })

  describe('suspendTenant', () => {
    it('should suspend active tenant with reason', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Acme Corp',
        slug: 'acme',
        createdAt: new Date(),
        deletedAt: null,
        suspendedAt: null,
        suspensionReason: null,
        suspendedBy: null,
      }

      mockTenantRepo.getById.mockResolvedValue(mockTenant)
      mockTenantRepo.suspend.mockResolvedValue(undefined)

      await suspendTenant(
        {
          tenantId: 'tenant-123',
          reason: 'Impayé',
          actorId: 'admin-456',
        },
        {
          tenantRepo: mockTenantRepo,
          auditEventWriter: mockAuditWriter,
        }
      )

      expect(mockTenantRepo.getById).toHaveBeenCalledWith('tenant-123')
      expect(mockTenantRepo.suspend).toHaveBeenCalledWith('tenant-123', {
        reason: 'Impayé',
        suspendedBy: 'admin-456',
      })
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'tenant.suspended',
          actorId: 'admin-456',
          tenantId: 'tenant-123',
          metadata: expect.objectContaining({
            reason: 'Impayé',
          }),
        })
      )
    })

    it('should throw error if tenant not found', async () => {
      mockTenantRepo.getById.mockResolvedValue(null)

      await expect(
        suspendTenant(
          {
            tenantId: 'nonexistent',
            reason: 'Test',
            actorId: 'admin-456',
          },
          {
            tenantRepo: mockTenantRepo,
            auditEventWriter: mockAuditWriter,
          }
        )
      ).rejects.toThrow('Tenant not found')

      expect(mockTenantRepo.suspend).not.toHaveBeenCalled()
      expect(mockAuditWriter.write).not.toHaveBeenCalled()
    })

    it('should throw error if tenant already suspended', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Acme Corp',
        slug: 'acme',
        createdAt: new Date(),
        deletedAt: null,
        suspendedAt: new Date(),
        suspensionReason: 'Already suspended',
        suspendedBy: 'admin-000',
      }

      mockTenantRepo.getById.mockResolvedValue(mockTenant)

      await expect(
        suspendTenant(
          {
            tenantId: 'tenant-123',
            reason: 'New reason',
            actorId: 'admin-456',
          },
          {
            tenantRepo: mockTenantRepo,
            auditEventWriter: mockAuditWriter,
          }
        )
      ).rejects.toThrow('Tenant is already suspended')

      expect(mockTenantRepo.suspend).not.toHaveBeenCalled()
      expect(mockAuditWriter.write).not.toHaveBeenCalled()
    })
  })

  describe('unsuspendTenant', () => {
    it('should unsuspend suspended tenant', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Acme Corp',
        slug: 'acme',
        createdAt: new Date(),
        deletedAt: null,
        suspendedAt: new Date(),
        suspensionReason: 'Impayé',
        suspendedBy: 'admin-000',
      }

      mockTenantRepo.getById.mockResolvedValue(mockTenant)
      mockTenantRepo.unsuspend.mockResolvedValue(undefined)

      await unsuspendTenant(
        {
          tenantId: 'tenant-123',
          actorId: 'admin-456',
        },
        {
          tenantRepo: mockTenantRepo,
          auditEventWriter: mockAuditWriter,
        }
      )

      expect(mockTenantRepo.getById).toHaveBeenCalledWith('tenant-123')
      expect(mockTenantRepo.unsuspend).toHaveBeenCalledWith('tenant-123')
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'tenant.unsuspended',
          actorId: 'admin-456',
          tenantId: 'tenant-123',
          metadata: expect.objectContaining({
            previousReason: 'Impayé',
          }),
        })
      )
    })

    it('should throw error if tenant not found', async () => {
      mockTenantRepo.getById.mockResolvedValue(null)

      await expect(
        unsuspendTenant(
          {
            tenantId: 'nonexistent',
            actorId: 'admin-456',
          },
          {
            tenantRepo: mockTenantRepo,
            auditEventWriter: mockAuditWriter,
          }
        )
      ).rejects.toThrow('Tenant not found')

      expect(mockTenantRepo.unsuspend).not.toHaveBeenCalled()
      expect(mockAuditWriter.write).not.toHaveBeenCalled()
    })

    it('should throw error if tenant not suspended', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Acme Corp',
        slug: 'acme',
        createdAt: new Date(),
        deletedAt: null,
        suspendedAt: null,
        suspensionReason: null,
        suspendedBy: null,
      }

      mockTenantRepo.getById.mockResolvedValue(mockTenant)

      await expect(
        unsuspendTenant(
          {
            tenantId: 'tenant-123',
            actorId: 'admin-456',
          },
          {
            tenantRepo: mockTenantRepo,
            auditEventWriter: mockAuditWriter,
          }
        )
      ).rejects.toThrow('Tenant is not suspended')

      expect(mockTenantRepo.unsuspend).not.toHaveBeenCalled()
      expect(mockAuditWriter.write).not.toHaveBeenCalled()
    })
  })
})
