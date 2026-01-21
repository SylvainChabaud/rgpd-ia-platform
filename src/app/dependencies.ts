/**
 * Dependency Injection Factory
 * LOT 5.3+ - Clean Architecture Compliance
 *
 * Central factory for dependency injection in API routes.
 * Ensures API routes don't import directly from infrastructure.
 *
 * ARCHITECTURE: BOUNDARIES.md section 11
 * - API routes import this factory
 * - Factory imports infrastructure implementations
 * - Usecases receive ports (interfaces) only
 *
 * Usage:
 * ```typescript
 * import { createDependencies } from '@/app/dependencies';
 * const deps = createDependencies();
 * await useCase(input, deps);
 * ```
 */

import type { UserRepo } from '@/app/ports/UserRepo';
import type { TenantRepo } from '@/app/ports/TenantRepo';
import type { PasswordHasher } from '@/app/ports/PasswordHasher';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { CookieConsentRepo } from '@/app/ports/CookieConsentRepo';
import type { DisputeRepo } from '@/app/ports/DisputeRepo';
import type { Logger } from '@/app/ports/Logger';

// Infrastructure implementations
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgTenantRepo } from '@/infrastructure/repositories/PgTenantRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { BcryptPasswordHasher } from '@/infrastructure/security/BcryptPasswordHasher';
import { PgCookieConsentRepo } from '@/infrastructure/repositories/PgCookieConsentRepo';
import { PgDisputeRepo } from '@/infrastructure/repositories/PgDisputeRepo';
import { logger as pinoLogger } from '@/infrastructure/logging/logger';

/**
 * Application dependencies interface
 * All ports needed by API routes and usecases
 */
export interface AppDependencies {
  // Repositories
  userRepo: UserRepo;
  tenantRepo: TenantRepo;
  cookieConsentRepo: CookieConsentRepo;
  disputeRepo: DisputeRepo;

  // Services
  passwordHasher: PasswordHasher;
  auditEventWriter: AuditEventWriter;
  logger: Logger;
}

/**
 * Auth-specific dependencies (subset for auth routes)
 */
export interface AuthDependencies {
  userRepo: UserRepo;
  tenantRepo: TenantRepo;
  passwordHasher: PasswordHasher;
  auditEventWriter: AuditEventWriter;
  logger: Logger;
}

/**
 * User management dependencies
 */
export interface UserDependencies {
  userRepo: UserRepo;
  passwordHasher: PasswordHasher;
  auditEventWriter: AuditEventWriter;
  logger: Logger;
}

/**
 * Consent management dependencies
 */
export interface ConsentDependencies {
  cookieConsentRepo: CookieConsentRepo;
  auditEventWriter: AuditEventWriter;
  logger: Logger;
}

/**
 * Dispute management dependencies
 */
export interface DisputeDependencies {
  disputeRepo: DisputeRepo;
  auditEventWriter: AuditEventWriter;
  logger: Logger;
}

/**
 * Audit dependencies (for doc routes)
 */
export interface AuditDependencies {
  auditEventWriter: AuditEventWriter;
  logger: Logger;
}

// Singleton instances (thread-safe in Node.js single-threaded model)
let _userRepo: UserRepo | null = null;
let _tenantRepo: TenantRepo | null = null;
let _passwordHasher: PasswordHasher | null = null;
let _auditEventWriter: AuditEventWriter | null = null;
let _cookieConsentRepo: CookieConsentRepo | null = null;
let _disputeRepo: DisputeRepo | null = null;

/**
 * Create all application dependencies (lazy singleton pattern)
 * Uses lazy initialization to avoid connection overhead when not needed
 */
export function createDependencies(): AppDependencies {
  return {
    userRepo: getUserRepo(),
    tenantRepo: getTenantRepo(),
    cookieConsentRepo: getCookieConsentRepo(),
    disputeRepo: getDisputeRepo(),
    passwordHasher: getPasswordHasher(),
    auditEventWriter: getAuditEventWriter(),
    logger: pinoLogger,
  };
}

/**
 * Create auth-specific dependencies
 */
export function createAuthDependencies(): AuthDependencies {
  return {
    userRepo: getUserRepo(),
    tenantRepo: getTenantRepo(),
    passwordHasher: getPasswordHasher(),
    auditEventWriter: getAuditEventWriter(),
    logger: pinoLogger,
  };
}

/**
 * Create user management dependencies
 */
export function createUserDependencies(): UserDependencies {
  return {
    userRepo: getUserRepo(),
    passwordHasher: getPasswordHasher(),
    auditEventWriter: getAuditEventWriter(),
    logger: pinoLogger,
  };
}

/**
 * Create consent management dependencies
 */
export function createConsentDependencies(): ConsentDependencies {
  return {
    cookieConsentRepo: getCookieConsentRepo(),
    auditEventWriter: getAuditEventWriter(),
    logger: pinoLogger,
  };
}

/**
 * Create dispute management dependencies
 */
export function createDisputeDependencies(): DisputeDependencies {
  return {
    disputeRepo: getDisputeRepo(),
    auditEventWriter: getAuditEventWriter(),
    logger: pinoLogger,
  };
}

/**
 * Create audit dependencies (for doc routes)
 */
export function createAuditDependencies(): AuditDependencies {
  return {
    auditEventWriter: getAuditEventWriter(),
    logger: pinoLogger,
  };
}

// Lazy singleton getters
function getUserRepo(): UserRepo {
  if (!_userRepo) {
    _userRepo = new PgUserRepo();
  }
  return _userRepo;
}

function getTenantRepo(): TenantRepo {
  if (!_tenantRepo) {
    _tenantRepo = new PgTenantRepo();
  }
  return _tenantRepo;
}

function getPasswordHasher(): PasswordHasher {
  if (!_passwordHasher) {
    _passwordHasher = new BcryptPasswordHasher();
  }
  return _passwordHasher;
}

function getAuditEventWriter(): AuditEventWriter {
  if (!_auditEventWriter) {
    _auditEventWriter = new PgAuditEventWriter();
  }
  return _auditEventWriter;
}

function getCookieConsentRepo(): CookieConsentRepo {
  if (!_cookieConsentRepo) {
    _cookieConsentRepo = new PgCookieConsentRepo();
  }
  return _cookieConsentRepo;
}

function getDisputeRepo(): DisputeRepo {
  if (!_disputeRepo) {
    _disputeRepo = new PgDisputeRepo();
  }
  return _disputeRepo;
}

/**
 * Reset all singletons (for testing only)
 * @internal
 */
export function resetDependencies(): void {
  _userRepo = null;
  _tenantRepo = null;
  _passwordHasher = null;
  _auditEventWriter = null;
  _cookieConsentRepo = null;
  _disputeRepo = null;
}
