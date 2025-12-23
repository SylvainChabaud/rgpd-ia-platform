import type { ActorScope } from "@/shared/actorScope";
import {
  assertSafeEventName,
  assertSafeMeta,
  assertSafeStringValue,
  type SafeMetaValue,
} from "@/shared/rgpd/safeEvent";

/**
 * RGPD-safe logger: events only, never payloads.
 * Do NOT log emails, prompts, documents, or user-provided content.
 */
export type LogLevel = "info" | "warn" | "error";

export type LogEvent = {
  event: string;
  at: string;
  tenantId?: string;
  actorScope?: ActorScope;
  actorId?: string;
  targetId?: string;
  requestId?: string;
  meta?: Record<string, SafeMetaValue>;
};

export type LogEventInput = Omit<LogEvent, "at">;

type LogSink = (level: LogLevel, entry: LogEvent) => void;

const defaultSink: LogSink = (level, entry) => {
  // eslint-disable-next-line no-console
  console[level](JSON.stringify(entry));
};

let logSink: LogSink = defaultSink;

export function setLogSink(next?: LogSink): void {
  logSink = next ?? defaultSink;
}

function assertSafeLogInput(input: LogEventInput): void {
  const allowedKeys = new Set([
    "event",
    "tenantId",
    "actorScope",
    "actorId",
    "targetId",
    "requestId",
    "meta",
  ]);
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`RGPD_LOG_GUARD: forbidden log key ${key}`);
    }
  }
  assertSafeEventName(input.event);
  if (input.tenantId) assertSafeStringValue(input.tenantId, "tenantId");
  if (input.actorId) assertSafeStringValue(input.actorId, "actorId");
  if (input.targetId) assertSafeStringValue(input.targetId, "targetId");
  if (input.requestId) assertSafeStringValue(input.requestId, "requestId");
  if (input.meta) assertSafeMeta(input.meta);
}

export function log(level: LogLevel, input: LogEventInput): void {
  assertSafeLogInput(input);
  const entry: LogEvent = { ...input, at: new Date().toISOString() };
  logSink(level, entry);
}

export const logInfo = (e: LogEventInput) => log("info", e);
export const logWarn = (e: LogEventInput) => log("warn", e);

export function logEvent(
  eventName: string,
  meta?: Record<string, SafeMetaValue>,
  fields?: Omit<LogEventInput, "event" | "meta">
): void {
  log("info", { event: eventName, meta, ...fields });
}

export function logError(
  eventName: string,
  meta?: Record<string, SafeMetaValue>,
  fields?: Omit<LogEventInput, "event" | "meta">
): void;
export function logError(entry: LogEventInput): void;
export function logError(
  eventOrEntry: string | LogEventInput,
  meta?: Record<string, SafeMetaValue>,
  fields?: Omit<LogEventInput, "event" | "meta">
): void {
  if (typeof eventOrEntry === "string") {
    log("error", { event: eventOrEntry, meta, ...fields });
    return;
  }
  log("error", eventOrEntry);
}
