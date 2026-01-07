import { GET } from '@app/api/_private/ping/route';

test("tenant guard rejects missing header", async () => {
  const res = await GET(
    new Request("http://localhost/api/_private/ping", { method: "GET" })
  );
  expect(res.status).toBe(401);
});

test("tenant guard rejects invalid tenant id", async () => {
  const res = await GET(
    new Request("http://localhost/api/_private/ping", {
      method: "GET",
      headers: { "X-Tenant-Id": "invalid" },
    })
  );
  expect(res.status).toBe(400);
});

test("tenant guard allows valid tenant id", async () => {
  const res = await GET(
    new Request("http://localhost/api/_private/ping", {
      method: "GET",
      headers: { "X-Tenant-Id": "11111111-1111-4111-8111-111111111111" },
    })
  );
  expect(res.status).toBe(200);
});
