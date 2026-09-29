import { pgTable, uuid, varchar, numeric, text, timestamp, index } from 'drizzle-orm/pg-core';
import { wallets } from './wallets';
import { users } from './users';

/**
 * Wallet Ledger Entries Table Schema (PostgreSQL)
 *
 * Immutable ledger of every financial mutation on a customer wallet.
 * - Historical source of truth.
 * - Records cannot be updated or deleted in normal operations.
 * - Corrections are made strictly via compensating/reversal entries.
 */
export const walletLedgerEntries = pgTable(
  'wallet_ledger_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entryType: varchar('entry_type', { length: 30 }).notNull(), // 'credit' | 'debit' | 'refund' | 'adjustment' | 'reversal'
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    balanceBefore: numeric('balance_before', { precision: 14, scale: 2 }).notNull(),
    balanceAfter: numeric('balance_after', { precision: 14, scale: 2 }).notNull(),
    referenceType: varchar('reference_type', { length: 50 }).notNull(), // 'deposit' | 'order' | 'refund' | 'adjustment' | 'reversal'
    referenceId: varchar('reference_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
    description: text('description').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    walletIdIdx: index('wallet_ledger_wallet_id_idx').on(table.walletId),
    createdAtIdx: index('wallet_ledger_created_at_idx').on(table.createdAt),
    refIdx: index('wallet_ledger_ref_idx').on(table.referenceType, table.referenceId),
  })
);

export type WalletLedgerEntry = typeof walletLedgerEntries.$inferSelect;
export type NewWalletLedgerEntry = typeof walletLedgerEntries.$inferInsert;
