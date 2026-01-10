/**
 * Use Case Tests: createUser
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Email hashed (SHA-256) before storage
 * - Password hashed (PasswordHasher)
 * - Tenant isolation enforced
 * - Audit event emitted
 */

import { describe, it, expect } from '@jest/globals';
import type { User, UserRepo } from '@/app/ports/UserRepo';
import type { PasswordHasher } from '@/app/ports/PasswordHasher';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { createUser } from '@/app/usecases/users/createUser';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { createHash } from 'crypto';

class MemUserRepo implements UserRepo {
  private users: User[] = [];

  async findByEmailHash(emailHash: string): Promise<User | null> {
    return this.users.find(u => u.emailHash === emailHash && !u.deletedAt) ?? null;
  }

  async findById(userId: string): Promise<User | null> {
    return this.users.find(u => u.id === userId && !u.deletedAt) ?? null;
  }

  async listByTenant(tenantId: string): Promise<User[]> {
    return this.users.filter(u => u.tenantId === tenantId && !u.deletedAt);
  }

  async listSuspendedByTenant(tenantId: string): Promise<User[]> {
    return this.users.filter(u => u.tenantId === tenantId && u.dataSuspended);
  }

  async createUser(user: Omit<User, 'createdAt' | 'deletedAt'>): Promise<void> {
    this.users.push({
      ...user,
      createdAt: new Date(),
      deletedAt: null,
    });
  }

  async updateUser(userId: string, updates: { displayName?: string; role?: string }): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      if (updates.displayName) user.displayName = updates.displayName;
      if (updates.role) user.role = updates.role;
    }
  }

  async softDeleteUser(userId: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.deletedAt = new Date();
    }
  }

  async softDeleteUserByTenant(tenantId: string, userId: string): Promise<number> {
    const user = this.users.find(u => u.id === userId && u.tenantId === tenantId);
    if (user) {
      user.deletedAt = new Date();
      return 1;
    }
    return 0;
  }

  async hardDeleteUserByTenant(tenantId: string, userId: string): Promise<number> {
    const index = this.users.findIndex(u => u.id === userId && u.tenantId === tenantId);
    if (index !== -1) {
      this.users.splice(index, 1);
      return 1;
    }
    return 0;
  }

  async updateDataSuspension(userId: string, suspended: boolean, reason?: string): Promise<User> {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.dataSuspended = suspended;
    user.dataSuspendedAt = suspended ? new Date() : null;
    user.dataSuspendedReason = suspended ? (reason ?? null) : null;
    return user;
  }
}

class MemPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed_${password}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return hash === `hashed_${password}`;
  }
}

