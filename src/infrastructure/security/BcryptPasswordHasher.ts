import bcrypt from 'bcryptjs';
import type { PasswordHasher } from "@/app/ports/PasswordHasher";

/**
 * Production-ready password hasher using bcrypt
 * SECURITY: Compliant with OWASP recommendations (Art. 32 RGPD)
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly saltRounds: number;

  constructor(saltRounds: number = 12) {
    this.saltRounds = saltRounds;
  }

  async hash(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    // Handle disabled passwords
    if (hash === "__DISABLED__") {
      return false;
    }
    return await bcrypt.compare(password, hash);
  }
}
