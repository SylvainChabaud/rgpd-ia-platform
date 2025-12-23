import { isAppError } from "@/shared/errors";

function jsonResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function toErrorResponse(error: unknown): Response {
  if (isAppError(error)) {
    return jsonResponse(error.status, error.code);
  }
  return jsonResponse(500, "INTERNAL_ERROR");
}
