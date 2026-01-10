/**
 * Unit Tests: Create User Use Case
 * Coverage: src/app/usecases/users/createUser.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createUser, CreateUserInput } from '@/app/usecases/users/createUser';
import type { UserRepo } from '@/app/ports/UserRepo';
import type { PasswordHasher } from '@/app/ports/PasswordHasher';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import { ACTOR_SCOPE } from '@/shared/actorScope';

describe('createUser', () => {
  let mockUserRepo: jest.Mocked<UserRepo>;
  let mockPasswordHasher: jest.Mocked<PasswordHasher>;
  let mockAuditWriter: jest.Mocked<AuditEventWriter>;

  beforeEach(() => {
    mockUserRepo = {
      findByEmailHash: jest.fn(),
      createUser: jest.fn(),
    } as unknown as jest.Mocked<UserRepo>;

    mockPasswordHasher = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as jest.Mocked<PasswordHasher>;

    mockAuditWriter = {
      write: jest.fn(),
    } as jest.Mocked<AuditEventWriter>;

    jest.clearAllMocks();
  });

  it('should create user successfully', async () => {
    const input: CreateUserInput = {
      tenantId: 'tenant-1',
      email: 'user@example.com',
      displayName: 'John Doe',
      password: 'password123',
      role: 'MEMBER',
      actorId: 'admin-1',
    };

    mockUserRepo.findByEmailHash.mockResolvedValue(null);
    mockPasswordHasher.hash.mockResolvedValue('hashed-password');

    const result = await createUser(input, {
      userRepo: mockUserRepo,
      passwordHasher: mockPasswordHasher,
      auditEventWriter: mockAuditWriter,
    });

    expect(result.userId).toBeDefined();
    expect(mockUserRepo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.TENANT,
        role: 'MEMBER',
      })
    );
    expect(mockAuditWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'user.created',
        tenantId: 'tenant-1',
      })
    );
  });

  it('should throw if tenantId is missing', async () => {
    const input: CreateUserInput = {
      tenantId: '',
      email: 'user@example.com',
      displayName: 'John Doe',
      password: 'password123',
      role: 'MEMBER',
      actorId: 'admin-1',
    };

    await expect(
      createUser(input, {
        userRepo: mockUserRepo,
        passwordHasher: mockPasswordHasher,
        auditEventWriter: mockAuditWriter,
      })
    ).rejects.toThrow('RGPD VIOLATION');
  });

  it('should throw if user already exists', async () => {
    const input: CreateUserInput = {
      tenantId: 'tenant-1',
      email: 'existing@example.com',
      displayName: 'Jane Doe',
      password: 'password123',
      role: 'MEMBER',
      actorId: 'admin-1',
    };

    mockUserRepo.findByEmailHash.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      emailHash: 'hash',
      displayName: 'Existing User',
      passwordHash: 'hash',
      scope: ACTOR_SCOPE.TENANT,
      role: 'MEMBER',
      createdAt: new Date(),
      deletedAt: null,
    });

    await expect(
      createUser(input, {
        userRepo: mockUserRepo,
        passwordHasher: mockPasswordHasher,
        auditEventWriter: mockAuditWriter,
      })
    ).rejects.toThrow('already exists');
  });

  it('should hash email (lowercase) before lookup', async () => {
    const input: CreateUserInput = {
      tenantId: 'tenant-1',
      email: 'User@Example.COM',
      displayName: 'John Doe',
      password: 'password123',
      role: 'MEMBER',
      actorId: 'admin-1',
    };

    mockUserRepo.findByEmailHash.mockResolvedValue(null);
    mockPasswordHasher.hash.mockResolvedValue('hashed-password');

    await createUser(input, {
      userRepo: mockUserRepo,
      passwordHasher: mockPasswordHasher,
      auditEventWriter: mockAuditWriter,
    });

    expect(mockUserRepo.findByEmailHash).toHaveBeenCalledWith(
      expect.any(String)
    );
  });

  it('should hash password before storage', async () => {
    const input: CreateUserInput = {
      tenantId: 'tenant-1',
      email: 'user@example.com',
      displayName: 'John Doe',
      password: 'plaintextpassword',
      role: 'MEMBER',
      actorId: 'admin-1',
    };

    mockUserRepo.findByEmailHash.mockResolvedValue(null);
    mockPasswordHasher.hash.mockResolvedValue('secure-hash-xyz');

    await createUser(input, {
      userRepo: mockUserRepo,
      passwordHasher: mockPasswordHasher,
      auditEventWriter: mockAuditWriter,
    });

    expect(mockPasswordHasher.hash).toHaveBeenCalledWith('plaintextpassword');
    expect(mockUserRepo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: 'secure-hash-xyz',
      })
    );
  });
});
