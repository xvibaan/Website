import { URL } from 'url';
import { Client, ClientConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Migration baseline constants from meta/_journal.json
export const BASELINE_0012_MIGRATION_COUNT = 13;
export const BASELINE_0012_LATEST_CREATED_AT = 1791356518530;
export const BASELINE_0012_LATEST_TAG = '0012_purple_slayback';

export const FULLY_MIGRATED_0013_COUNT = 14;
export const FULLY_MIGRATED_0013_LATEST_CREATED_AT = 1792320097140;
export const FULLY_MIGRATED_0013_LATEST_TAG = '0013_product_digital_files';

export const MIN_POSTGRES_VERSION_NUM = 150000; // PostgreSQL 15.0.0
export const RECOMMENDED_POSTGRES_VERSION_NUM = 160000; // PostgreSQL 16.0.0

export type StagingDatabaseState =
  | 'FRESH_EMPTY_DB'
  | 'MIGRATION_BASELINE_0012'
  | 'FULLY_MIGRATED'
  | 'UNEXPECTED_SCHEMA_OR_HISTORY';

export interface PreflightConfig {
  databaseUrl?: string;
  approvedHost?: string;
  approvedDbName?: string;
  sslMode?: string;
  rejectUnauthorized?: boolean;
}

export interface DrizzleMigrationRecord {
  id: number;
  hash: string;
  created_at: string | number;
}

export interface DatabaseIdentity {
  targetHost: string;
  targetDatabase: string;
  connectedDatabase: string;
  connectedUser: string;
  serverIp: string | null;
  serverPort: number | null;
  postgresVersion: string;
  serverVersionNum: number;
}

export interface SchemaInspection {
  tableCount: number;
  tables: string[];
  productDigitalFilesExists: boolean;
}

export interface MigrationInspection {
  hasDrizzleTrackingTable: boolean;
  appliedCount: number;
  latestMigrationId: number | null;
  latestMigrationCreatedAt: number | null;
  migrations: DrizzleMigrationRecord[];
}

export interface StateEvaluationResult {
  state: StagingDatabaseState;
  isSafeToProceed: boolean;
  recommendation: string;
  reasons: string[];
  warnings: string[];
}

export interface PreflightReport {
  state: StagingDatabaseState;
  isSafeToProceed: boolean;
  databaseIdentity: DatabaseIdentity;
  publicTables: SchemaInspection;
  migrationHistory: MigrationInspection;
  recommendation: string;
  reasons: string[];
  warnings: string[];
}

/**
 * Sanitizes and masks sensitive passwords in database connection strings.
 * Safe for terminal logs, audit artifacts, and standard output.
 */
export function maskConnectionString(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = '****';
    }
    return parsed.toString();
  } catch {
    return '[INVALID_DATABASE_URL]';
  }
}

/**
 * Strictly verifies that the target database connection string matches the
 * explicitly approved staging host and database name.
 * Halts execution immediately on missing variables, mismatches, or production keywords.
 * UNCONDITIONAL: Does NOT permit any production bypass or override flag.
 */
