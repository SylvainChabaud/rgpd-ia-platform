/**
 * JWT Token Management
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - JWT contains only P1 data (userId, tenantId, scope, role)
 * - NO P2/P3 data in JWT (no email, name, or sensitive data)
 * - JWT secret never logged or exposed
 *
 * SECURITY:
 * - HS256 algorithm (HMAC with SHA-256)
 * - 24h expiration by default
 * - Secret from environment variable
 */

import { createHmac, randomBytes } from 'crypto';
import type { UserScope } from '@/shared/actorScope';

export interface JwtPayload {
  userId: string;
  tenantId: string | null;
  scope: UserScope;
  role: string;
  iat: number; // Issued at (seconds since epoch)
  exp: number; // Expiration (seconds since epoch)
}

const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRATION_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Get JWT secret from environment
 * Throws error if JWT_SECRET not configured
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable not configured');
  }
  return secret;
}

/**
 * Sign JWT token
 * Returns base64url-encoded JWT
 */
export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRATION_SECONDS,
  };

  const header = {
    alg: JWT_ALGORITHM,
    typ: 'JWT',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = createHmac('sha256', getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode JWT token
 * Throws error if token is invalid or expired
 */
export function verifyJwt(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify signature
  const expectedSignature = createHmac('sha256', getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw new Error('Invalid JWT signature');
  }

  // Decode payload
  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;

  // Verify expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('JWT expired');
  }

  return payload;
}

/**
 * Generate random JWT secret (for setup scripts)
 * Returns 64-character hex string (256 bits)
 */
export function generateJwtSecret(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Base64url encode
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64url');
}

/**
 * Base64url decode
 */
function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}
