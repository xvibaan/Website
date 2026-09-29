import { Pool } from 'pg';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
/**
 * Returns or initializes the centralized PostgreSQL connection pool.
 * Avoids creating new connection pools for every query.
 */
export declare function getDbPool(): Pool;
/**
 * Returns the centralized Drizzle database instance initialized with the schema.
 */
export declare function getDb(): NodePgDatabase<typeof schema>;
export type DbClient = NodePgDatabase<typeof schema>;
export type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0];
/**
 * Transaction helper ensuring future atomic multi-operation sequences.
 * Accepts a callback that receives the transaction client.
 */
export declare function withTransaction<T>(callback: (tx: DbTransaction) => Promise<T>): Promise<T>;
/**
 * Gracefully closes the connection pool if active.
 */
export declare function closeDbPool(): Promise<void>;
export { schema };
