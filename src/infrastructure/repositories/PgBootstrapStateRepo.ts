import type { BootstrapStateRepo } from "@/app/ports/BootstrapStateRepo";
import { pool } from "@/infrastructure/db/pg";

const BOOTSTRAP_KEY = "platform";

export class PgBootstrapStateRepo implements BootstrapStateRepo {
  async isBootstrapped(): Promise<boolean> {
    const res = await pool.query(
      "SELECT 1 FROM bootstrap_state WHERE id=$1 LIMIT 1",
      [BOOTSTRAP_KEY]
    );
    const affected = res.rowCount ?? 0;
    return affected > 0;
  }

  async markBootstrapped(): Promise<void> {
    await pool.query(
      "INSERT INTO bootstrap_state (id) VALUES ($1) ON CONFLICT DO NOTHING",
      [BOOTSTRAP_KEY]
    );
  }
}
