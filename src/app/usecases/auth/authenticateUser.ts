/**
 * Authenticate User use-case
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Email stored as hash (P2 protection)
 * - Password never logged or exposed
 * - Audit event emitted on success/failure
 * - JWT contains only P1 data (userId, tenantId, scope, role)
 *
 * SECURITY:
 * - Constant-time comparison (via password hasher)
 * - Rate limiting enforced at API layer
 * - Failed attempts logged (audit trail)
 */

import { createHash } from 'crypto';
import type { UserRepo } from '@/app/ports/UserRepo';
import type { PasswordHasher } from '@/app/ports/PasswordHasher';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { ACTOR_SCOPE, type UserScope } from '@/shared/actorScope';

export type AuthenticateUserInput = {
  email: string;
  password: string;
};

export type AuthenticateUserOutput = {
  userId: string;
  tenantId: string | null;
  scope: UserScope;
  role: string;
  displayName: string;
};

/**
 * Authenticate user by email and password
 * Returns user context for JWT generation
 * Throws error if authentication fails
 */
export async function authenticateUser(
  userRepo: UserRepo,
  passwordHasher: PasswordHasher,
  auditWriter: AuditEventWriter,
  input: AuthenticateUserInput
): Promise<AuthenticateUserOutput> {
  const { email, password } = input;

  // Step 1: Hash email to lookup user
  const emailHash = hashEmail(email);

  // Step 2: Find user by email hash
  const user = await userRepo.findByEmailHash(emailHash);

  if (!user) {
    // Emit audit event (failed login attempt)
    await emitAuditEvent(auditWriter, {
      id: randomUUID(),
      eventName: 'auth.login.failed',
      actorScope: ACTOR_SCOPE.PLATFORM,
      actorId: undefined,
      tenantId: undefined,
      metadata: {
        reason: 'user_not_found',
        // CRITICAL: DO NOT log email or email_hash (P2 data)
      },
    });

    throw new Error('Invalid credentials');
  }

  // Step 3: Verify password
  const isValidPassword = await passwordHasher.verify(password, user.passwordHash);

  if (!isValidPassword) {
    // Emit audit event (failed login attempt)
    await emitAuditEvent(auditWriter, {
      id: randomUUID(),
      eventName: 'auth.login.failed',
      actorScope: user.scope,
      actorId: user.id,
      tenantId: user.tenantId || undefined,
      metadata: {
        reason: 'invalid_password',
      },
    });

    throw new Error('Invalid credentials');
  }

  // Step 4: Emit audit event (successful login)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: 'auth.login.success',
    actorScope: user.scope,
    actorId: user.id,
    tenantId: user.tenantId || undefined,
    metadata: {},
  });

  // Step 5: Return user context for JWT
  return {
    userId: user.id,
    tenantId: user.tenantId,
    scope: user.scope,
    role: user.role,
    displayName: user.displayName,
  };
}

/**
 * Hash email for storage and lookup
 * IMPORTANT: Must match hashing used during user creation
 */
function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}
