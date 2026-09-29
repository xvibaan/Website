import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, getDbPool, closeDbPool } from '../db/client';
import path from 'path';

async function runMigration() {
  console.log('Running database migrations...');
  const db = getDb();
  try {
    const migrationsFolder = path.join(process.cwd(), 'src/db/migrations');
    await migrate(db, { migrationsFolder });
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDbPool();
  }
}

runMigration();
