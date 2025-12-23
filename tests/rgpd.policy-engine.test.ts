import { DefaultPolicyEngine } from "@/app/auth/policyEngine";
import {
  systemContext,
  platformContext,
  tenantContext,
} from "@/app/context/RequestContext";

describe("PolicyEngine RBAC/ABAC", () => {
  const engine = new DefaultPolicyEngine();

  describe("SYSTEM scope", () => {
    test("allows tenant:create in bootstrap mode", async () => {
      const ctx = systemContext({ bootstrapMode: true });
      const decision = await engine.check(ctx, "tenant:create");
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toContain("SYSTEM bootstrap mode");
    });

    test("allows tenant-admin:create in bootstrap mode", async () => {
      const ctx = systemContext({ bootstrapMode: true });
      const decision = await engine.check(ctx, "tenant-admin:create");
      expect(decision.allowed).toBe(true);
    });

    test("denies tenant:create without bootstrap mode", async () => {
      const ctx = systemContext({ bootstrapMode: false });
      const decision = await engine.check(ctx, "tenant:create");
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("requires bootstrap mode");
    });

    test("denies platform:manage even in bootstrap mode", async () => {
      const ctx = systemContext({ bootstrapMode: true });
      const decision = await engine.check(ctx, "platform:manage");
      expect(decision.allowed).toBe(false);
    });
  });

  describe("PLATFORM scope", () => {
    test("allows platform:manage", async () => {
      const ctx = platformContext("platform-1");
      const decision = await engine.check(ctx, "platform:manage");
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toContain("PLATFORM scope");
    });

    test("allows tenant:create", async () => {
      const ctx = platformContext("platform-1");
      const decision = await engine.check(ctx, "tenant:create");
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toContain("PLATFORM can create tenants");
    });

    test("allows tenant-admin:create", async () => {
      const ctx = platformContext("platform-1");
      const decision = await engine.check(ctx, "tenant-admin:create");
      expect(decision.allowed).toBe(true);
    });

    test("denies tenant-scoped permissions", async () => {
      const ctx = platformContext("platform-1");
      const decision = await engine.check(ctx, "tenant:users:read");
      expect(decision.allowed).toBe(false);
    });
  });

  describe("TENANT scope", () => {
    const tenantId = "11111111-1111-4111-8111-111111111111";

    test("allows tenant:read for own tenant", async () => {
      const ctx = tenantContext(tenantId, "user-1");
      const decision = await engine.check(ctx, "tenant:read");
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toContain("TENANT scope owns resource");
    });

    test("allows tenant:users:read for own tenant", async () => {
      const ctx = tenantContext(tenantId, "user-1");
      const decision = await engine.check(ctx, "tenant:users:read");
      expect(decision.allowed).toBe(true);
    });

    test("allows tenant:users:write for own tenant", async () => {
      const ctx = tenantContext(tenantId, "user-1");
      const decision = await engine.check(ctx, "tenant:users:write");
      expect(decision.allowed).toBe(true);
    });

    test("denies cross-tenant access (ABAC isolation)", async () => {
      const ctx = tenantContext(tenantId, "user-1");
      const otherTenantId = "22222222-2222-4222-8222-222222222222";
      const decision = await engine.check(ctx, "tenant:users:read", {
        tenantId: otherTenantId,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("Cross-tenant access denied");
      expect(decision.reason).toContain("tenant isolation");
    });

    test("allows same-tenant resource access", async () => {
      const ctx = tenantContext(tenantId, "user-1");
      const decision = await engine.check(ctx, "tenant:users:read", {
        tenantId: tenantId,
      });
      expect(decision.allowed).toBe(true);
    });

    test("denies tenant:create", async () => {
      const ctx = tenantContext(tenantId, "user-1");
      const decision = await engine.check(ctx, "tenant:create");
      expect(decision.allowed).toBe(false);
    });

    test("denies platform:manage", async () => {
      const ctx = tenantContext(tenantId, "user-1");
      const decision = await engine.check(ctx, "platform:manage");
      expect(decision.allowed).toBe(false);
    });
  });

  describe("Edge cases", () => {
    test("handles undefined resource gracefully", async () => {
      const ctx = tenantContext("tenant-1", "user-1");
      const decision = await engine.check(ctx, "tenant:read", undefined);
      expect(decision.allowed).toBe(true);
    });

    test("handles resource without tenantId", async () => {
      const ctx = tenantContext("tenant-1", "user-1");
      const decision = await engine.check(ctx, "tenant:read", {});
      expect(decision.allowed).toBe(true);
    });
  });
});
