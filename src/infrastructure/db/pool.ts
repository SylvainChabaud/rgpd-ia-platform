/**
 * Database Connection Pool
 * Centralized PostgreSQL connection management
 *
 * RGPD Compliance:
 * - Connection pooling for performance
 * - Secure connection (SSL enforced in production)
 * - No logging of connection strings
 */

import { Pool, PoolConfig } from 'pg';
import { logger } from '../logging/logger';

let pool: Pool | null = null;

/**
 * Get or create database connection pool
 * Singleton pattern to reuse connections
 */
export function getPool(): Pool {
  if (!pool) {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    // Enforce SSL in production
    if (process.env.NODE_ENV === 'production') {
      config.ssl = {
        rejectUnauthorized: true,
      };
    }

    pool = new Pool(config);

    pool.on('error', (err) => {
      logger.error({ error: err.message }, 'Unexpected database pool error');
    });

    pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    logger.info({
      max: config.max,
      ssl: !!config.ssl,
    }, 'Database pool initialized');
  }

  return pool;
}

/**
 * Close database pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}
