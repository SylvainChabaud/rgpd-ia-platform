import type { PlatformUserRepo } from "@/app/ports/PlatformUserRepo";
import { pool } from "@/infrastructure/db/pg";
import { ACTOR_ROLE } from "@/shared/actorRole";
import { ACTOR_SCOPE } from "@/shared/actorScope";

export class PgPlatformUserRepo implements PlatformUserRepo {
  async existsSuperAdmin(): Promise<boolean> {
    const res = await pool.query(
      `SELECT 1 FROM users WHERE scope = $1 AND role = $2 LIMIT 1`,
      [ACTOR_SCOPE.PLATFORM, ACTOR_ROLE.SUPERADMIN]
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
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        input.id,
        input.emailHash,
        input.displayName,
        input.passwordHash,
        ACTOR_SCOPE.PLATFORM,
        ACTOR_ROLE.SUPERADMIN,
      ]
    );
  }
}
