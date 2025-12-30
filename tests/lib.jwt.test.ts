/**
 * lib.jwt.test.ts — JWT token management tests
 *
 * Coverage target: All branches for JWT validation
 *
 * RGPD Compliance:
 * - JWT contains only P1 data (no P2/P3)
 * - Secret management validated
 */

import { signJwt, verifyJwt, generateJwtSecret } from "@/lib/jwt";
import { ACTOR_SCOPE } from "@/shared/actorScope";

describe("JWT Token Management", () => {
  // Store original env
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    // Ensure JWT_SECRET is set for tests
    process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests-min-32-chars";
  });

  afterAll(() => {
    // Restore original env
    if (originalJwtSecret) {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  describe("signJwt", () => {
    it("creates valid JWT with required fields", () => {
      const payload = {
        userId: "user-123",
        tenantId: "tenant-456",
        scope: ACTOR_SCOPE.TENANT,
        role: "USER",
      };

      const token = signJwt(payload);

      expect(token).toBeDefined();
      expect(token.split(".")).toHaveLength(3);
    });

    it("creates JWT with null tenantId for platform scope", () => {
      const payload = {
        userId: "platform-admin-1",
        tenantId: null,
        scope: ACTOR_SCOPE.PLATFORM,
        role: "SUPER_ADMIN",
      };

      const token = signJwt(payload);
      const decoded = verifyJwt(token);

      expect(decoded.tenantId).toBeNull();
      expect(decoded.scope).toBe("PLATFORM");
    });
  });

  describe("verifyJwt", () => {
    it("verifies valid token", () => {
      const payload = {
        userId: "user-123",
        tenantId: "tenant-456",
        scope: ACTOR_SCOPE.TENANT,
        role: "USER",
      };

      const token = signJwt(payload);
      const decoded = verifyJwt(token);

      expect(decoded.userId).toBe("user-123");
      expect(decoded.tenantId).toBe("tenant-456");
      expect(decoded.scope).toBe("TENANT");
      expect(decoded.role).toBe("USER");
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it("throws on invalid JWT format (not 3 parts)", () => {
      expect(() => verifyJwt("invalid")).toThrow("Invalid JWT format");
      expect(() => verifyJwt("two.parts")).toThrow("Invalid JWT format");
      expect(() => verifyJwt("one.two.three.four")).toThrow("Invalid JWT format");
    });

    it("throws on invalid JWT signature", () => {
      const payload = {
        userId: "user-123",
        tenantId: "tenant-456",
        scope: ACTOR_SCOPE.TENANT,
        role: "USER",
      };

      const token = signJwt(payload);
      const parts = token.split(".");
      // Tamper with signature
      const tamperedToken = `${parts[0]}.${parts[1]}.invalid-signature`;

      expect(() => verifyJwt(tamperedToken)).toThrow("Invalid JWT signature");
    });

    it("throws on expired JWT", () => {
      // Create a token that's already expired
      const payload = {
        userId: "user-123",
        tenantId: "tenant-456",
        scope: ACTOR_SCOPE.TENANT,
        role: "USER",
      };

      const token = signJwt(payload);
      const parts = token.split(".");

      // Decode payload, set exp to past
      const decodedPayload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf-8")
      );
      decodedPayload.exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      // Re-encode payload (signature will be invalid, but we're testing exp check)
      const expiredPayload = Buffer.from(JSON.stringify(decodedPayload)).toString(
        "base64url"
      );

      // Create new token with expired payload but correct signature
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createHmac } = require("crypto");
      const signature = createHmac("sha256", process.env.JWT_SECRET)
        .update(`${parts[0]}.${expiredPayload}`)
        .digest("base64url");

      const expiredToken = `${parts[0]}.${expiredPayload}.${signature}`;

      expect(() => verifyJwt(expiredToken)).toThrow("JWT expired");
    });
  });

  describe("generateJwtSecret", () => {
    it("generates 64-character hex string", () => {
      const secret = generateJwtSecret();

      expect(secret).toHaveLength(64);
      expect(secret).toMatch(/^[a-f0-9]+$/);
    });

    it("generates unique secrets", () => {
      const secret1 = generateJwtSecret();
      const secret2 = generateJwtSecret();

      expect(secret1).not.toBe(secret2);
    });
  });

  describe("JWT_SECRET not configured", () => {
    it("throws when JWT_SECRET is missing", () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      try {
        expect(() =>
          signJwt({
            userId: "test",
            tenantId: "test",
            scope: ACTOR_SCOPE.TENANT,
            role: "USER",
          })
        ).toThrow("JWT_SECRET environment variable not configured");
      } finally {
        process.env.JWT_SECRET = originalSecret;
      }
    });
  });
});
