import type { LogEvent, LogLevel } from "@/shared/logger";
import { setLogSink } from "@/shared/logger";

export type CapturedLog = { level: LogLevel; entry: LogEvent };

export async function withLogCapture<T>(
  fn: () => Promise<T> | T
): Promise<{ result: T; logs: CapturedLog[] }> {
  const logs: CapturedLog[] = [];
  setLogSink((level, entry) => {
    logs.push({ level, entry });
  });
  try {
    const result = await fn();
    return { result, logs };
  } finally {
    setLogSink();
  }
}
