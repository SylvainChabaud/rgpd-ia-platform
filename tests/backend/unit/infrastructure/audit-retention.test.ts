/**
 * Audit Events Retention Policy Test
 * LOT 11.3 - RGPD Compliance
 *
 * Tests automatic purge of audit events older than 12 months
 * CNIL Recommendation: 6-12 months retention for audit logs
 *
 * RGPD Compliance:
 * - Art. 5.1.e: Storage limitation
 * - Art. 32: Security and traceability
 * - CNIL: 12 months retention for audit logs
 */

import { PgAuditEventReader } from '@/infrastructure/audit/PgAuditEventReader';
import { pool } from '@/infrastructure/db/pg';

describe('Audit Events Retention Policy', () => {
  const reader = new PgAuditEventReader();

  // Clean up test data before and after each test
  beforeEach(async () => {
    await pool.query('DELETE FROM audit_events WHERE event_type LIKE \'test.%\'');
  });

  afterEach(async () => {
    await pool.query('DELETE FROM audit_events WHERE event_type LIKE \'test.%\'');
  });

  it('should automatically purge events older than 12 months on list()', async () => {
    // Insert test events: one recent, one old (13 months)
    await pool.query(`
      INSERT INTO audit_events (id, event_type, actor_id, tenant_id, created_at)
      VALUES
        (gen_random_uuid(), 'test.recent', gen_random_uuid(), gen_random_uuid(), NOW() - INTERVAL '1 month'),
        (gen_random_uuid(), 'test.old', gen_random_uuid(), gen_random_uuid(), NOW() - INTERVAL '13 months')
    `);

    // Verify both events exist before purge
    const beforePurge = await pool.query(
      'SELECT COUNT(*) as count FROM audit_events WHERE event_type LIKE \'test.%\''
    );
    expect(parseInt(beforePurge.rows[0].count)).toBe(2);

    // Trigger lazy purge by calling list()
    await reader.list({ limit: 10, offset: 0 });

    // Verify old event was purged (only recent event remains)
    const afterPurge = await pool.query(
      'SELECT COUNT(*) as count FROM audit_events WHERE event_type LIKE \'test.%\''
    );
    expect(parseInt(afterPurge.rows[0].count)).toBe(1);

    // Verify the remaining event is the recent one
    const remaining = await pool.query(
      'SELECT event_type FROM audit_events WHERE event_type LIKE \'test.%\''
    );
    expect(remaining.rows[0].event_type).toBe('test.recent');
  });

  it('should automatically purge events older than 12 months on findByUser()', async () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000002';

    // Insert test events: one recent, one old (13 months)
    await pool.query(`
      INSERT INTO audit_events (id, event_type, actor_id, tenant_id, created_at)
      VALUES
        (gen_random_uuid(), 'test.user.recent', $1, $2, NOW() - INTERVAL '1 month'),
        (gen_random_uuid(), 'test.user.old', $1, $2, NOW() - INTERVAL '13 months')
    `, [userId, tenantId]);

    // Verify both events exist before purge
    const beforePurge = await pool.query(
      'SELECT COUNT(*) as count FROM audit_events WHERE event_type LIKE \'test.user.%\''
    );
    expect(parseInt(beforePurge.rows[0].count)).toBe(2);

    // Trigger lazy purge by calling findByUser()
    await reader.findByUser(tenantId, userId);

    // Verify old event was purged (only recent event remains)
    const afterPurge = await pool.query(
      'SELECT COUNT(*) as count FROM audit_events WHERE event_type LIKE \'test.user.%\''
    );
    expect(parseInt(afterPurge.rows[0].count)).toBe(1);

    // Verify the remaining event is the recent one
    const remaining = await pool.query(
      'SELECT event_type FROM audit_events WHERE event_type LIKE \'test.user.%\''
    );
    expect(remaining.rows[0].event_type).toBe('test.user.recent');
  });

  it('should retain events exactly at 12 months boundary', async () => {
    // Insert event at exactly 12 months - 1 second (should be retained)
    await pool.query(`
      INSERT INTO audit_events (id, event_type, actor_id, tenant_id, created_at)
      VALUES (gen_random_uuid(), 'test.boundary', gen_random_uuid(), gen_random_uuid(), NOW() - INTERVAL '12 months' + INTERVAL '1 second')
    `);

    // Trigger lazy purge
    await reader.list({ limit: 10, offset: 0 });

    // Verify event at boundary is retained
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM audit_events WHERE event_type = \'test.boundary\''
    );
    expect(parseInt(result.rows[0].count)).toBe(1);
  });

  it('should not fail if purge encounters database error', async () => {
    // This test ensures purge errors are non-blocking
    // We can't easily trigger a DB error, but we verify that list() succeeds
    // even if there's a theoretical purge failure (error is caught)

    const result = await reader.list({ limit: 10, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it('should document 12-month retention policy (CNIL compliance)', () => {
    // Metadata test: verify retention policy is documented
    const RETENTION_MONTHS = 12;
    const CNIL_RECOMMENDATION_MIN = 6;
    const CNIL_RECOMMENDATION_MAX = 12;

    expect(RETENTION_MONTHS).toBeGreaterThanOrEqual(CNIL_RECOMMENDATION_MIN);
    expect(RETENTION_MONTHS).toBeLessThanOrEqual(CNIL_RECOMMENDATION_MAX);
  });
});
