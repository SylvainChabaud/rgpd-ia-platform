import { requirePermission } from "@/app/http/requirePermission";

const platformHandler = requirePermission("platform:manage")(
  async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
);

const tenantHandler = requirePermission("tenant:read")(
  async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
);

const tenantIsolatedHandler = requirePermission(
  "tenant:users:read",
  (req) => ({ tenantId: req.headers.get("x-tenant-id") ?? undefined })
)(
  async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
);

describe("requirePermission middleware", () => {
  test("rejects anonymous request (401)", async () => {
    const request = new Request("http://localhost/api/test");
    const response = await platformHandler(request);
    expect(response.status).toBe(401);
  });

  test("rejects TENANT scope for platform permission (403)", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer stub-tenant-admin1" },
    });
    const response = await platformHandler(request);
    expect(response.status).toBe(403);
  });

  test("allows PLATFORM scope for platform permission (200)", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer stub-platform-super1" },
    });
    const response = await platformHandler(request);
    expect(response.status).toBe(200);
  });

  test("allows TENANT scope for tenant permission (200)", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer stub-tenant-admin1" },
    });
    const response = await tenantHandler(request);
    expect(response.status).toBe(200);
  });

  test("rejects cross-tenant access (403)", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        Authorization: "Bearer stub-tenant-admin1",
        "X-Tenant-Id": "22222222-2222-4222-8222-222222222222",
      },
    });
    const response = await tenantIsolatedHandler(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("FORBIDDEN");
  });

  test("allows same-tenant access (200)", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        Authorization: "Bearer stub-tenant-admin1",
        "X-Tenant-Id": "11111111-1111-4111-8111-111111111111",
      },
    });
    const response = await tenantIsolatedHandler(request);
    expect(response.status).toBe(200);
  });

  test("allows PLATFORM scope to create tenants (200)", async () => {
    const createTenantHandler = requirePermission("tenant:create")(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );

    const request = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer stub-platform-super1" },
    });
    const response = await createTenantHandler(request);
    expect(response.status).toBe(200);
  });

  test("rejects TENANT scope from creating tenants (403)", async () => {
    const createTenantHandler = requirePermission("tenant:create")(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );

    const request = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer stub-tenant-admin1" },
    });
    const response = await createTenantHandler(request);
    expect(response.status).toBe(403);
  });
});
