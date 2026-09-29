# Database Backup Readiness & Restore Procedure

## 1. Backup Configuration

### Automated Daily Backups
To ensure point-in-time recovery and disaster recovery capabilities, daily logical backups should be automated using `pg_dump`. 
For physical/continuous archiving (Point-In-Time Recovery), Write-Ahead Log (WAL) archiving must be enabled via `pg_basebackup` and tools like `pgBackRest` or `wal-g`.

### Point-in-Time Recovery (PITR) Setup
Ensure your PostgreSQL `postgresql.conf` is configured for WAL archiving:
```ini
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f' # Replace with cloud storage command (e.g., AWS S3, Google Cloud Storage)
```

### Backup Retention
- **Daily Backups (Logical):** Retain for 30 days.
- **WAL Archives (Continuous):** Retain for 7 days to allow point-in-time recovery.
- **Monthly Backups:** Retain for 1 year for compliance.

---

## 2. Restore Procedure

This procedure covers a complete recovery in a production disaster scenario.

### Step 1: PostgreSQL Backup Retrieval
Identify the desired point-in-time or the latest daily snapshot. Retrieve the snapshot file (e.g., `backup.sql` or physical archive) to a secure restoration environment.

### Step 2: Database Restore
To prevent accidental data corruption, restore the database to a *new* instance or an isolated database.

**Logical Restore:**
```bash
pg_restore -d new_db_name -1 backup.dump
```

**Physical Restore (PITR):**
Restore the base backup, update `recovery.conf` (or `postgresql.auto.conf` in Postgres 12+) with the `restore_command` and `recovery_target_time`, then start the PostgreSQL service.

### Step 3: Migration Verification
Before starting the backend, verify that the schema matches the codebase by checking the Drizzle migration records:
```bash
npx drizzle-kit status
```
If migrations are pending, evaluate whether they were applied before the snapshot was taken.

### Step 4: Backend Startup
Start the backend application connected to the restored database in a restricted mode (e.g., disable external webhooks and cron workers temporarily).
```bash
npm run start
```

### Step 5: Integrity Verification
Run manual or automated scripts to verify business continuity:
1. **Wallet Integrity:** Check for wallet ledger mismatch using the wallet reconciliation endpoints/scripts.
2. **Order State:** Ensure orders in `PROCESSING` state align with the provider's remote state.
3. **Payment Sync:** Compare recent `payment_transactions` with the Razorpay/Gateway dashboard.

---

## 3. Migration Recovery Strategy
In case a bad migration corrupts data:
1. Immediately stop the backend to prevent further writes.
2. Restore the pre-migration database snapshot.
3. Revert the problematic codebase commit.
4. Restart the backend and re-run webhooks that were received during the downtime (idempotency will prevent duplicates).
