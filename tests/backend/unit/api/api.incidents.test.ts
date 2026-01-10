/**
 * Security Incidents API Tests - EPIC 9 / LOT 9.0
 *
 * RGPD Compliance:
 * - Art. 33: Notification CNIL (72h deadline)
 * - Art. 33.5: Registre des violations (append-only)
 * - Art. 34: Notification des personnes concernees
 * - Art. 32: Securite du traitement (isolation tenant)
 *
 * Endpoints tested:
 * - GET /api/incidents - List incidents
 * - POST /api/incidents - Create incident
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { NextRequest } from "next/server";
import { signJwt } from "@/lib/jwt";
import { ACTOR_SCOPE } from "@/shared/actorScope";
import { ACTOR_ROLE } from "@/shared/actorRole";

// =============================================================================
// MOCKS - Repositories and Services
// =============================================================================

const mockFindAll = jest.fn();
const mockCreate = jest.fn();

jest.mock("@/infrastructure/repositories/PgSecurityIncidentRepo", () => ({
  PgSecurityIncidentRepo: class {
    findAll = mockFindAll;
    create = mockCreate;
  },
}));

jest.mock("@/app/usecases/incident", () => ({
  createIncident: jest.fn().mockImplementation(async (input) => ({
    incident: {
      id: "incident-created-123",
      tenantId: input.tenantId,
      severity: input.severity,
      type: input.type,
      title: input.title,
      description: input.description,
      riskLevel: input.riskLevel || "UNKNOWN",
      detectedAt: new Date(),
      createdAt: new Date(),
    },
    cnilNotificationRequired: input.severity === "CRITICAL" || input.severity === "HIGH",
    usersNotificationRequired: input.severity === "CRITICAL",
    alertsSent: true,
  })),
}));

jest.mock("@/infrastructure/alerts/IncidentAlertService", () => ({
  createIncidentAlertService: jest.fn().mockReturnValue({
    sendAlert: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/infrastructure/alerts/AlertService", () => ({
  createEmailAlertService: jest.fn().mockReturnValue({
    send: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Import handlers AFTER mocking
import { GET, POST } from "@app/api/incidents/route";

// =============================================================================
// TEST HELPERS
// =============================================================================

function createPlatformAdminRequest(
  url: string,
  options?: Omit<RequestInit, 'signal'>
): NextRequest {
  const token = signJwt({
    userId: "superadmin-123",
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.SUPERADMIN,
  });
  return new NextRequest(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

function createDpoRequest(url: string, options?: Omit<RequestInit, 'signal'>): NextRequest {
  const token = signJwt({
    userId: "dpo-456",
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.DPO,
  });
  return new NextRequest(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

function createTenantAdminRequest(
  url: string,
  tenantId: string,
  options?: Omit<RequestInit, 'signal'>
): NextRequest {
  const token = signJwt({
    userId: "tenant-admin-789",
    tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

function createMemberRequest(url: string): NextRequest {
  const token = signJwt({
    userId: "member-101",
    tenantId: "tenant-abc",
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Sample incident data
const sampleIncident = {
  id: "inc-001",
  tenantId: "tenant-123",
  severity: "HIGH",
  type: "DATA_LEAK",
  title: "Unauthorized data access detected",
  description: "A user accessed data outside their scope",
  dataCategories: ["P2"],
  usersAffected: 50,
  recordsAffected: 200,
  riskLevel: "HIGH",
  cnilNotified: false,
  cnilNotifiedAt: null,
  usersNotified: false,
  usersNotifiedAt: null,
  resolvedAt: null,
  detectedAt: new Date("2024-01-15T10:00:00Z"),
  detectedBy: "SYSTEM",
  createdAt: new Date("2024-01-15T10:00:00Z"),
};

// =============================================================================
// TESTS
// =============================================================================

describe("GET /api/incidents - List Incidents (Art. 33.5)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAll.mockReset();
  });

  describe("Authentication & Authorization", () => {
    it("[INC-GET-001] should return 401 for unauthenticated requests", async () => {
      const req = new NextRequest("http://localhost:3000/api/incidents");
      const response = await GET(req);

      expect(response.status).toBe(401);
    });

    it("[INC-GET-002] should return 403 for MEMBER role (insufficient permissions)", async () => {
      const req = createMemberRequest("http://localhost:3000/api/incidents");
      const response = await GET(req);

      expect(response.status).toBe(403);
    });

    it("[INC-GET-003] should return 403 for TENANT_ADMIN (platform endpoint)", async () => {
      const req = createTenantAdminRequest(
        "http://localhost:3000/api/incidents",
        "tenant-abc"
      );
      const response = await GET(req);

      expect(response.status).toBe(403);
    });

    it("[INC-GET-004] should allow SUPERADMIN to list incidents", async () => {
      mockFindAll.mockResolvedValue({
        data: [sampleIncident],
        total: 1,
        limit: 50,
        offset: 0,
      });

      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents"
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.incidents).toHaveLength(1);
    });

    it("[INC-GET-005] should allow DPO to list incidents", async () => {
      mockFindAll.mockResolvedValue({
        data: [sampleIncident],
        total: 1,
        limit: 50,
        offset: 0,
      });

      const req = createDpoRequest("http://localhost:3000/api/incidents");
      const response = await GET(req);

      expect(response.status).toBe(200);
    });
  });

  describe("Query Parameters & Filtering", () => {
    it("[INC-GET-006] should apply severity filter", async () => {
      mockFindAll.mockResolvedValue({
        data: [sampleIncident],
        total: 1,
        limit: 50,
        offset: 0,
      });

      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents?severity=HIGH"
      );
      await GET(req);

      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ severity: "HIGH" }),
        expect.any(Object)
      );
    });

    it("[INC-GET-007] should apply type filter", async () => {
      mockFindAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents?type=DATA_LEAK"
      );
      await GET(req);

      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ type: "DATA_LEAK" }),
        expect.any(Object)
      );
    });

    it("[INC-GET-008] should apply resolved filter", async () => {
      mockFindAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents?resolved=false"
      );
      await GET(req);

      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ resolved: false }),
        expect.any(Object)
      );
    });

    it("[INC-GET-009] should apply pagination (limit/offset)", async () => {
      mockFindAll.mockResolvedValue({
        data: [],
        total: 100,
        limit: 10,
        offset: 20,
      });

      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents?limit=10&offset=20"
      );
      const response = await GET(req);
      const data = await response.json();

      expect(mockFindAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ limit: 10, offset: 20 })
      );
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.offset).toBe(20);
    });

    it("[INC-GET-010] should return 400 for invalid severity value", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents?severity=INVALID"
      );
      const response = await GET(req);

      expect(response.status).toBe(400);
    });

    it("[INC-GET-011] should return 400 for invalid type value", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents?type=INVALID_TYPE"
      );
      const response = await GET(req);

      expect(response.status).toBe(400);
    });
  });

  describe("Response Structure (P1 Data Only - Art. 33.5)", () => {
    it("[INC-GET-012] should return incident fields for violations registry", async () => {
      mockFindAll.mockResolvedValue({
        data: [sampleIncident],
        total: 1,
        limit: 50,
        offset: 0,
      });

      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents"
      );
      const response = await GET(req);
      const data = await response.json();

      const incident = data.incidents[0];

      // Required fields for Art. 33.5 violations registry
      expect(incident).toHaveProperty("id");
      expect(incident).toHaveProperty("severity");
      expect(incident).toHaveProperty("type");
      expect(incident).toHaveProperty("title");
      expect(incident).toHaveProperty("description");
      expect(incident).toHaveProperty("usersAffected");
      expect(incident).toHaveProperty("recordsAffected");
      expect(incident).toHaveProperty("cnilNotified");
      expect(incident).toHaveProperty("usersNotified");
      expect(incident).toHaveProperty("detectedAt");
    });

    it("[INC-GET-013] should NOT expose sensitive internal fields", async () => {
      mockFindAll.mockResolvedValue({
        data: [{ ...sampleIncident, sourceIp: "192.168.1.1", createdBy: "system-user" }],
        total: 1,
        limit: 50,
        offset: 0,
      });

      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents"
      );
      const response = await GET(req);
      const data = await response.json();

      const incident = data.incidents[0];

      // sourceIp and createdBy should not be in response (internal use only)
      expect(incident).not.toHaveProperty("sourceIp");
      expect(incident).not.toHaveProperty("createdBy");
    });
  });
});

describe("POST /api/incidents - Create Incident (Art. 33)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockReset();
  });

  describe("Authentication & Authorization", () => {
    it("[INC-POST-001] should return 401 for unauthenticated requests", async () => {
      const req = new NextRequest("http://localhost:3000/api/incidents", {
        method: "POST",
        body: JSON.stringify({
          severity: "HIGH",
          type: "DATA_LEAK",
          title: "Test",
          description: "Test description",
        }),
      });
      const response = await POST(req);

      expect(response.status).toBe(401);
    });

    it("[INC-POST-002] should return 403 for MEMBER role", async () => {
      const req = createMemberRequest("http://localhost:3000/api/incidents");
      const reqWithBody = new NextRequest(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify({
          severity: "HIGH",
          type: "DATA_LEAK",
          title: "Test",
          description: "Test description",
        }),
      });
      const response = await POST(reqWithBody);

      expect(response.status).toBe(403);
    });

    it("[INC-POST-003] should allow SUPERADMIN to create incidents", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "HIGH",
            type: "DATA_LEAK",
            title: "Security breach detected",
            description: "Unauthorized access to user data was detected",
          }),
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(201);
    });

    it("[INC-POST-004] should allow DPO to create incidents", async () => {
      const req = createDpoRequest("http://localhost:3000/api/incidents", {
        method: "POST",
        body: JSON.stringify({
          severity: "MEDIUM",
          type: "PII_IN_LOGS",
          title: "PII found in logs",
          description: "Email addresses were found in application logs",
        }),
      });
      const response = await POST(req);

      expect(response.status).toBe(201);
    });
  });

  describe("Input Validation", () => {
    it("[INC-POST-005] should return 400 for missing severity", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            type: "DATA_LEAK",
            title: "Test",
            description: "Test description",
          }),
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("[INC-POST-006] should return 400 for missing type", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "HIGH",
            title: "Test",
            description: "Test description",
          }),
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("[INC-POST-007] should return 400 for missing title", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "HIGH",
            type: "DATA_LEAK",
            description: "Test description",
          }),
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("[INC-POST-008] should return 400 for missing description", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "HIGH",
            type: "DATA_LEAK",
            title: "Test",
          }),
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("[INC-POST-009] should return 400 for invalid severity", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "EXTREME",
            type: "DATA_LEAK",
            title: "Test",
            description: "Test description",
          }),
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("[INC-POST-010] should return 400 for invalid type", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "HIGH",
            type: "HACKING",
            title: "Test",
            description: "Test description",
          }),
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("[INC-POST-011] should validate sourceIp format (IPv4)", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "HIGH",
            type: "UNAUTHORIZED_ACCESS",
            title: "Brute force attack",
            description: "Multiple failed login attempts",
            sourceIp: "192.168.1.100",
          }),
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(201);
    });

    it("[INC-POST-012] should return 400 for invalid sourceIp format", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "HIGH",
            type: "UNAUTHORIZED_ACCESS",
            title: "Test",
            description: "Test description",
            sourceIp: "not-an-ip",
          }),
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(400);
    });
  });

  describe("RGPD Compliance - Art. 33 (CNIL Notification)", () => {
    it("[INC-POST-013] should indicate CNIL notification required for HIGH severity", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "HIGH",
            type: "DATA_LEAK",
            title: "Data breach",
            description: "Personal data was exposed",
            riskLevel: "HIGH",
          }),
        }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.cnilNotificationRequired).toBe(true);
    });

    it("[INC-POST-014] should indicate CNIL notification required for CRITICAL severity", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "CRITICAL",
            type: "DATA_LOSS",
            title: "Critical data loss",
            description: "Major data loss incident",
          }),
        }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.cnilNotificationRequired).toBe(true);
    });

    it("[INC-POST-015] should NOT require CNIL notification for LOW severity", async () => {
      const { createIncident } = jest.requireMock("@/app/usecases/incident");
      createIncident.mockResolvedValueOnce({
        incident: { ...sampleIncident, severity: "LOW" },
        cnilNotificationRequired: false,
        usersNotificationRequired: false,
        alertsSent: false,
      });

      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "LOW",
            type: "OTHER",
            title: "Minor issue",
            description: "Non-critical issue detected",
          }),
        }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.cnilNotificationRequired).toBe(false);
    });
  });

  describe("RGPD Compliance - Art. 34 (Users Notification)", () => {
    it("[INC-POST-016] should indicate users notification required for CRITICAL severity", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "CRITICAL",
            type: "DATA_LEAK",
            title: "Critical breach",
            description: "Personal data exposed to unauthorized parties",
          }),
        }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.usersNotificationRequired).toBe(true);
    });
  });

  describe("Response Structure", () => {
    it("[INC-POST-017] should return created incident with ID", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "MEDIUM",
            type: "PII_IN_LOGS",
            title: "PII in logs",
            description: "Personal data found in application logs",
          }),
        }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.incident).toHaveProperty("id");
      expect(data.incident).toHaveProperty("severity", "MEDIUM");
      expect(data.incident).toHaveProperty("type", "PII_IN_LOGS");
      expect(data.incident).toHaveProperty("detectedAt");
      expect(data.incident).toHaveProperty("createdAt");
    });

    it("[INC-POST-018] should indicate if alerts were sent", async () => {
      const req = createPlatformAdminRequest(
        "http://localhost:3000/api/incidents",
        {
          method: "POST",
          body: JSON.stringify({
            severity: "HIGH",
            type: "UNAUTHORIZED_ACCESS",
            title: "Unauthorized access",
            description: "Cross-tenant data access attempt",
          }),
        }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(data).toHaveProperty("alertsSent");
    });
  });
});

describe("Security & Isolation (Art. 32)", () => {
  it("[INC-SEC-001] should NOT allow TENANT scope to access platform incidents", async () => {
    const req = createTenantAdminRequest(
      "http://localhost:3000/api/incidents",
      "tenant-malicious"
    );
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it("[INC-SEC-002] should NOT expose error details in 500 response", async () => {
    mockFindAll.mockRejectedValue(new Error("Database connection failed"));

    const req = createPlatformAdminRequest(
      "http://localhost:3000/api/incidents"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    // Should not expose internal error message
    expect(JSON.stringify(data)).not.toContain("Database connection");
    expect(JSON.stringify(data)).not.toContain("failed");
  });
});
