import assert from 'assert';
import {
  validateTargetHostAndDb,
  maskConnectionString,
  evaluateStagingState,
  runStagingPreflight,
  BASELINE_0012_MIGRATION_COUNT,
  BASELINE_0012_LATEST_CREATED_AT,
  FULLY_MIGRATED_0013_COUNT,
  FULLY_MIGRATED_0013_LATEST_CREATED_AT,
  DrizzleMigrationRecord,
} from '../src/scripts/verify-staging-db';

async function runTests() {
  console.log('================================================================');
  console.log(' STARTING STAGING DATABASE PREFLIGHT CHECKER UNIT TEST SUITE');
  console.log('================================================================\n');

  let testCount = 0;
  function test(name: string, fn: () => void | Promise<void>) {
    testCount++;
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as Promise<void>).then(() => {
          console.log(`[PASS] [${testCount}] ${name}`);
        });
      }
      console.log(`[PASS] [${testCount}] ${name}`);
      return Promise.resolve();
    } catch (err: any) {
      console.error(`[FAIL] [${testCount}] ${name}:`, err.message);
      throw err;
    }
  }

  // --- SECTION 1: URL & HOSTNAME / DATABASE VALIDATION TESTS ---
  console.log('--- 1. HOSTNAME & DATABASE IDENTITY VALIDATION GUARDS ---');

  await test('validateTargetHostAndDb: throws if DATABASE_URL is missing', () => {
    assert.throws(
      () => validateTargetHostAndDb('', 'staging-host', 'staging_db'),
      /DATABASE_URL is not set or empty/
    );
  });

  await test('validateTargetHostAndDb: throws if APPROVED_STAGING_DB_HOST is missing', () => {
    assert.throws(
      () => validateTargetHostAndDb('postgresql://user:pass@staging-host:5432/staging_db', '', 'staging_db'),
      /APPROVED_STAGING_DB_HOST is not set or empty/
    );
  });

  await test('validateTargetHostAndDb: throws if APPROVED_STAGING_DB_NAME is missing', () => {
    assert.throws(
      () => validateTargetHostAndDb('postgresql://user:pass@staging-host:5432/staging_db', 'staging-host', ''),
      /APPROVED_STAGING_DB_NAME is not set or empty/
    );
  });

  await test('validateTargetHostAndDb: throws if protocol is not postgres/postgresql', () => {
    assert.throws(
      () => validateTargetHostAndDb('mysql://user:pass@staging-host:3306/staging_db', 'staging-host', 'staging_db'),
      /Invalid DATABASE_URL protocol/
    );
  });

  await test('validateTargetHostAndDb: throws if target hostname does not match approved host', () => {
    assert.throws(
      () =>
        validateTargetHostAndDb(
          'postgresql://user:pass@wrong-host.internal:5432/staging_db',
          'staging-correct.internal',
          'staging_db'
        ),
      /Hostname mismatch!/
    );
  });

  await test('validateTargetHostAndDb: throws if target database name does not match approved database', () => {
    assert.throws(
      () =>
        validateTargetHostAndDb(
          'postgresql://user:pass@staging-host.internal:5432/dev_marketplace',
          'staging-host.internal',
          'staging_marketplace'
        ),
      /Database name mismatch!/
    );
  });

  await test('validateTargetHostAndDb: unconditionally blocks host containing "prod" (no override permitted)', () => {
    assert.throws(
      () =>
        validateTargetHostAndDb(
          'postgresql://user:pass@prod-db.internal:5432/hostmarket_staging',
          'prod-db.internal',
          'hostmarket_staging'
        ),
      /Target database .* contains production keywords/
    );
  });

  await test('validateTargetHostAndDb: unconditionally blocks db name containing "production" (no override permitted)', () => {
    assert.throws(
      () =>
        validateTargetHostAndDb(
          'postgresql://user:pass@staging-db.internal:5432/production_marketplace',
          'staging-db.internal',
          'production_marketplace'
        ),
      /Target database .* contains production keywords/
    );
  });

  await test('validateTargetHostAndDb: permits valid matching staging host and database (case-insensitive & trimmed)', () => {
    const result = validateTargetHostAndDb(
      'postgresql://user:pass@STAGING-HOST.internal:5432/STAGING_MARKETPLACE',
      ' staging-host.internal ',
      ' staging_marketplace '
    );
    assert.strictEqual(result.targetHost, 'staging-host.internal');
    assert.strictEqual(result.targetDb, 'staging_marketplace');
  });

  // --- SECTION 2: CREDENTIAL MASKING TESTS ---
  console.log('\n--- 2. CREDENTIAL MASKING & LOG SANITIZATION ---');

  await test('maskConnectionString: masks secret password in connection string', () => {
    const masked = maskConnectionString('postgresql://staging_user:SuperSecretPassword123@staging-host:5432/staging_db');
    assert.strictEqual(masked, 'postgresql://staging_user:****@staging-host:5432/staging_db');
    assert(!masked.includes('SuperSecretPassword123'));
  });

  await test('maskConnectionString: preserves connection string without password safely', () => {
    const masked = maskConnectionString('postgresql://staging_user@staging-host:5432/staging_db');
    assert.strictEqual(masked, 'postgresql://staging_user@staging-host:5432/staging_db');
  });

  await test('maskConnectionString: returns safe placeholder on malformed URL without throwing', () => {
    const masked = maskConnectionString('not-a-valid-url');
    assert.strictEqual(masked, '[INVALID_DATABASE_URL]');
  });

  // --- SECTION 3: DATABASE STATE EVALUATION TESTS ---
  console.log('\n--- 3. DATABASE STATE EVALUATION (4 DISTINCT STATES & FAIL CLOSED) ---');

  // Helper to build mock migrations
  function buildMockMigrations(count: number, latestCreatedAt: number): DrizzleMigrationRecord[] {
    const records: DrizzleMigrationRecord[] = [];
    for (let i = 0; i < count; i++) {
      const createdAt = i === count - 1 ? latestCreatedAt : 1790176339243 + i * 1000;
      records.push({
        id: i + 1,
        hash: `mock_hash_${i}`,
        created_at: String(createdAt),
      });
    }
    return records;
  }

  await test('evaluateStagingState: State 1 -> FRESH_EMPTY_DB (isSafeToProceed = true)', () => {
    const result = evaluateStagingState(0, [], false, false, []);
    assert.strictEqual(result.state, 'FRESH_EMPTY_DB');
    assert.strictEqual(result.isSafeToProceed, true);
    assert(result.recommendation.includes('clean full baseline migration'));
    assert(result.recommendation.includes('bootstrap:admin'));
    assert(result.recommendation.includes('seed:categories'));
  });

  await test('evaluateStagingState: State 2 -> MIGRATION_BASELINE_0012 (isSafeToProceed = true)', () => {
    const migrations = buildMockMigrations(BASELINE_0012_MIGRATION_COUNT, BASELINE_0012_LATEST_CREATED_AT);
    const tables = ['users', 'wallets', 'products', 'orders', 'product_provider_offers'];
    const result = evaluateStagingState(tables.length, tables, false, true, migrations);

    assert.strictEqual(result.state, 'MIGRATION_BASELINE_0012');
    assert.strictEqual(result.isSafeToProceed, true);
    assert(result.recommendation.includes('incremental migration 0013'));
  });

  await test('evaluateStagingState: State 3 -> FULLY_MIGRATED (isSafeToProceed = true)', () => {
    const migrations = buildMockMigrations(FULLY_MIGRATED_0013_COUNT, FULLY_MIGRATED_0013_LATEST_CREATED_AT);
    const tables = ['users', 'wallets', 'products', 'orders', 'product_provider_offers', 'product_digital_files'];
    const result = evaluateStagingState(tables.length, tables, true, true, migrations);

    assert.strictEqual(result.state, 'FULLY_MIGRATED');
    assert.strictEqual(result.isSafeToProceed, true);
    assert(result.recommendation.includes('Zero migrations required'));
  });

  await test('evaluateStagingState: State 4A -> UNEXPECTED: tables exist but no drizzle table (fails closed)', () => {
    const tables = ['users', 'products'];
    const result = evaluateStagingState(tables.length, tables, false, false, []);

    assert.strictEqual(result.state, 'UNEXPECTED_SCHEMA_OR_HISTORY');
    assert.strictEqual(result.isSafeToProceed, false);
    assert(result.reasons.some((r) => r.includes('unmanaged schema drift')));
  });

  await test('evaluateStagingState: State 4B -> UNEXPECTED: product_digital_files exists before 0013 migration (fails closed)', () => {
    const migrations = buildMockMigrations(BASELINE_0012_MIGRATION_COUNT, BASELINE_0012_LATEST_CREATED_AT);
    const tables = ['users', 'product_digital_files'];
    const result = evaluateStagingState(tables.length, tables, true, true, migrations);

    assert.strictEqual(result.state, 'UNEXPECTED_SCHEMA_OR_HISTORY');
    assert.strictEqual(result.isSafeToProceed, false);
    assert(result.reasons.some((r) => r.includes('out-of-band table creation')));
  });

  await test('evaluateStagingState: State 4C -> UNEXPECTED: 14 migrations recorded but table missing (fails closed)', () => {
    const migrations = buildMockMigrations(FULLY_MIGRATED_0013_COUNT, FULLY_MIGRATED_0013_LATEST_CREATED_AT);
    const tables = ['users', 'products']; // product_digital_files is missing
    const result = evaluateStagingState(tables.length, tables, false, true, migrations);

    assert.strictEqual(result.state, 'UNEXPECTED_SCHEMA_OR_HISTORY');
    assert.strictEqual(result.isSafeToProceed, false);
    assert(result.reasons.some((r) => r.includes('does not exist in the public schema')));
  });

  await test('evaluateStagingState: State 4D -> UNEXPECTED: partial migration sequence (fails closed)', () => {
    const migrations = buildMockMigrations(7, 1790625670079);
    const tables = ['users', 'wallets'];
    const result = evaluateStagingState(tables.length, tables, false, true, migrations);

    assert.strictEqual(result.state, 'UNEXPECTED_SCHEMA_OR_HISTORY');
    assert.strictEqual(result.isSafeToProceed, false);
    assert(result.reasons.some((r) => r.includes('Unexpected migration count: 7')));
  });

  await test('evaluateStagingState: State 4E -> UNEXPECTED: 13 migrations but latest timestamp mismatch (fails closed)', () => {
    const migrations = buildMockMigrations(BASELINE_0012_MIGRATION_COUNT, 9999999999999);
    const tables = ['users', 'products'];
    const result = evaluateStagingState(tables.length, tables, false, true, migrations);

    assert.strictEqual(result.state, 'UNEXPECTED_SCHEMA_OR_HISTORY');
    assert.strictEqual(result.isSafeToProceed, false);
    assert(result.reasons.some((r) => r.includes('does not match expected 0012 baseline')));
  });

  // --- SECTION 4: POSTGRESQL SYNTAX & READ-ONLY MOCK PROBE TESTS ---
  console.log('\n--- 4. POSTGRESQL SYNTAX & READ-ONLY MOCK PROBE VERIFICATION ---');

  function createMockPgClient(options: {
    databaseName?: string;
    serverVersionNum?: number;
    postgresVersion?: string;
    tableCount?: number;
    tables?: string[];
    productDigitalFilesExists?: boolean;
    hasDrizzleTable?: boolean;
    migrations?: DrizzleMigrationRecord[];
  }) {
    const executedQueries: string[] = [];

    const dbName = options.databaseName || 'staging_marketplace';
    const verNum = options.serverVersionNum !== undefined ? options.serverVersionNum : 160002;
    const fullVer = options.postgresVersion || 'PostgreSQL 16.2 on x86_64-pc-linux-gnu';
    const tableList = options.tables || [];
    const pdfExists = options.productDigitalFilesExists ?? false;
    const drizzleExists = options.hasDrizzleTable ?? false;
    const migrationList = options.migrations || [];

    return {
      executedQueries,
      async query(sqlText: string) {
        executedQueries.push(sqlText.trim());

        // 1. Session safety commands
        if (sqlText.includes('SET default_transaction_read_only = on;')) {
          return { rows: [] };
        }
        if (sqlText.includes('SET statement_timeout = 10000;')) {
          return { rows: [] };
        }

        // 2. Database identity & PostgreSQL version check
        if (sqlText.includes("current_setting('server_version_num')::integer")) {
          return {
            rows: [
              {
                database_name: dbName,
                connected_user: 'staging_user',
                server_ip: '10.0.0.5',
                server_port: 5432,
                full_version: fullVer,
                serverVersionNum: verNum,
                server_version_num: verNum,
              },
            ],
          };
        }

        // 3. Public tables check
        if (sqlText.includes("WHERE table_schema = 'public'") && sqlText.includes("ORDER BY table_name ASC;")) {
          return {
            rows: tableList.map((t) => ({ table_name: t })),
          };
        }

        // 4. product_digital_files existence check
        if (sqlText.includes("table_name = 'product_digital_files'")) {
          return {
            rows: [{ exists: pdfExists }],
          };
        }

        // 5. drizzle.__drizzle_migrations table check
        if (sqlText.includes("table_name = '__drizzle_migrations'")) {
          return {
            rows: [{ exists: drizzleExists }],
          };
        }

        // 6. drizzle migrations records query
        if (sqlText.includes('FROM "drizzle"."__drizzle_migrations"')) {
          return {
            rows: migrationList,
          };
        }

        throw new Error(`Unexpected query in mock: ${sqlText}`);
      },
      async end() {
        // noop
      },
    };
  }

  await test('runStagingPreflight: enforces read-only session and uses correct current_setting syntax', async () => {
    const mockClient = createMockPgClient({
      tableCount: 0,
      tables: [],
      productDigitalFilesExists: false,
      hasDrizzleTable: false,
      migrations: [],
    });

    const report = await runStagingPreflight(
      {
        databaseUrl: 'postgresql://staging_user:pass@staging-host.internal:5432/staging_marketplace',
        approvedHost: 'staging-host.internal',
        approvedDbName: 'staging_marketplace',
      },
      mockClient
    );

    // Verify session commands
    assert(mockClient.executedQueries.some((q) => q.includes('SET default_transaction_read_only = on;')));
    assert(mockClient.executedQueries.some((q) => q.includes('SET statement_timeout = 10000;')));

    // Verify corrected PostgreSQL syntax query
    const identityQuery = mockClient.executedQueries.find((q) => q.includes('current_setting'));
    assert(identityQuery, 'Identity query must be executed');
    assert(
      identityQuery.includes("current_setting('server_version_num')::integer"),
      "Must use single quotes 'server_version_num' with cast ::integer"
    );
    assert(
      !identityQuery.includes('"server_version_num"'),
      'Must NOT use double quotes "server_version_num" in current_setting'
    );

    assert.strictEqual(report.state, 'FRESH_EMPTY_DB');
    assert.strictEqual(report.isSafeToProceed, true);
  });

  await test('runStagingPreflight: throws if PostgreSQL version is below 15 (e.g. 14.1)', async () => {
    const mockClient = createMockPgClient({
      serverVersionNum: 140001,
      postgresVersion: 'PostgreSQL 14.1 on x86_64',
    });

    await assert.rejects(
      async () => {
        await runStagingPreflight(
          {
            databaseUrl: 'postgresql://staging_user:pass@staging-host.internal:5432/staging_marketplace',
            approvedHost: 'staging-host.internal',
            approvedDbName: 'staging_marketplace',
          },
          mockClient
        );
      },
      /is below minimum required version 15.0.0/
    );
  });

  await test('runStagingPreflight: adds warning if PostgreSQL version is 15.x (< 160000)', async () => {
    const mockClient = createMockPgClient({
      serverVersionNum: 150005,
      postgresVersion: 'PostgreSQL 15.5 on x86_64',
    });

    const report = await runStagingPreflight(
      {
        databaseUrl: 'postgresql://staging_user:pass@staging-host.internal:5432/staging_marketplace',
        approvedHost: 'staging-host.internal',
        approvedDbName: 'staging_marketplace',
      },
      mockClient
    );

    assert(report.warnings.some((w) => w.includes('PostgreSQL 15 detected')));
  });

  await test('runStagingPreflight: throws if connected database returned by server does not match approved database', async () => {
    const mockClient = createMockPgClient({
      databaseName: 'different_db_name',
    });

    await assert.rejects(
      async () => {
        await runStagingPreflight(
          {
            databaseUrl: 'postgresql://staging_user:pass@staging-host.internal:5432/staging_marketplace',
            approvedHost: 'staging-host.internal',
            approvedDbName: 'staging_marketplace',
          },
          mockClient
        );
      },
      /differs from approved database/
    );
  });

  await test('runStagingPreflight: end-to-end simulated baseline 0012 run returns MIGRATION_BASELINE_0012', async () => {
    const mockClient = createMockPgClient({
      tables: ['users', 'wallets', 'products', 'orders', 'product_provider_offers'],
      productDigitalFilesExists: false,
      hasDrizzleTable: true,
      migrations: buildMockMigrations(BASELINE_0012_MIGRATION_COUNT, BASELINE_0012_LATEST_CREATED_AT),
    });

    const report = await runStagingPreflight(
      {
        databaseUrl: 'postgresql://staging_user:pass@staging-host.internal:5432/staging_marketplace',
        approvedHost: 'staging-host.internal',
        approvedDbName: 'staging_marketplace',
      },
      mockClient
    );

    assert.strictEqual(report.state, 'MIGRATION_BASELINE_0012');
    assert.strictEqual(report.isSafeToProceed, true);
    assert.strictEqual(report.publicTables.productDigitalFilesExists, false);
    assert.strictEqual(report.migrationHistory.appliedCount, 13);
  });

  await test('runStagingPreflight: end-to-end simulated fully migrated run returns FULLY_MIGRATED', async () => {
    const mockClient = createMockPgClient({
      tables: ['users', 'wallets', 'products', 'orders', 'product_provider_offers', 'product_digital_files'],
      productDigitalFilesExists: true,
      hasDrizzleTable: true,
      migrations: buildMockMigrations(FULLY_MIGRATED_0013_COUNT, FULLY_MIGRATED_0013_LATEST_CREATED_AT),
    });

    const report = await runStagingPreflight(
      {
        databaseUrl: 'postgresql://staging_user:pass@staging-host.internal:5432/staging_marketplace',
        approvedHost: 'staging-host.internal',
        approvedDbName: 'staging_marketplace',
      },
      mockClient
    );

    assert.strictEqual(report.state, 'FULLY_MIGRATED');
    assert.strictEqual(report.isSafeToProceed, true);
    assert.strictEqual(report.publicTables.productDigitalFilesExists, true);
    assert.strictEqual(report.migrationHistory.appliedCount, 14);
  });

  console.log('\n================================================================');
  console.log(` ALL ${testCount} UNIT TESTS PASSED WITH 100% SUCCESS!`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\nUNIT TESTS FAILED:', err);
  process.exit(1);
});
