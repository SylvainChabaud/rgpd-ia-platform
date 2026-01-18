/**
 * Create User Use Case
 * LOT 5.3 - API Layer (Enhanced LOT 1.6)
 *
 * RGPD compliance:
 * - Email hashed (SHA-256) for authentication lookup
 * - Email encrypted (AES-256) for notifications (Art. 15, 34)
 * - Password hashed (Sha256PasswordHasher)
 * - Tenant isolation enforced
 * - Audit event emitted
 */

import { newId } from '@/shared/ids';
import type { UserRepo } from '@/app/ports/UserRepo';
import type { PasswordHasher } from '@/app/ports/PasswordHasher';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import { createHash } from 'crypto';
import { ACTOR_SCOPE } from '@/shared/actorScope';

export interface CreateUserInput {
  tenantId: string;
  email: string;
  displayName: string;
  password: string;
  role: string;
  actorId: string; // For audit trail
}

export interface CreateUserOutput {
  userId: string;
}

/**
 * Create a new user in the tenant
 *
 * SECURITY:
 * - Email is hashed (SHA-256) for P2 protection
 * - Password is hashed using PasswordHasher
 * - Tenant-scoped (cannot create cross-tenant users)
 *
 * AUDIT:
 * - Event 'user.created' emitted (P1 only: userId, tenantId, actorId)
 */
export async function createUser(
  input: CreateUserInput,
  deps: {
    userRepo: UserRepo;
    passwordHasher: PasswordHasher;
    auditEventWriter: AuditEventWriter;
  }
): Promise<CreateUserOutput> {
  const { tenantId, email, displayName, password, role, actorId } = input;
  const { userRepo, passwordHasher, auditEventWriter } = deps;

  // Validate tenant ID is provided (RGPD isolation)
  if (!tenantId) {
    throw new Error('RGPD VIOLATION: tenantId required for user creation');
  }

  // Hash email (SHA-256 for deterministic lookup)
  const emailHash = createHash('sha256').update(email.toLowerCase()).digest('hex');

  // Check if user already exists
  const existingUser = await userRepo.findByEmailHash(emailHash);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await passwordHasher.hash(password);

  // Create user with encrypted email (LOT 1.6)
  const userId = newId();

  await userRepo.createUserWithEmail(
    {
      id: userId,
      tenantId,
      emailHash,
      displayName,
      passwordHash,
      scope: ACTOR_SCOPE.TENANT, // Users created via API are always TENANT-scoped
      role,
    },
    email // Pass plain email for AES encryption
  );

  // Emit audit event (RGPD-safe: no email/password in event)
  await auditEventWriter.write({
    id: newId(),
    eventName: 'user.created',
    actorScope: ACTOR_SCOPE.TENANT,
    actorId,
    tenantId,
    targetId: userId,
  });

  return { userId };
}
