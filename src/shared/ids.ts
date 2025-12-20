import { randomUUID, createHash } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

/**
 * Hash email to avoid storing P2 in clear. This is still P2 but reduces exposure.
 * Never log raw email.
 */
export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
