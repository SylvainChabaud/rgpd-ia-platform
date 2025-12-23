import { requireAuth } from "@/app/http/requireAuth";
import { stubAuthProvider } from "@/app/auth/stubAuthProvider";

const testHandler = requireAuth(async ({ actor }) => {
  return new Response(JSON.stringify({ actorId: actor.actorId }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

describe("requireAuth middleware", () => {
  test("rejects request with missing Authorization header", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "GET",
    });

    const response = await testHandler(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  test("rejects request with invalid token", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "GET",
      headers: { Authorization: "Bearer invalid-token" },
    });

    const response = await testHandler(request);

    expect(response.status).toBe(401);
  });

  test("accepts request with valid token", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "GET",
      headers: { Authorization: "Bearer stub-platform-super1" },
    });

    const response = await testHandler(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.actorId).toBe("platform-super-1");
  });

  test("accepts Bearer token (case insensitive)", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "GET",
      headers: { authorization: "bearer stub-platform-super1" },
    });

    const response = await testHandler(request);

    expect(response.status).toBe(200);
  });

  test("rejects malformed Authorization header", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "GET",
      headers: { Authorization: "NotBearer token" },
    });

    const response = await testHandler(request);

    expect(response.status).toBe(401);
  });
});
