/**
 * Unit Tests - Authentication with Tenant Suspension (LOT 11.0)
 *
 * RGPD Compliance:
 * - Audit trail for blocked logins
 * - Suspension reason included in audit metadata
 * - Clear error messages without leaking sensitive data
 */

import { authenticateUser } from '@/app/usecases/auth/authenticateUser'
import type { UserRepo } from '@/app/ports/UserRepo'
import type { TenantRepo } from '@/app/ports/TenantRepo'
import type { PasswordHasher } from '@/app/ports/PasswordHasher'
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { ACTOR_ROLE } from '@/shared/actorRole'

describe('Authentication with Tenant Suspension', () => {
  let mockUserRepo: jest.Mocked<UserRepo>
  let mockTenantRepo: jest.Mocked<TenantRepo>
  let mockPasswordHasher: jest.Mocked<PasswordHasher>
  let mockAuditWriter: jest.Mocked<AuditEventWriter>

  beforeEach(() => {
    mockUserRepo = {
      findByEmailHash: jest.fn(),
    } as unknown as jest.Mocked<UserRepo>

    mockTenantRepo = {
      getById: jest.fn(),
    } as unknown as jest.Mocked<TenantRepo>

    mockPasswordHasher = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as jest.Mocked<PasswordHasher>

    mockAuditWriter = {
      write: jest.fn(),
    } as jest.Mocked<AuditEventWriter>
  })

  describe('Tenant Suspension Blocking', () => {
    it('should block login when tenant is suspended', async () => {
      // Arrange: User exists with valid password but tenant is suspended
      const mockUser = {
        id: 'user-123',
        emailHash: 'hash123',
        passwordHash: 'passhash123',
        displayName: 'John Doe',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.MEMBER,
        dataSuspended: false,
        createdAt: new Date(),
        deletedAt: null,
      }

      const mockTenant = {
        id: 'tenant-456',
        name: 'Acme Corp',
        slug: 'acme',
        createdAt: new Date(),
        deletedAt: null,
        suspendedAt: new Date(),
        suspensionReason: 'Impayé',
        suspendedBy: 'admin-789',
      }

      mockUserRepo.findByEmailHash.mockResolvedValue(mockUser)
      mockTenantRepo.getById.mockResolvedValue(mockTenant)

      // Act & Assert
      await expect(
        authenticateUser(
          mockUserRepo,
          mockPasswordHasher,
          mockAuditWriter,
          mockTenantRepo,
          {
            email: 'john@example.com',
            password: 'SecurePass123!',
          }
        )
      ).rejects.toThrow('Tenant suspended')

      // Verify audit event was emitted
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'auth.login.failed',
          actorScope: ACTOR_SCOPE.TENANT,
          actorId: 'user-123',
          tenantId: 'tenant-456',
          metadata: expect.objectContaining({
            reason: 'tenant_suspended',
            suspensionReason: 'Impayé',
          }),
        })
      )

      // Verify password was NOT checked (fail fast)
      expect(mockPasswordHasher.verify).not.toHaveBeenCalled()
    })

    it('should allow login when tenant is not suspended', async () => {
      // Arrange: User exists with active tenant
      const mockUser = {
        id: 'user-123',
        emailHash: 'hash123',
        passwordHash: 'passhash123',
        displayName: 'John Doe',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.MEMBER,
        dataSuspended: false,
        createdAt: new Date(),
        deletedAt: null,
      }

      const mockTenant = {
        id: 'tenant-456',
        name: 'Acme Corp',
        slug: 'acme',
        createdAt: new Date(),
        deletedAt: null,
        suspendedAt: null,
        suspensionReason: null,
        suspendedBy: null,
      }

      mockUserRepo.findByEmailHash.mockResolvedValue(mockUser)
      mockTenantRepo.getById.mockResolvedValue(mockTenant)
      mockPasswordHasher.verify.mockResolvedValue(true)

      // Act
      const result = await authenticateUser(
        mockUserRepo,
        mockPasswordHasher,
        mockAuditWriter,
        mockTenantRepo,
        {
          email: 'john@example.com',
          password: 'SecurePass123!',
        }
      )

      // Assert
      expect(result).toEqual({
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.MEMBER,
        displayName: 'John Doe',
      })

      // Verify success audit event
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'auth.login.success',
          actorScope: ACTOR_SCOPE.TENANT,
          actorId: 'user-123',
          tenantId: 'tenant-456',
        })
      )
    })

    it('should allow login for PLATFORM users even if tenant exists', async () => {
      // Arrange: PLATFORM user (no tenant association)
      const mockUser = {
        id: 'platform-user-123',
        emailHash: 'hash123',
        passwordHash: 'passhash123',
        displayName: 'Platform Admin',
        tenantId: null,
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'SUPERADMIN',
        dataSuspended: false,
        createdAt: new Date(),
        deletedAt: null,
      }

      mockUserRepo.findByEmailHash.mockResolvedValue(mockUser)
      mockPasswordHasher.verify.mockResolvedValue(true)

      // Act
      const result = await authenticateUser(
        mockUserRepo,
        mockPasswordHasher,
        mockAuditWriter,
        mockTenantRepo,
        {
          email: 'admin@platform.com',
          password: 'SecurePass123!',
        }
      )

      // Assert
      expect(result).toEqual({
        userId: 'platform-user-123',
        tenantId: null,
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'SUPERADMIN',
        displayName: 'Platform Admin',
      })

      // Verify tenant check was skipped (tenantId is null)
      expect(mockTenantRepo.getById).not.toHaveBeenCalled()
    })

    it('should prioritize user suspension over tenant suspension check', async () => {
      // Arrange: User is suspended (should fail before tenant check)
      const mockUser = {
        id: 'user-123',
        emailHash: 'hash123',
        passwordHash: 'passhash123',
        displayName: 'John Doe',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.MEMBER,
        dataSuspended: true, // User suspended
        createdAt: new Date(),
        deletedAt: null,
      }

      mockUserRepo.findByEmailHash.mockResolvedValue(mockUser)

      // Act & Assert
      await expect(
        authenticateUser(
          mockUserRepo,
          mockPasswordHasher,
          mockAuditWriter,
          mockTenantRepo,
          {
            email: 'john@example.com',
            password: 'SecurePass123!',
          }
        )
      ).rejects.toThrow('Account suspended')

      // Verify tenant check was NOT performed
      expect(mockTenantRepo.getById).not.toHaveBeenCalled()

      // Verify correct audit event
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'auth.login.failed',
          metadata: expect.objectContaining({
            reason: 'user_suspended',
          }),
        })
      )
    })

    it('should handle tenant not found gracefully (allow login)', async () => {
      // Arrange: User references tenant that no longer exists
      const mockUser = {
        id: 'user-123',
        emailHash: 'hash123',
        passwordHash: 'passhash123',
        displayName: 'John Doe',
        tenantId: 'nonexistent-tenant',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.MEMBER,
        dataSuspended: false,
        createdAt: new Date(),
        deletedAt: null,
      }

      mockUserRepo.findByEmailHash.mockResolvedValue(mockUser)
      mockTenantRepo.getById.mockResolvedValue(null)
      mockPasswordHasher.verify.mockResolvedValue(true)

      // Act
      const result = await authenticateUser(
        mockUserRepo,
        mockPasswordHasher,
        mockAuditWriter,
        mockTenantRepo,
        {
          email: 'john@example.com',
          password: 'SecurePass123!',
        }
      )

      // Assert: Login succeeds (tenant not found = not suspended)
      expect(result).toEqual({
        userId: 'user-123',
        tenantId: 'nonexistent-tenant',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.MEMBER,
        displayName: 'John Doe',
      })
    })
  })

  describe('RGPD Compliance - Audit Trail', () => {
    it('should include suspension reason in audit metadata', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        emailHash: 'hash123',
        passwordHash: 'passhash123',
        displayName: 'John Doe',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.MEMBER,
        dataSuspended: false,
        createdAt: new Date(),
        deletedAt: null,
      }

      const mockTenant = {
        id: 'tenant-456',
        name: 'Acme Corp',
        slug: 'acme',
        createdAt: new Date(),
        deletedAt: null,
        suspendedAt: new Date(),
        suspensionReason: 'Non-conformité RGPD',
        suspendedBy: 'admin-789',
      }

      mockUserRepo.findByEmailHash.mockResolvedValue(mockUser)
      mockTenantRepo.getById.mockResolvedValue(mockTenant)

      // Act
      await expect(
        authenticateUser(
          mockUserRepo,
          mockPasswordHasher,
          mockAuditWriter,
          mockTenantRepo,
          {
            email: 'john@example.com',
            password: 'SecurePass123!',
          }
        )
      ).rejects.toThrow('Tenant suspended')

      // Assert: Audit event includes exact suspension reason
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            suspensionReason: 'Non-conformité RGPD',
          }),
        })
      )
    })

    it('should use "unknown" if suspensionReason is null', async () => {
      // Arrange: Tenant suspended but reason is missing (data inconsistency)
      const mockUser = {
        id: 'user-123',
        emailHash: 'hash123',
        passwordHash: 'passhash123',
        displayName: 'John Doe',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.MEMBER,
        dataSuspended: false,
        createdAt: new Date(),
        deletedAt: null,
      }

      const mockTenant = {
        id: 'tenant-456',
        name: 'Acme Corp',
        slug: 'acme',
        createdAt: new Date(),
        deletedAt: null,
        suspendedAt: new Date(),
        suspensionReason: null, // Missing reason (should not happen due to constraint)
        suspendedBy: 'admin-789',
      }

      mockUserRepo.findByEmailHash.mockResolvedValue(mockUser)
      mockTenantRepo.getById.mockResolvedValue(mockTenant)

      // Act
      await expect(
        authenticateUser(
          mockUserRepo,
          mockPasswordHasher,
          mockAuditWriter,
          mockTenantRepo,
          {
            email: 'john@example.com',
            password: 'SecurePass123!',
          }
        )
      ).rejects.toThrow('Tenant suspended')

      // Assert: Fallback to 'unknown'
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            suspensionReason: 'unknown',
          }),
        })
      )
    })

    it('should NOT leak email or password in audit events', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        emailHash: 'hash123',
        passwordHash: 'passhash123',
        displayName: 'John Doe',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.MEMBER,
        dataSuspended: false,
        createdAt: new Date(),
        deletedAt: null,
      }

      const mockTenant = {
        id: 'tenant-456',
        name: 'Acme Corp',
        slug: 'acme',
        createdAt: new Date(),
        deletedAt: null,
        suspendedAt: new Date(),
        suspensionReason: 'Test',
        suspendedBy: 'admin-789',
      }

      mockUserRepo.findByEmailHash.mockResolvedValue(mockUser)
      mockTenantRepo.getById.mockResolvedValue(mockTenant)

      // Act
      await expect(
        authenticateUser(
          mockUserRepo,
          mockPasswordHasher,
          mockAuditWriter,
          mockTenantRepo,
          {
            email: 'john@example.com',
            password: 'SecurePass123!',
          }
        )
      ).rejects.toThrow('Tenant suspended')

      // Assert: No P2 data (email, emailHash) in metadata
      const auditCall = mockAuditWriter.write.mock.calls[0][0]
      expect(auditCall.metadata).not.toHaveProperty('email')
      expect(auditCall.metadata).not.toHaveProperty('emailHash')
      expect(auditCall.metadata).not.toHaveProperty('password')
    })
  })
})
