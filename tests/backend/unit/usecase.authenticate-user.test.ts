/**
 * Use Case Tests: authenticateUser
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Email stored as hash (P2 protection)
 * - Password never logged or exposed
 * - Audit event emitted on success/failure
 * - JWT contains only P1 data
 */

import { describe, it, expect } from '@jest/globals';
import type { User, UserRepo } from '@/app/ports/UserRepo';
import type { TenantRepo, Tenant } from '@/app/ports/TenantRepo';
import type { PasswordHasher } from '@/app/ports/PasswordHasher';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { authenticateUser } from '@/app/usecases/auth/authenticateUser';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { hashEmail } from '@/shared/ids';

class MemPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed_${password}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return hash === `hashed_${password}`;
  }
}

class MemUserRepo implements UserRepo {
  private users: User[] = [];

  constructor(initialUsers: User[] = []) {
    this.users = initialUsers;
  }

  async findByEmailHash(emailHash: string): Promise<User | null> {
    return this.users.find(u => u.emailHash === emailHash && !u.deletedAt) ?? null;
  }

  async findById() {
    return null;
  }
  async listByTenant() {
    return [];
  }
  async listSuspendedByTenant() {
    return [];
  }
  async createUser() {}
  async updateUser() {}
  async softDeleteUser() {}
  async softDeleteUserByTenant() {
    return 0;
  }
  async hardDeleteUserByTenant() {
    return 0;
  }
  async updateDataSuspension(): Promise<User> {
    throw new Error('Not implemented');
  }
  async createUserWithEmail() {}
  async getDecryptedEmail(): Promise<string | null> {
    return null;
  }
  async listFiltered() {
    return [];
  }
  async listFilteredByTenant() {
    return [];
  }
  async countByTenant() {
    return 0;
  }
}

class MemTenantRepo implements TenantRepo {
  private tenants: Map<string, Tenant> = new Map();

  constructor(initialTenants: Tenant[] = []) {
    initialTenants.forEach(t => this.tenants.set(t.id, t));
  }

  async getById(tenantId: string): Promise<Tenant | null> {
    return this.tenants.get(tenantId) ?? null;
  }

  async findById(tenantId: string): Promise<Tenant | null> {
    return this.getById(tenantId);
  }

  async findBySlug() {
    return null;
  }
  async create() {}
  async listAll() {
    return [];
  }
  async update() {}
  async softDelete() {}
  async suspend() {}
  async unsuspend() {}
}

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    emailHash: hashEmail('test@example.com'),
    displayName: 'Test User',
    passwordHash: 'hashed_password123',
    scope: ACTOR_SCOPE.TENANT,
    role: 'MEMBER',
    createdAt: new Date(),
    deletedAt: null,
    dataSuspended: false,
    dataSuspendedAt: null,
    dataSuspendedReason: null,
    ...overrides,
  };
}

function createTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-1',
    slug: 'tenant-1-slug',
    name: 'Tenant One',
    createdAt: new Date(),
    deletedAt: null,
    suspendedAt: null,
    suspensionReason: null,
    suspendedBy: null,
    ...overrides,
  };
}

