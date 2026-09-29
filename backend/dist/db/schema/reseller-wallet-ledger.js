"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resellerWalletLedgerEntries = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const reseller_wallets_1 = require("./reseller-wallets");
const resellers_1 = require("./resellers");
exports.resellerWalletLedgerEntries = (0, pg_core_1.pgTable)('reseller_wallet_ledger_entries', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    resellerWalletId: (0, pg_core_1.uuid)('reseller_wallet_id')
        .notNull()
        .references(() => reseller_wallets_1.resellerWallets.id, { onDelete: 'cascade' }),
    resellerId: (0, pg_core_1.uuid)('reseller_id')
        .notNull()
        .references(() => resellers_1.resellers.id, { onDelete: 'cascade' }),
    entryType: (0, pg_core_1.varchar)('entry_type', { length: 30 }).notNull(), // 'credit' | 'debit' | 'refund' | 'adjustment'
    amount: (0, pg_core_1.numeric)('amount', { precision: 14, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).notNull().default('INR'),
    balanceBefore: (0, pg_core_1.numeric)('balance_before', { precision: 14, scale: 2 }).notNull(),
    balanceAfter: (0, pg_core_1.numeric)('balance_after', { precision: 14, scale: 2 }).notNull(),
    referenceType: (0, pg_core_1.varchar)('reference_type', { length: 50 }).notNull(), // 'order' | 'refund' | 'adjustment' | 'deposit'
    referenceId: (0, pg_core_1.varchar)('reference_id', { length: 255 }),
    idempotencyKey: (0, pg_core_1.varchar)('idempotency_key', { length: 255 }).unique().notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    metadata: (0, pg_core_1.text)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('rw_ledger_wallet_id_idx').on(table.resellerWalletId),
    (0, pg_core_1.index)('rw_ledger_created_at_idx').on(table.createdAt),
    (0, pg_core_1.index)('rw_ledger_ref_idx').on(table.referenceType, table.referenceId),
    (0, pg_core_1.uniqueIndex)('rw_ledger_idempotency_idx').on(table.idempotencyKey),
]);