export function validateTargetHostAndDb(
  databaseUrl?: string,
  approvedHost?: string,
  approvedDbName?: string
): { targetHost: string; targetDb: string } {
  if (!databaseUrl || !databaseUrl.trim()) {
    throw new Error('[SAFETY BLOCK] DATABASE_URL is not set or empty.');
  }
  if (!approvedHost || !approvedHost.trim()) {
    throw new Error(
      '[SAFETY BLOCK] APPROVED_STAGING_DB_HOST is not set or empty. An explicit approved staging hostname is strictly required.'
    );
  }
  if (!approvedDbName || !approvedDbName.trim()) {
    throw new Error(
      '[SAFETY BLOCK] APPROVED_STAGING_DB_NAME is not set or empty. An explicit approved staging database name is strictly required.'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch (err: any) {
    throw new Error(`[SAFETY BLOCK] Invalid DATABASE_URL format: ${err.message}`);
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(
      `[SAFETY BLOCK] Invalid DATABASE_URL protocol '${parsed.protocol}'. Expected 'postgres:' or 'postgresql:'.`
    );
  }

  const targetHost = parsed.hostname.toLowerCase().trim();
  const normalizedApprovedHost = approvedHost.toLowerCase().trim();

  if (targetHost !== normalizedApprovedHost) {
    throw new Error(
      `[SAFETY BLOCK] Hostname mismatch! Target host: '${targetHost}', Approved staging host: '${normalizedApprovedHost}'. Aborting.`
    );
  }

  const rawDb = parsed.pathname.replace(/^\//, '').trim();
  const targetDb = decodeURIComponent(rawDb).toLowerCase();
  const normalizedApprovedDb = decodeURIComponent(approvedDbName).toLowerCase().trim();

  if (targetDb !== normalizedApprovedDb) {
    throw new Error(
      `[SAFETY BLOCK] Database name mismatch! Target database: '${targetDb}', Approved staging database: '${normalizedApprovedDb}'. Aborting.`
    );
  }

  // Strict unconditional production guard: Never allow production targets, zero overrides
  const isProdHost = targetHost.includes('prod') || targetHost.includes('production');
  const isProdDb = targetDb.includes('prod') || targetDb.includes('production');
  if (isProdHost || isProdDb) {
    throw new Error(
      `[SAFETY BLOCK] Target database ('${targetDb}' on '${targetHost}') contains production keywords ('prod'/'production'). This checker is strictly restricted to staging environments and cannot be run against production.`
    );
  }

  return { targetHost, targetDb };
}

/**
 * Evaluates the 4 separate target database states based on table presence,
 * product_digital_files presence, and Drizzle migration history.
 */
export function evaluateStagingState(
  tableCount: number,
  publicTables: string[],
  productDigitalFilesExists: boolean,
  hasDrizzleTable: boolean,
  migrations: DrizzleMigrationRecord[]
): StateEvaluationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // State 1: Fresh Empty Database
  if (
    tableCount === 0 &&
    !hasDrizzleTable &&
    !productDigitalFilesExists &&
    migrations.length === 0
  ) {
    return {
      state: 'FRESH_EMPTY_DB',
      isSafeToProceed: true,
      recommendation:
        "Target database is completely empty (0 public tables, no migration tracking). Safe to proceed with clean full baseline migration (0000 -> 0013) via 'npm run db:migrate:prod', followed by initial bootstrap ('npm run bootstrap:admin', 'npm run seed:categories').",
      reasons: ['Database contains 0 public tables.', 'No __drizzle_migrations table present.'],
      warnings: [],
    };
  }

  // State 2: Migration Baseline 0012
  const latestMigration = migrations.length > 0 ? migrations[migrations.length - 1] : null;
  const latestCreatedAt = latestMigration ? Number(latestMigration.created_at) : null;

  if (
    tableCount > 0 &&
    hasDrizzleTable &&
    migrations.length === BASELINE_0012_MIGRATION_COUNT &&
    latestCreatedAt === BASELINE_0012_LATEST_CREATED_AT &&
    !productDigitalFilesExists
  ) {
    return {
      state: 'MIGRATION_BASELINE_0012',
      isSafeToProceed: true,
      recommendation:
        "Target database is populated at the exact pre-feature baseline (13 migrations applied, up to 0012_purple_slayback). Table 'product_digital_files' does not yet exist. Safe to proceed with incremental migration 0013 via 'npm run db:migrate:prod'.",
      reasons: [
        `Exactly ${BASELINE_0012_MIGRATION_COUNT} migrations recorded.`,
        `Latest migration created_at is ${BASELINE_0012_LATEST_CREATED_AT} (${BASELINE_0012_LATEST_TAG}).`,
        "Table 'product_digital_files' is absent.",
      ],
      warnings: [],
    };
  }

  // State 3: Fully Migrated (0013)
  if (
    tableCount > 0 &&
    hasDrizzleTable &&
    migrations.length === FULLY_MIGRATED_0013_COUNT &&
    latestCreatedAt === FULLY_MIGRATED_0013_LATEST_CREATED_AT &&
    productDigitalFilesExists
  ) {
    return {
      state: 'FULLY_MIGRATED',
      isSafeToProceed: true,
      recommendation:
        "Target database already contains migration 0013 and table 'product_digital_files'. Schema is 100% synchronized with feat/r2-digital-storage. Zero migrations required; ready for staging integration testing.",
      reasons: [
        `All ${FULLY_MIGRATED_0013_COUNT} migrations recorded in __drizzle_migrations.`,
        `Latest migration created_at is ${FULLY_MIGRATED_0013_LATEST_CREATED_AT} (${FULLY_MIGRATED_0013_LATEST_TAG}).`,
        "Table 'product_digital_files' is present in public schema.",
      ],
      warnings: [],
    };
  }

  // State 4: Unexpected Schema or History (Anomalies / Drift -> FAILS CLOSED)
  if (tableCount > 0 && !hasDrizzleTable) {
    reasons.push(
      `Public schema contains ${tableCount} tables, but '__drizzle_migrations' table was not found (unmanaged schema drift).`
    );
  }

  if (productDigitalFilesExists && migrations.length <= BASELINE_0012_MIGRATION_COUNT) {
    reasons.push(
      `Table 'product_digital_files' already exists in the database, but Drizzle migration history is at count ${migrations.length} (out-of-band table creation or missing migration record).`
    );
  }

  if (!productDigitalFilesExists && migrations.length >= FULLY_MIGRATED_0013_COUNT) {
    reasons.push(
      `Drizzle migration history records migration 0013 as applied (${migrations.length} migrations), but table 'product_digital_files' does not exist in the public schema.`
    );
  }

  if (tableCount === 0 && hasDrizzleTable) {
    reasons.push(
      `Drizzle migration tracking table exists, but the public schema has 0 base tables.`
    );
  }

  if (
    migrations.length > 0 &&
    migrations.length !== BASELINE_0012_MIGRATION_COUNT &&
    migrations.length !== FULLY_MIGRATED_0013_COUNT
  ) {
    reasons.push(
      `Unexpected migration count: ${migrations.length} (expected 0 for fresh empty, ${BASELINE_0012_MIGRATION_COUNT} for baseline 0012, or ${FULLY_MIGRATED_0013_COUNT} for fully migrated).`
    );
  }

  if (
    migrations.length === BASELINE_0012_MIGRATION_COUNT &&
    latestCreatedAt !== BASELINE_0012_LATEST_CREATED_AT
  ) {
    reasons.push(
      `Migration count is ${BASELINE_0012_MIGRATION_COUNT}, but latest migration timestamp (${latestCreatedAt}) does not match expected 0012 baseline (${BASELINE_0012_LATEST_CREATED_AT}).`
    );
  }

  if (
    migrations.length === FULLY_MIGRATED_0013_COUNT &&
    latestCreatedAt !== FULLY_MIGRATED_0013_LATEST_CREATED_AT
  ) {
    reasons.push(
      `Migration count is ${FULLY_MIGRATED_0013_COUNT}, but latest migration timestamp (${latestCreatedAt}) does not match expected 0013 baseline (${FULLY_MIGRATED_0013_LATEST_CREATED_AT}).`
    );
  }

  if (reasons.length === 0) {
    reasons.push('Database schema configuration does not match any recognized standard state.');
  }

  return {
    state: 'UNEXPECTED_SCHEMA_OR_HISTORY',
    isSafeToProceed: false,
    recommendation:
      'Database schema or migration history is in an unexpected state. Automated execution is blocked. A database administrator must inspect the schema before migrations are executed.',
    reasons,
    warnings,
  };
}

/**
 * Runs the read-only preflight checker against PostgreSQL staging.
 * Enforces session-level read-only mode, queries version and identity with correct syntax,
 * inspects tables and migration history, and returns a structured diagnostic report.
 */
export async function runStagingPreflight(
  config?: PreflightConfig,
  clientOverride?: any
): Promise<PreflightReport> {
  const databaseUrl = config?.databaseUrl || process.env.DATABASE_URL;
  const approvedHost = config?.approvedHost || process.env.APPROVED_STAGING_DB_HOST;
  const approvedDbName = config?.approvedDbName || process.env.APPROVED_STAGING_DB_NAME;

  const sslMode = config?.sslMode || process.env.DB_SSL_MODE || 'require';
  const rejectUnauthorized =
    config?.rejectUnauthorized !== undefined
      ? config.rejectUnauthorized
      : process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

  // 1. Validate Target Host and Database Name (strictly staging only, no prod override)
  const { targetHost, targetDb } = validateTargetHostAndDb(
    databaseUrl,
    approvedHost,
    approvedDbName
  );

  // 2. Initialize PostgreSQL Client
  let client: Client;
  if (clientOverride) {
    client = clientOverride;
  } else {
    const clientConfig: ClientConfig = {
      connectionString: databaseUrl,
      ssl:
        sslMode === 'disable'
          ? false
          : {
              rejectUnauthorized,
            },
      connectionTimeoutMillis: 5000,
    };
    client = new Client(clientConfig);
    await client.connect();
  }

  const warnings: string[] = [];

  try {
    // 3. Enforce Read-Only Mode at the PostgreSQL session level
    await client.query('SET default_transaction_read_only = on;');
    await client.query('SET statement_timeout = 10000;');

    // 4. Query Database Identity & PostgreSQL Version
    // PostgreSQL syntax correction: Use single-quoted literal 'server_version_num' with cast ::integer
    const identityRes = await client.query(`
      SELECT
        current_database() AS database_name,
        current_user AS connected_user,
        inet_server_addr() AS server_ip,
        inet_server_port() AS server_port,
        version() AS full_version,
        current_setting('server_version_num')::integer AS server_version_num;
    `);

    const identityRow = identityRes.rows[0];
    const connectedDatabase = String(identityRow.database_name || '');
    const connectedUser = String(identityRow.connected_user || '');
    const serverIp = identityRow.server_ip ? String(identityRow.server_ip) : null;
    const serverPort = identityRow.server_port ? Number(identityRow.server_port) : null;
    const postgresVersion = String(identityRow.full_version || '');
    const serverVersionNum = Number(identityRow.server_version_num || 0);

    // Double-check: connected database must match approved database
    if (connectedDatabase.toLowerCase() !== targetDb.toLowerCase()) {
      throw new Error(
        `[SAFETY BLOCK] Connected database '${connectedDatabase}' differs from approved database '${targetDb}'. Aborting.`
      );
    }

    // Verify PostgreSQL version
    if (serverVersionNum < MIN_POSTGRES_VERSION_NUM) {
      throw new Error(
        `[SAFETY BLOCK] PostgreSQL version (${postgresVersion}, server_version_num: ${serverVersionNum}) is below minimum required version 15.0.0.`
      );
    }

    if (serverVersionNum < RECOMMENDED_POSTGRES_VERSION_NUM) {
      warnings.push(
        `PostgreSQL server_version_num is ${serverVersionNum} (PostgreSQL 15 detected). Supported, but PostgreSQL 16+ is recommended.`
      );
    }

    const databaseIdentity: DatabaseIdentity = {
      targetHost,
      targetDatabase: targetDb,
      connectedDatabase,
      connectedUser,
      serverIp,
      serverPort,
      postgresVersion,
      serverVersionNum,
    };

    // 5. Query Existing Public Tables
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `);
    const tables: string[] = tablesRes.rows.map((r: { table_name: string }) => r.table_name);
    const tableCount = tables.length;

    // 6. Query whether product_digital_files specifically exists
    const pdfExistsRes = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'product_digital_files'
          AND table_type = 'BASE TABLE'
      ) AS exists;
    `);
    const productDigitalFilesExists = Boolean(pdfExistsRes.rows[0]?.exists);

    const publicTables: SchemaInspection = {
      tableCount,
      tables,
      productDigitalFilesExists,
    };

    // 7. Query Drizzle Migration History
    const drizzleCheckRes = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'drizzle'
          AND table_name = '__drizzle_migrations'
      ) AS exists;
    `);
    const hasDrizzleTrackingTable = Boolean(drizzleCheckRes.rows[0]?.exists);

    let migrations: DrizzleMigrationRecord[] = [];
    if (hasDrizzleTrackingTable) {
      const migrationsRes = await client.query(`
        SELECT id, hash, created_at
        FROM "drizzle"."__drizzle_migrations"
        ORDER BY id ASC;
      `);
      migrations = migrationsRes.rows.map((r: any) => ({
        id: Number(r.id),
        hash: String(r.hash),
        created_at: r.created_at,
      }));
    }

    const latestMigration = migrations.length > 0 ? migrations[migrations.length - 1] : null;

    const migrationHistory: MigrationInspection = {
      hasDrizzleTrackingTable,
      appliedCount: migrations.length,
      latestMigrationId: latestMigration ? latestMigration.id : null,
      latestMigrationCreatedAt: latestMigration ? Number(latestMigration.created_at) : null,
      migrations,
    };

    // 8. Evaluate Overall Target State
    const evaluation = evaluateStagingState(
      tableCount,
      tables,
      productDigitalFilesExists,
      hasDrizzleTrackingTable,
      migrations
    );

    return {
      state: evaluation.state,
      isSafeToProceed: evaluation.isSafeToProceed,
      databaseIdentity,
      publicTables,
      migrationHistory,
      recommendation: evaluation.recommendation,
      reasons: evaluation.reasons,
      warnings: [...warnings, ...evaluation.warnings],
    };
  } finally {
    if (!clientOverride && client) {
      await client.end();
    }
  }
}

/**
 * Formats and prints the preflight report to stdout.
 * Guarantees zero secret/credential leakage.
 */
export function printReport(report: PreflightReport): void {
  console.log('\n================================================================');
  console.log('       POSTGRESQL STAGING READ-ONLY PREFLIGHT CHECK REPORT       ');
  console.log('================================================================');

  console.log('\n[DATABASE IDENTITY]');
  console.log(`  Target Host:          ${report.databaseIdentity.targetHost}`);
  console.log(`  Target Database:      ${report.databaseIdentity.targetDatabase}`);
  console.log(`  Connected Database:   ${report.databaseIdentity.connectedDatabase}`);
  console.log(`  Connected User:       ${report.databaseIdentity.connectedUser}`);
  console.log(
    `  Server Endpoint:      ${report.databaseIdentity.serverIp || 'n/a'}:${
      report.databaseIdentity.serverPort || 'n/a'
    }`
  );
  console.log(`  PostgreSQL Version:   ${report.databaseIdentity.postgresVersion}`);
  console.log(`  server_version_num:   ${report.databaseIdentity.serverVersionNum}`);

  console.log('\n[PUBLIC SCHEMA INSPECTION]');
  console.log(`  Public Table Count:   ${report.publicTables.tableCount}`);
  console.log(
    `  'product_digital_files': ${
      report.publicTables.productDigitalFilesExists ? 'EXISTS (Present)' : 'DOES NOT EXIST (Absent)'
    }`
  );
  if (report.publicTables.tables.length > 0) {
    console.log(`  Tables:               ${report.publicTables.tables.join(', ')}`);
  }

  console.log('\n[DRIZZLE MIGRATION HISTORY]');
  console.log(
    `  Migration Tracking:   ${
      report.migrationHistory.hasDrizzleTrackingTable
        ? '__drizzle_migrations present'
        : 'None (__drizzle_migrations absent)'
    }`
  );
  console.log(`  Applied Migrations:   ${report.migrationHistory.appliedCount}`);
  if (report.migrationHistory.latestMigrationCreatedAt) {
    console.log(
      `  Latest Migration ID:  ${report.migrationHistory.latestMigrationId} (created_at: ${report.migrationHistory.latestMigrationCreatedAt})`
    );
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`TARGET STATE: [${report.state}]`);
  console.log(`Safe to Proceed: ${report.isSafeToProceed ? 'YES (PASS)' : 'NO (BLOCKED - FAILS CLOSED)'}`);
  console.log('----------------------------------------------------------------');

  if (report.reasons.length > 0) {
    console.log('\nEvaluation Factors:');
    report.reasons.forEach((r) => console.log(`  - ${r}`));
  }

  if (report.warnings.length > 0) {
    console.log('\nWarnings:');
    report.warnings.forEach((w) => console.log(`  ! ${w}`));
  }

  console.log('\nRecommended Next Action:');
  console.log(`  ${report.recommendation}`);
  console.log('================================================================\n');
}

// CLI entry point
if (require.main === module) {
  (async () => {
    try {
      const report = await runStagingPreflight();
      printReport(report);
      if (!report.isSafeToProceed) {
        process.exit(1);
      }
      process.exit(0);
    } catch (err: any) {
      console.error('\n================================================================');
      console.error('      POSTGRESQL STAGING PREFLIGHT CHECK: ABORTED (BLOCKED)     ');
      console.error('================================================================');
      console.error(err.message || err);
      console.error('================================================================\n');
      process.exit(1);
    }
  })();
}
