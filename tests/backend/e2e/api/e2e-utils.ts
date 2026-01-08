type WarmRoute = {
  path: string;
  init?: RequestInit;
};

function parseTimeoutMs(): number {
  const raw = process.env.TEST_E2E_FETCH_TIMEOUT_MS;
  if (!raw) return 20000;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return 20000;
  }

  return value;
}

export const DEFAULT_E2E_FETCH_TIMEOUT_MS = parseTimeoutMs();

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_E2E_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function warmRoutes(
  baseUrl: string,
  routes: WarmRoute[],
  timeoutMs: number = DEFAULT_E2E_FETCH_TIMEOUT_MS
): Promise<void> {
  for (const route of routes) {
    try {
      await fetchWithTimeout(`${baseUrl}${route.path}`, route.init, timeoutMs);
    } catch {
      // Best-effort warmup; real tests will surface failures.
    }
  }
}