describe('UseCase: authenticateUser', () => {
  it('authenticates user successfully with valid credentials', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([createTenant()]);

    const result = await authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.userId).toBe('user-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.scope).toBe(ACTOR_SCOPE.TENANT);
    expect(result.role).toBe('MEMBER');
    expect(result.displayName).toBe('Test User');
  });

  it('emits success audit event on successful authentication', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([createTenant()]);

    await authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
      email: 'test@example.com',
      password: 'password123',
    });

    const successEvent = auditWriter.events.find(e => e.eventName === 'auth.login.success');
    expect(successEvent).toBeDefined();
    expect(successEvent?.actorId).toBe('user-1');
    expect(successEvent?.tenantId).toBe('tenant-1');
  });

  it('throws error when user not found', async () => {
    const userRepo = new MemUserRepo([]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo();

    await expect(
      authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
        email: 'nonexistent@example.com',
        password: 'password123',
      })
    ).rejects.toThrow('Invalid credentials');
  });

  it('emits failure audit event when user not found', async () => {
    const userRepo = new MemUserRepo([]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo();

    await expect(
      authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
        email: 'nonexistent@example.com',
        password: 'password123',
      })
    ).rejects.toThrow();

    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].eventName).toBe('auth.login.failed');
    expect(auditWriter.events[0].metadata?.reason).toBe('not_found');
  });

  it('throws error when password is invalid', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([createTenant()]);

    await expect(
      authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
        email: 'test@example.com',
        password: 'wrongpassword',
      })
    ).rejects.toThrow('Invalid credentials');
  });

  it('emits failure audit event when password is invalid', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([createTenant()]);

    await expect(
      authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
        email: 'test@example.com',
        password: 'wrongpassword',
      })
    ).rejects.toThrow();

    const failureEvent = auditWriter.events.find(e => e.eventName === 'auth.login.failed');
    expect(failureEvent).toBeDefined();
    expect(failureEvent?.metadata?.reason).toBe('auth_failed');
    expect(failureEvent?.actorId).toBe('user-1');
  });

  it('throws error when user is suspended', async () => {
    const user = createUser({ dataSuspended: true });
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([createTenant()]);

    await expect(
      authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
        email: 'test@example.com',
        password: 'password123',
      })
    ).rejects.toThrow('Account suspended');
  });

  it('emits failure audit event when user is suspended', async () => {
    const user = createUser({ dataSuspended: true });
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([createTenant()]);

    await expect(
      authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
        email: 'test@example.com',
        password: 'password123',
      })
    ).rejects.toThrow();

    const failureEvent = auditWriter.events.find(e => e.eventName === 'auth.login.failed');
    expect(failureEvent).toBeDefined();
    expect(failureEvent?.metadata?.reason).toBe('user_suspended');
  });

  it('throws error when tenant is suspended', async () => {
    const user = createUser();
    const tenant = createTenant({ suspendedAt: new Date(), suspensionReason: 'compliance' });
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([tenant]);

    await expect(
      authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
        email: 'test@example.com',
        password: 'password123',
      })
    ).rejects.toThrow('Tenant suspended');
  });

  it('emits failure audit event when tenant is suspended', async () => {
    const user = createUser();
    const tenant = createTenant({ suspendedAt: new Date(), suspensionReason: 'compliance' });
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([tenant]);

    await expect(
      authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
        email: 'test@example.com',
        password: 'password123',
      })
    ).rejects.toThrow();

    const failureEvent = auditWriter.events.find(e => e.eventName === 'auth.login.failed');
    expect(failureEvent).toBeDefined();
    expect(failureEvent?.metadata?.reason).toBe('tenant_suspended');
    expect(failureEvent?.metadata?.suspensionReason).toBe('compliance');
  });

  it('handles email case-insensitively', async () => {
    const user = createUser({ emailHash: hashEmail('test@example.com') });
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([createTenant()]);

    const result = await authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
      email: 'TEST@EXAMPLE.COM',
      password: 'password123',
    });

    expect(result.userId).toBe('user-1');
  });

  it('does not expose email or password in audit events', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([createTenant()]);

    await authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
      email: 'test@example.com',
      password: 'password123',
    });

    const allEvents = JSON.stringify(auditWriter.events);
    expect(allEvents).not.toContain('test@example.com');
    expect(allEvents).not.toContain('password123');
  });

  it('returns only P1 data in output', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo([createTenant()]);

    const result = await authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
      email: 'test@example.com',
      password: 'password123',
    });

    // Should not contain email, emailHash, or passwordHash
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('emailHash');
    expect(result).not.toHaveProperty('passwordHash');

    // Should only contain P1 data
    expect(result).toHaveProperty('userId');
    expect(result).toHaveProperty('tenantId');
    expect(result).toHaveProperty('scope');
    expect(result).toHaveProperty('role');
    expect(result).toHaveProperty('displayName');
  });

  it('handles PLATFORM-scoped users', async () => {
    const user = createUser({ scope: ACTOR_SCOPE.PLATFORM, tenantId: null });
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo();

    const result = await authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.scope).toBe(ACTOR_SCOPE.PLATFORM);
    expect(result.tenantId).toBeNull();
  });

  it('skips tenant suspension check for PLATFORM users', async () => {
    const user = createUser({ scope: ACTOR_SCOPE.PLATFORM, tenantId: null });
    const userRepo = new MemUserRepo([user]);
    const passwordHasher = new MemPasswordHasher();
    const auditWriter = new InMemoryAuditEventWriter();
    const tenantRepo = new MemTenantRepo();

    const result = await authenticateUser(userRepo, passwordHasher, auditWriter, tenantRepo, {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.userId).toBe('user-1');
    // Should succeed even without checking tenant
  });
});
