import { createHash, randomBytes } from "node:crypto";
import type { PasswordHasher } from "@/app/ports/PasswordHasher";

/**
 * Minimal hasher for bootstrap. Replace with Argon2/bcrypt in production.
 * IMPORTANT: keep API compatible, and never log passwords.
 */
export class Sha256PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const digest = createHash("sha256")
      .update(salt + ":" + password)
      .digest("hex");
    return `${salt}:${digest}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const [salt, expectedDigest] = hash.split(":");
    if (!salt || !expectedDigest) {
      return false;
    }

    const actualDigest = createHash("sha256")
      .update(salt + ":" + password)
      .digest("hex");

    return actualDigest === expectedDigest;
  }
}