describe('UseCase: createUser', () => {
  it('creates user successfully', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    const result = await createUser(
      {
        tenantId: 'tenant-1',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: 'MEMBER',
        actorId: 'admin-1',
      },
      { userRepo, passwordHasher, auditEventWriter }
    );

    expect(result.userId).toBeDefined();
    expect(typeof result.userId).toBe('string');
  });

  it('hashes email with SHA-256', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    const email = 'test@example.com';
    const expectedHash = createHash('sha256').update(email.toLowerCase()).digest('hex');

    await createUser(
      {
        tenantId: 'tenant-1',
        email,
        displayName: 'Test User',
        password: 'password123',
        role: 'MEMBER',
        actorId: 'admin-1',
      },
      { userRepo, passwordHasher, auditEventWriter }
    );

    const user = await userRepo.findByEmailHash(expectedHash);
    expect(user).toBeDefined();
    expect(user?.emailHash).toBe(expectedHash);
  });

  it('hashes password using PasswordHasher', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    const result = await createUser(
      {
        tenantId: 'tenant-1',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: 'MEMBER',
        actorId: 'admin-1',
      },
      { userRepo, passwordHasher, auditEventWriter }
    );

    const user = await userRepo.findById(result.userId);
    expect(user?.passwordHash).toBe('hashed_password123');
  });

  it('throws error when tenantId is missing', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    await expect(
      createUser(
        {
          tenantId: '',
          email: 'test@example.com',
          displayName: 'Test User',
          password: 'password123',
          role: 'MEMBER',
          actorId: 'admin-1',
        },
        { userRepo, passwordHasher, auditEventWriter }
      )
    ).rejects.toThrow('RGPD VIOLATION: tenantId required for user creation');
  });

  it('throws error when user with email already exists', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    const email = 'test@example.com';

    // Create first user
    await createUser(
      {
        tenantId: 'tenant-1',
        email,
        displayName: 'Test User',
        password: 'password123',
        role: 'MEMBER',
        actorId: 'admin-1',
      },
      { userRepo, passwordHasher, auditEventWriter }
    );

    // Try to create second user with same email
    await expect(
      createUser(
        {
          tenantId: 'tenant-1',
          email,
          displayName: 'Another User',
          password: 'password456',
          role: 'MEMBER',
          actorId: 'admin-1',
        },
        { userRepo, passwordHasher, auditEventWriter }
      )
    ).rejects.toThrow('User with this email already exists');
  });

  it('emits audit event on user creation', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    const result = await createUser(
      {
        tenantId: 'tenant-1',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: 'MEMBER',
        actorId: 'admin-1',
      },
      { userRepo, passwordHasher, auditEventWriter }
    );

    expect(auditEventWriter.events).toHaveLength(1);
    expect(auditEventWriter.events[0].eventName).toBe('user.created');
    expect(auditEventWriter.events[0].actorId).toBe('admin-1');
    expect(auditEventWriter.events[0].tenantId).toBe('tenant-1');
    expect(auditEventWriter.events[0].targetId).toBe(result.userId);
  });

  it('audit event is TENANT-scoped', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    await createUser(
      {
        tenantId: 'tenant-1',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: 'MEMBER',
        actorId: 'admin-1',
      },
      { userRepo, passwordHasher, auditEventWriter }
    );

    expect(auditEventWriter.events[0].actorScope).toBe('TENANT');
  });

  it('sets user scope to TENANT', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    const result = await createUser(
      {
        tenantId: 'tenant-1',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: 'MEMBER',
        actorId: 'admin-1',
      },
      { userRepo, passwordHasher, auditEventWriter }
    );

    const user = await userRepo.findById(result.userId);
    expect(user?.scope).toBe(ACTOR_SCOPE.TENANT);
  });

  it('stores correct role', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    const result = await createUser(
      {
        tenantId: 'tenant-1',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: 'ADMIN',
        actorId: 'admin-1',
      },
      { userRepo, passwordHasher, auditEventWriter }
    );

    const user = await userRepo.findById(result.userId);
    expect(user?.role).toBe('ADMIN');
  });

  it('handles email case-insensitively', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    const emailLower = createHash('sha256').update('test@example.com').digest('hex');
    const emailUpper = createHash('sha256').update('TEST@EXAMPLE.COM'.toLowerCase()).digest('hex');

    expect(emailLower).toBe(emailUpper);

    await createUser(
      {
        tenantId: 'tenant-1',
        email: 'TEST@EXAMPLE.COM',
        displayName: 'Test User',
        password: 'password123',
        role: 'MEMBER',
        actorId: 'admin-1',
      },
      { userRepo, passwordHasher, auditEventWriter }
    );

    const user = await userRepo.findByEmailHash(emailLower);
    expect(user).toBeDefined();
  });

  it('does not expose email or password in audit event', async () => {
    const userRepo = new MemUserRepo();
    const passwordHasher = new MemPasswordHasher();
    const auditEventWriter = new InMemoryAuditEventWriter();

    await createUser(
      {
        tenantId: 'tenant-1',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: 'MEMBER',
        actorId: 'admin-1',
      },
      { userRepo, passwordHasher, auditEventWriter }
    );

    const event = auditEventWriter.events[0];
    const eventStr = JSON.stringify(event);
    expect(eventStr).not.toContain('test@example.com');
    expect(eventStr).not.toContain('password123');
  });
});
