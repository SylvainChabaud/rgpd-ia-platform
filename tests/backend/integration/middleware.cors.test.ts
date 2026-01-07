/**
 * Tests for Next.js CORS middleware
 * LOT 5.3 - API Layer
 *
 * These tests cover the CORS middleware branches
 */

import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

describe("CORS middleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createRequest(url: string, options: RequestInit & { origin?: string } = {}): NextRequest {
    const headers = new Headers(options.headers);
    if (options.origin) {
      headers.set("origin", options.origin);
    }
    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method: options.method || "GET",
      headers,
    });
  }

  describe("when origin is allowed", () => {
    it("should set CORS headers for allowed origin", () => {
      process.env.ALLOWED_ORIGINS = "http://localhost:3000,http://example.com";
      const request = createRequest("/api/test", { origin: "http://localhost:3000" });

      const response = middleware(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, PUT, DELETE, OPTIONS");
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type, Authorization");
      expect(response.headers.get("Access-Control-Max-Age")).toBe("86400");
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    });

    it("should use default localhost origin when env not set", () => {
      delete process.env.ALLOWED_ORIGINS;
      const request = createRequest("/api/test", { origin: "http://localhost:3000" });

      const response = middleware(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    });
  });

  describe("when origin is not allowed", () => {
    it("should not set CORS headers for disallowed origin", () => {
      process.env.ALLOWED_ORIGINS = "http://localhost:3000";
      const request = createRequest("/api/test", { origin: "http://evil.com" });

      const response = middleware(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("when no origin header", () => {
    it("should not set CORS headers", () => {
      const request = createRequest("/api/test");

      const response = middleware(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("OPTIONS preflight request", () => {
    it("should return 204 for OPTIONS request with allowed origin", () => {
      process.env.ALLOWED_ORIGINS = "http://localhost:3000";
      const request = createRequest("/api/test", {
        method: "OPTIONS",
        origin: "http://localhost:3000",
      });

      const response = middleware(request);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    });

    it("should return 204 for OPTIONS request without origin", () => {
      const request = createRequest("/api/test", { method: "OPTIONS" });

      const response = middleware(request);

      expect(response.status).toBe(204);
    });
  });

  describe("non-OPTIONS request", () => {
    it("should pass through GET request", () => {
      const request = createRequest("/api/test", { method: "GET" });

      const response = middleware(request);

      // NextResponse.next() returns a response that passes through
      expect(response.status).not.toBe(204);
    });

    it("should pass through POST request", () => {
      const request = createRequest("/api/test", { method: "POST" });

      const response = middleware(request);

      expect(response.status).not.toBe(204);
    });
  });
});
