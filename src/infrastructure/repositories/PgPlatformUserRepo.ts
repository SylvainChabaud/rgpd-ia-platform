import type { PlatformUserRepo } from "@/app/ports/PlatformUserRepo";
import { pool } from "@/infrastructure/db/pg";

export class PgPlatformUserRepo implements PlatformUserRepo {
  async existsSuperAdmin(): Promise<boolean> {
    const res = await pool.query(
      "SELECT 1 FROM users WHERE scope = 'PLATFORM' AND role = 'SUPERADMIN' LIMIT 1"
    );

    const affected = res.rowCount ?? 0;
    return affected > 0;
  }

  async createSuperAdmin(input: {
    id: string;
    emailHash: string;
    displayName: string;
    passwordHash: string;
  }): Promise<void> {
    await pool.query(
      `
      INSERT INTO users (
        id,
        email_hash,
        display_name,
        password_hash,
        scope,
        role
      )
      VALUES ($1, $2, $3, $4, 'PLATFORM', 'SUPERADMIN')
      `,
      [
        input.id,
        input.emailHash,
        input.displayName,
        input.passwordHash,
      ]
    );
  }
}
