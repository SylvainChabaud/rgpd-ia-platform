export type SafeMetaValue = string | number | boolean | null | undefined;

const FORBIDDEN_KEY_TOKENS = [
  "email",
  "password",
  "prompt",
  "content",
  "payload",
  "body",
  "input",
  "output",
  "message",
  "text",
  "document",
  "token",
  "secret",
  "data",
];

const FORBIDDEN_VALUE_TOKENS = [
  "email",
  "password",
  "prompt",
  "content",
  "payload",
  "body",
  "input",
  "output",
  "message",
  "text",
  "document",
  "token",
  "secret",
  "bearer",
];

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/;
const API_KEY_PATTERN = /\bsk-[A-Za-z0-9]{10,}\b/;

const EVENT_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,120}$/i;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isForbiddenKey(key: string): boolean {
  const normalized = normalize(key);
  for (const token of FORBIDDEN_KEY_TOKENS) {
    if (token === "data") {
      if (normalized === "data") return true;
      continue;
    }
    if (normalized.includes(token)) return true;
  }
  return false;
}

function containsForbiddenValue(value: string): boolean {
  const normalized = normalize(value);
  if (value.includes("@")) return true;
  for (const token of FORBIDDEN_VALUE_TOKENS) {
    if (normalized.includes(token)) return true;
  }
  return (
    EMAIL_PATTERN.test(value) ||
    JWT_PATTERN.test(value) ||
    API_KEY_PATTERN.test(value)
  );
}

export function assertSafeEventName(eventName: string): void {
  if (!EVENT_NAME_PATTERN.test(eventName)) {
    throw new Error("RGPD_LOG_GUARD: invalid event name");
  }
  if (containsForbiddenValue(eventName)) {
    throw new Error("RGPD_LOG_GUARD: sensitive event value");
  }
}

export function assertSafeStringValue(value: string, label: string): void {
  if (containsForbiddenValue(value)) {
    throw new Error(`RGPD_LOG_GUARD: sensitive value in ${label}`);
  }
}

export function assertSafeMeta(
  meta?: Record<string, unknown>
): asserts meta is Record<string, SafeMetaValue> {
  if (!meta) return;
  if (typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error("RGPD_LOG_GUARD: meta must be a flat object");
  }

  for (const [key, value] of Object.entries(meta)) {
    if (isForbiddenKey(key)) {
      throw new Error(`RGPD_LOG_GUARD: forbidden meta key ${key}`);
    }
    if (value === null || value === undefined) continue;
    const valueType = typeof value;
    if (valueType === "string") {
      // Exception: pii_types contains PII type names (PERSON, EMAIL, etc.), not actual values
      // These are safe metadata and should not trigger forbidden value checks
      if (key === "pii_types") {
        continue;
      }
      assertSafeStringValue(value as string, `meta.${key}`);
      continue;
    }
    if (valueType === "number" || valueType === "boolean") continue;
    throw new Error(`RGPD_LOG_GUARD: nested meta not allowed for ${key}`);
  }
}
