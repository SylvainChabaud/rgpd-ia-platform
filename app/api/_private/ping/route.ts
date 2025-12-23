import { tenantGuard } from "@/app/http/tenantGuard";

export const GET = tenantGuard(async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
