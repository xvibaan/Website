"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletLedgerEntries = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const wallets_1 = require("./wallets");
const users_1 = require("./users");
/**
 * Wallet Ledger Entries Table Schema (PostgreSQL)
 *
 * Immutable ledger of every financial mutation on a customer wallet.
 * - Historical source of truth.
 * - Records cannot be updated or deleted in normal operations.
 * - Corrections are made strictly via compensating/reversal entries.
 */
exports.walletLedgerEntries = (0, pg_core_1.pgTable)('wallet_ledger_entries', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    walletId: (0, pg_core_1.uuid)('wallet_id')
        .notNull()
        .references(() => wallets_1.wallets.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_1.users.id, { onDelete: 'cascade' }),
    entryType: (0, pg_core_1.varchar)('entry_type', { length: 30 }).notNull(), // 'credit' | 'debit' | 'refund' | 'adjustment' | 'reversal'
    amount: (0, pg_core_1.numeric)('amount', { precision: 14, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).notNull().default('INR'),
    balanceBefore: (0, pg_core_1.numeric)('balance_before', { precision: 14, scale: 2 }).notNull(),
    balanceAfter: (0, pg_core_1.numeric)('balance_after', { precision: 14, scale: 2 }).notNull(),
    referenceType: (0, pg_core_1.varchar)('reference_type', { length: 50 }).notNull(), // 'deposit' | 'order' | 'refund' | 'adjustment' | 'reversal'
    referenceId: (0, pg_core_1.varchar)('reference_id', { length: 255 }),
    idempotencyKey: (0, pg_core_1.varchar)('idempotency_key', { length: 255 }).unique(),
    description: (0, pg_core_1.text)('description').notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => users_1.users.id, { onDelete: 'set null' }),
    metadata: (0, pg_core_1.text)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    walletIdIdx: (0, pg_core_1.index)('wallet_ledger_wallet_id_idx').on(table.walletId),
    createdAtIdx: (0, pg_core_1.index)('wallet_ledger_created_at_idx').on(table.createdAt),
    refIdx: (0, pg_core_1.index)('wallet_ledger_ref_idx').on(table.referenceType, table.referenceId),
}));
