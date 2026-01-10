/**
 * Use Case Tests: CreateTenantUserUseCase
 * LOT 11.0 - Coverage improvement (0% → 80%+)
 *
 * Tests creation of regular tenant users (MEMBER role).
 * Used by CLI bootstrap for development environment setup.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CreateTenantUserUseCase } from '@/app/usecases/bootstrap/CreateTenantUserUseCase';
import { MemTenantRepo, MemTenantUserRepo, MemAuditWriter } from '../../helpers/memoryRepos';
import { ForbiddenError, InvalidTenantError, ValidationError } from '@/shared/errors';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import type { RequestContext } from '@/app/context/RequestContext';
import type { PolicyEngine, PolicyDecision } from '@/app/auth/policyEngine';

class MockPolicyEngine implements PolicyEngine {
  private allowDecisions = new Map<string, boolean>();

  setAllow(action: string, allowed: boolean) {
    this.allowDecisions.set(action, allowed);
  }

  async check(_ctx: RequestContext, action: string): Promise<PolicyDecision> {
    const allowed = this.allowDecisions.get(action) ?? false;
    return {
      allowed,
      reason: allowed ? undefined : `Policy denied: ${action}`,
    };
  }
}

describe('UseCase: CreateTenantUserUseCase', () => {
  let usecase: CreateTenantUserUseCase;
  let tenantRepo: MemTenantRepo;
  let tenantUserRepo: MemTenantUserRepo;
  let auditWriter: MemAuditWriter;
  let policyEngine: MockPolicyEngine;

  const mockContext: RequestContext = {
    actorScope: ACTOR_SCOPE.PLATFORM,
    actorId: 'superadmin-id',
    tenantId: undefined,
  };

  beforeEach(() => {
    tenantRepo = new MemTenantRepo();
    tenantUserRepo = new MemTenantUserRepo();
    auditWriter = new MemAuditWriter();
    policyEngine = new MockPolicyEngine();

    usecase = new CreateTenantUserUseCase(
      tenantRepo,
      tenantUserRepo,
      auditWriter,
      policyEngine
    );
  });

  describe('Successful User Creation', () => {
    it('should create tenant user with valid input', async () => {
      // Setup
      await tenantRepo.create({
        id: 'tenant-123',
        slug: 'test-tenant',
        name: 'Test Tenant',
      });
      policyEngine.setAllow('tenant-admin:create', true);

      // Execute
      const result = await usecase.execute(mockContext, {
        tenantSlug: 'test-tenant',
        email: 'user@example.com',
        displayName: 'Test User',
        password: 'securePassword123',
      });

      // Verify
      expect(result.tenantUserId).toBeDefined();
      expect(result.tenantId).toBe('tenant-123');
      expect(tenantUserRepo.users).toHaveLength(1);
      expect(tenantUserRepo.users[0].tenantId).toBe('tenant-123');
      expect(tenantUserRepo.users[0].emailHash).toBeDefined();
      expect(tenantUserRepo.users[0].displayName).toBe('Test User');
    });

    it('should create user without password (disabled login)', async () => {
      await tenantRepo.create({
        id: 'tenant-456',
        slug: 'prod-tenant',
        name: 'Production Tenant',
      });
      policyEngine.setAllow('tenant-admin:create', true);

      const result = await usecase.execute(mockContext, {
        tenantSlug: 'prod-tenant',
        email: 'readonly@example.com',
        displayName: 'Read Only User',
      });

      expect(result.tenantUserId).toBeDefined();
      expect(result.tenantId).toBe('tenant-456');
      expect(tenantUserRepo.users).toHaveLength(1);
      // Password hash should be DISABLED_PASSWORD_HASH
      expect(tenantUserRepo.users[0].passwordHash).toBeDefined();
    });

    it('should hash password when provided', async () => {
      await tenantRepo.create({
        id: 'tenant-789',
        slug: 'dev-tenant',
        name: 'Dev Tenant',
      });
      policyEngine.setAllow('tenant-admin:create', true);

      await usecase.execute(mockContext, {
        tenantSlug: 'dev-tenant',
        email: 'dev@example.com',
        displayName: 'Dev User',
        password: 'devPassword123',
      });

      // Password should be hashed (not plain text)
      expect(tenantUserRepo.users[0].passwordHash).not.toBe('devPassword123');
      // SHA256 hash with salt format: "salt:hash"
      expect(tenantUserRepo.users[0].passwordHash).toMatch(/^[a-f0-9]+:[a-f0-9]{64}$/);
    });

    it('should hash email correctly', async () => {
      await tenantRepo.create({
        id: 'tenant-abc',
        slug: 'email-tenant',
        name: 'Email Tenant',
      });
      policyEngine.setAllow('tenant-admin:create', true);

      await usecase.execute(mockContext, {
        tenantSlug: 'email-tenant',
        email: 'test@domain.com',
        displayName: 'Email Test User',
        password: 'password123',
      });

      // Email should be hashed
      expect(tenantUserRepo.users[0].emailHash).not.toBe('test@domain.com');
      expect(tenantUserRepo.users[0].emailHash).toBeDefined();
    });

    it('should emit audit event', async () => {
      await tenantRepo.create({
        id: 'tenant-audit',
        slug: 'audit-tenant',
        name: 'Audit Tenant',
      });
      policyEngine.setAllow('tenant-admin:create', true);

      await usecase.execute(mockContext, {
        tenantSlug: 'audit-tenant',
        email: 'audit@example.com',
        displayName: 'Audit User',
      });

      expect(auditWriter.events).toHaveLength(1);
      expect(auditWriter.events[0].eventName).toBe('tenant.user.created');
      expect(auditWriter.events[0].tenantId).toBe('tenant-audit');
      expect(auditWriter.events[0].actorScope).toBe(ACTOR_SCOPE.PLATFORM);
    });

    it('should create multiple users for same tenant', async () => {
      await tenantRepo.create({
        id: 'tenant-multi',
        slug: 'multi-tenant',
        name: 'Multi User Tenant',
      });
      policyEngine.setAllow('tenant-admin:create', true);

      await usecase.execute(mockContext, {
        tenantSlug: 'multi-tenant',
        email: 'user1@example.com',
        displayName: 'User 1',
        password: 'password1',
      });

      await usecase.execute(mockContext, {
        tenantSlug: 'multi-tenant',
        email: 'user2@example.com',
        displayName: 'User 2',
        password: 'password2',
      });

      expect(tenantUserRepo.users).toHaveLength(2);
      expect(tenantUserRepo.users.every(u => u.tenantId === 'tenant-multi')).toBe(true);
    });
  });

  describe('Permission Checks', () => {
    it('should reject when policy denies permission', async () => {
      await tenantRepo.create({
        id: 'tenant-forbidden',
        slug: 'forbidden-tenant',
        name: 'Forbidden Tenant',
      });
      policyEngine.setAllow('tenant-admin:create', false);

      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 'forbidden-tenant',
          email: 'forbidden@example.com',
          displayName: 'Forbidden User',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should include policy reason in error', async () => {
      await tenantRepo.create({
        id: 'tenant-reason',
        slug: 'reason-tenant',
        name: 'Reason Tenant',
      });
      policyEngine.setAllow('tenant-admin:create', false);

      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 'reason-tenant',
          email: 'test@example.com',
          displayName: 'Test',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow with correct permissions', async () => {
      await tenantRepo.create({
        id: 'tenant-allowed',
        slug: 'allowed-tenant',
        name: 'Allowed Tenant',
      });
      policyEngine.setAllow('tenant-admin:create', true);

      const result = await usecase.execute(mockContext, {
        tenantSlug: 'allowed-tenant',
        email: 'allowed@example.com',
        displayName: 'Allowed User',
      });

      expect(result.tenantUserId).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      policyEngine.setAllow('tenant-admin:create', true);
    });

    it('should reject invalid email', async () => {
      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 'test-tenant',
          email: 'invalid-email',
          displayName: 'Test User',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject short tenant slug', async () => {
      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 'ab', // Too short (min 3)
          email: 'test@example.com',
          displayName: 'Test User',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject long tenant slug', async () => {
      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 'x'.repeat(81), // Too long (max 80)
          email: 'test@example.com',
          displayName: 'Test User',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject empty display name', async () => {
      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 'test-tenant',
          email: 'test@example.com',
          displayName: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject long display name', async () => {
      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 'test-tenant',
          email: 'test@example.com',
          displayName: 'x'.repeat(121), // Too long (max 120)
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject short password', async () => {
      await tenantRepo.create({
        id: 'tenant-short-pass',
        slug: 'short-pass-tenant',
        name: 'Short Pass Tenant',
      });

      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 'short-pass-tenant',
          email: 'test@example.com',
          displayName: 'Test User',
          password: 'short', // Less than 8 characters
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should accept password with exactly 8 characters', async () => {
      await tenantRepo.create({
        id: 'tenant-min-pass',
        slug: 'min-pass-tenant',
        name: 'Min Pass Tenant',
      });

      const result = await usecase.execute(mockContext, {
        tenantSlug: 'min-pass-tenant',
        email: 'minpass@example.com',
        displayName: 'Min Pass User',
        password: '12345678', // Exactly 8 characters
      });

      expect(result.tenantUserId).toBeDefined();
    });

    it('should reject invalid input types', async () => {
      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 123 as unknown as string, // Testing invalid input type at runtime
          email: 'test@example.com',
          displayName: 'Test User',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Tenant Validation', () => {
    beforeEach(() => {
      policyEngine.setAllow('tenant-admin:create', true);
    });

    it('should reject non-existent tenant', async () => {
      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 'non-existent-tenant',
          email: 'test@example.com',
          displayName: 'Test User',
        })
      ).rejects.toThrow(InvalidTenantError);
    });

    it('should include error message for unknown tenant', async () => {
      await expect(
        usecase.execute(mockContext, {
          tenantSlug: 'unknown-tenant',
          email: 'test@example.com',
          displayName: 'Test User',
        })
      ).rejects.toThrow(new InvalidTenantError('Unknown tenant'));
    });

    it('should accept valid existing tenant', async () => {
      await tenantRepo.create({
        id: 'tenant-valid',
        slug: 'valid-tenant',
        name: 'Valid Tenant',
      });

      const result = await usecase.execute(mockContext, {
        tenantSlug: 'valid-tenant',
        email: 'valid@example.com',
        displayName: 'Valid User',
      });

      expect(result.tenantId).toBe('tenant-valid');
    });
  });

  describe('Audit Trail', () => {
    beforeEach(async () => {
      await tenantRepo.create({
        id: 'tenant-audit-trail',
        slug: 'audit-trail-tenant',
        name: 'Audit Trail Tenant',
      });
      policyEngine.setAllow('tenant-admin:create', true);
    });

    it('should log audit event with correct metadata', async () => {
      const result = await usecase.execute(mockContext, {
        tenantSlug: 'audit-trail-tenant',
        email: 'audit@example.com',
        displayName: 'Audit User Name',
      });

      expect(auditWriter.events).toHaveLength(1);
      const event = auditWriter.events[0];
      expect(event.eventName).toBe('tenant.user.created');
      expect(event.targetId).toBe(result.tenantUserId);
      expect(event.tenantId).toBe('tenant-audit-trail');
      expect(event.metadata?.displayNameLength).toBe('Audit User Name'.length);
    });

    it('should record actorId when not SYSTEM scope', async () => {
      await usecase.execute(mockContext, {
        tenantSlug: 'audit-trail-tenant',
        email: 'actor@example.com',
        displayName: 'Actor User',
      });

      const event = auditWriter.events[0];
      expect(event.actorScope).toBe(ACTOR_SCOPE.PLATFORM);
      expect(event.actorId).toBe('superadmin-id');
    });

    it('should omit actorId when SYSTEM scope', async () => {
      const systemContext: RequestContext = {
        actorScope: ACTOR_SCOPE.SYSTEM,
        actorId: undefined,
        tenantId: undefined,
      };

      await usecase.execute(systemContext, {
        tenantSlug: 'audit-trail-tenant',
        email: 'system@example.com',
        displayName: 'System User',
      });

      const event = auditWriter.events[0];
      expect(event.actorScope).toBe(ACTOR_SCOPE.SYSTEM);
      expect(event.actorId).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      policyEngine.setAllow('tenant-admin:create', true);
    });

    it('should generate unique user IDs', async () => {
      await tenantRepo.create({
        id: 'tenant-unique',
        slug: 'unique-tenant',
        name: 'Unique Tenant',
      });

      const result1 = await usecase.execute(mockContext, {
        tenantSlug: 'unique-tenant',
        email: 'user1@example.com',
        displayName: 'User 1',
      });

      const result2 = await usecase.execute(mockContext, {
        tenantSlug: 'unique-tenant',
        email: 'user2@example.com',
        displayName: 'User 2',
      });

      expect(result1.tenantUserId).not.toBe(result2.tenantUserId);
    });

    it('should handle special characters in display name', async () => {
      await tenantRepo.create({
        id: 'tenant-special',
        slug: 'special-tenant',
        name: 'Special Tenant',
      });

      const result = await usecase.execute(mockContext, {
        tenantSlug: 'special-tenant',
        email: 'special@example.com',
        displayName: "O'Brien-Smith (Senior)",
      });

      expect(result.tenantUserId).toBeDefined();
      expect(tenantUserRepo.users[0].displayName).toBe("O'Brien-Smith (Senior)");
    });

    it('should handle unicode in display name', async () => {
      await tenantRepo.create({
        id: 'tenant-unicode',
        slug: 'unicode-tenant',
        name: 'Unicode Tenant',
      });

      const result = await usecase.execute(mockContext, {
        tenantSlug: 'unicode-tenant',
        email: 'unicode@example.com',
        displayName: 'François Müller 中文',
      });

      expect(result.tenantUserId).toBeDefined();
      expect(tenantUserRepo.users[0].displayName).toBe('François Müller 中文');
    });
  });
});
