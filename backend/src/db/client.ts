import { Pool, PoolConfig } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

let pool: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

/**
 * Returns or initializes the centralized PostgreSQL connection pool.
 * Avoids creating new connection pools for every query.
 */
export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    const config: PoolConfig = {
      connectionString: connectionString || undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool] Unexpected error on idle client', err);
    });
  }

  return pool;
}

/**
 * Returns the centralized Drizzle database instance initialized with the schema.
 */
export function getDb(): NodePgDatabase<typeof schema> {
  if (!dbInstance) {
    const currentPool = getDbPool();
    dbInstance = drizzle(currentPool, { schema });
  }

  return dbInstance;
}

export type DbClient = NodePgDatabase<typeof schema>;
export type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0];

/**
 * Transaction helper ensuring future atomic multi-operation sequences.
 * Accepts a callback that receives the transaction client.
 */
export async function withTransaction<T>(
  callback: (tx: DbTransaction) => Promise<T>
): Promise<T> {
  const db = getDb();
  return db.transaction(callback);
}

/**
 * Gracefully closes the connection pool if active.
 */
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

export { schema };
