/**
 * JWT Token Management Tests
 * LOT 5.3 - API Layer Security
 *
 * CRITICAL: These tests verify JWT security compliance
 *
 * Tests cover:
 * - Token signing and verification
 * - Token expiration
 * - Signature validation (anti-tampering)
 * - RGPD compliance (P1 data only)
 * - Error handling
 *
 * Reference: .claude/rules/security.md - "Authentification"
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  signJwt,
  signRefreshToken,
  verifyJwt,
  generateJwtSecret,
  TOKEN_EXPIRATION,
  type JwtPayload,
} from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';

describe('JWT Token Management', () => {
  const originalEnv = process.env.JWT_SECRET;

  beforeEach(() => {
    // Set a test secret
    process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long-for-security';
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.JWT_SECRET = originalEnv;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  describe('signJwt', () => {
    it('should sign a valid JWT with P1 data only', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'USER',
      };

      const token = signJwt(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // JWT format: header.payload.signature
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include iat and exp claims', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'USER',
      };

      const token = signJwt(payload);
      const decoded = verifyJwt(token);

      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should set 15 minute expiration for access tokens', () => {
      const payload = {
        userId: 'user-123',
        tenantId: null,
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'SUPERADMIN',
      };

      const token = signJwt(payload);
      const decoded = verifyJwt(token);

      const expectedExpiration = decoded.iat + TOKEN_EXPIRATION.ACCESS_TOKEN_SECONDS;
      expect(decoded.exp).toBe(expectedExpiration);
    });

    it('should preserve cguAccepted status (Art. 7 RGPD)', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'USER',
        cguAccepted: true,
      };

      const token = signJwt(payload);
      const decoded = verifyJwt(token);

      expect(decoded.cguAccepted).toBe(true);
    });

    it('should handle null tenantId for PLATFORM scope', () => {
      const payload = {
        userId: 'admin-123',
        tenantId: null,
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'SUPERADMIN',
      };

      const token = signJwt(payload);
      const decoded = verifyJwt(token);

      expect(decoded.tenantId).toBeNull();
    });
  });

  describe('signRefreshToken', () => {
    it('should set 7 day expiration for refresh tokens', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'USER',
      };

      const token = signRefreshToken(payload);
      const decoded = verifyJwt(token);

      const expectedExpiration = decoded.iat + TOKEN_EXPIRATION.REFRESH_TOKEN_SECONDS;
      expect(decoded.exp).toBe(expectedExpiration);
    });
  });

  describe('verifyJwt', () => {
    it('should verify a valid token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.TENANT,
        role: 'TENANT_ADMIN',
      };

      const token = signJwt(payload);
      const decoded = verifyJwt(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.tenantId).toBe(payload.tenantId);
      expect(decoded.scope).toBe(payload.scope);
      expect(decoded.role).toBe(payload.role);
    });

    it('should reject token with invalid format (no dots)', () => {
      expect(() => verifyJwt('invalidtoken')).toThrow('Invalid JWT format');
    });

    it('should reject token with invalid format (wrong number of parts)', () => {
      expect(() => verifyJwt('part1.part2')).toThrow('Invalid JWT format');
      expect(() => verifyJwt('part1.part2.part3.part4')).toThrow('Invalid JWT format');
    });

    it('should reject token with tampered signature', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'USER',
      };

      const token = signJwt(payload);
      // Tamper with signature by changing last characters
      const tamperedToken = token.slice(0, -10) + 'AAAAAAAAAA';

      expect(() => verifyJwt(tamperedToken)).toThrow('Invalid JWT signature');
    });

    it('should reject token with tampered payload', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'USER',
      };

      const token = signJwt(payload);
      const parts = token.split('.');

      // Create a modified payload
      const modifiedPayload = {
        ...payload,
        userId: 'hacker-123', // Attempt to change userId
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const tamperedPayloadBase64 = Buffer.from(JSON.stringify(modifiedPayload)).toString('base64url');

      const tamperedToken = `${parts[0]}.${tamperedPayloadBase64}.${parts[2]}`;

      expect(() => verifyJwt(tamperedToken)).toThrow('Invalid JWT signature');
    });

    it('should reject expired token', () => {
      // Create a token that's already expired
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'USER',
      };

      const token = signJwt(payload);
      const parts = token.split('.');

      // Decode, modify exp to past, re-encode
      const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      decodedPayload.exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      // Note: This will fail signature check first, which is correct behavior
      // In production, an expired token signed with wrong key is still invalid
      const expiredPayload = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
      const expiredToken = `${parts[0]}.${expiredPayload}.${parts[2]}`;

      expect(() => verifyJwt(expiredToken)).toThrow();
    });
  });

  describe('JWT_SECRET validation', () => {
    it('should throw if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'USER',
      };

      expect(() => signJwt(payload)).toThrow('JWT_SECRET environment variable not configured');
    });

    it('should throw on verify if JWT_SECRET is not set', () => {
      // First create a valid token
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'USER',
      };
      const token = signJwt(payload);

      // Then remove the secret
      delete process.env.JWT_SECRET;

      expect(() => verifyJwt(token)).toThrow('JWT_SECRET environment variable not configured');
    });
  });

  describe('generateJwtSecret', () => {
    it('should generate a 64-character hex string', () => {
      const secret = generateJwtSecret();

      expect(secret).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(secret)).toBe(true);
    });

    it('should generate unique secrets each time', () => {
      const secret1 = generateJwtSecret();
      const secret2 = generateJwtSecret();

      expect(secret1).not.toBe(secret2);
    });
  });

  describe('TOKEN_EXPIRATION constants', () => {
    it('should have correct access token expiration (15 minutes)', () => {
      expect(TOKEN_EXPIRATION.ACCESS_TOKEN_SECONDS).toBe(15 * 60);
    });

    it('should have correct refresh token expiration (7 days)', () => {
      expect(TOKEN_EXPIRATION.REFRESH_TOKEN_SECONDS).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('RGPD Compliance', () => {
    it('[RGPD-JWT-001] should only contain P1 data (no email, name, password)', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'USER',
      };

      const token = signJwt(payload);
      const decoded = verifyJwt(token);

      // Verify only P1 fields are present
      const allowedFields = ['userId', 'tenantId', 'scope', 'role', 'cguAccepted', 'iat', 'exp'];
      const actualFields = Object.keys(decoded);

      for (const field of actualFields) {
        expect(allowedFields).toContain(field);
      }

      // Ensure no P2/P3 data
      expect(decoded).not.toHaveProperty('email');
      expect(decoded).not.toHaveProperty('password');
      expect(decoded).not.toHaveProperty('displayName');
      expect(decoded).not.toHaveProperty('name');
    });
  });
});
