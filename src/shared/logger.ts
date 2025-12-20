/**
 * RGPD-safe logger: events only, never payloads.
 * Do NOT log emails, prompts, documents, or user-provided content.
 */
export type LogLevel = "info" | "warn" | "error";

export type LogEvent = {
  event: string;
  tenantId?: string;
  actorScope?: "PLATFORM" | "TENANT" | "SYSTEM";
  actorId?: string;
  targetId?: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

function safeJson(obj: unknown): string {
  return JSON.stringify(obj, (_k, v) => {
    if (typeof v === "string" && v.length > 200) return v.slice(0, 200) + "...";
    return v;
  });
}

export function log(level: LogLevel, e: LogEvent): void {
  // Hard guard: forbid common P2 patterns (very conservative)
  const dump = safeJson(e);
  if (dump.match(/@/)) {
    throw new Error("RGPD_TEST_GUARD: attempted to log email-like content");
  }
  // eslint-disable-next-line no-console
  console[level](dump);
}

export const logInfo = (e: LogEvent) => log("info", e);
export const logWarn = (e: LogEvent) => log("warn", e);
export const logError = (e: LogEvent) => log("error", e);
