import { pgTable, uuid, varchar, numeric, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { resellerWallets } from './reseller-wallets';
import { resellers } from './resellers';

export const resellerWalletLedgerEntries = pgTable(
  'reseller_wallet_ledger_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resellerWalletId: uuid('reseller_wallet_id')
      .notNull()
      .references(() => resellerWallets.id, { onDelete: 'cascade' }),
    resellerId: uuid('reseller_id')
      .notNull()
      .references(() => resellers.id, { onDelete: 'cascade' }),
    entryType: varchar('entry_type', { length: 30 }).notNull(), // 'credit' | 'debit' | 'refund' | 'adjustment'
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    balanceBefore: numeric('balance_before', { precision: 14, scale: 2 }).notNull(),
    balanceAfter: numeric('balance_after', { precision: 14, scale: 2 }).notNull(),
    referenceType: varchar('reference_type', { length: 50 }).notNull(), // 'order' | 'refund' | 'adjustment' | 'deposit'
    referenceId: varchar('reference_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).unique().notNull(),
    description: text('description').notNull(),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('rw_ledger_wallet_id_idx').on(table.resellerWalletId),
    index('rw_ledger_created_at_idx').on(table.createdAt),
    index('rw_ledger_ref_idx').on(table.referenceType, table.referenceId),
    uniqueIndex('rw_ledger_idempotency_idx').on(table.idempotencyKey),
  ]
);

export type ResellerWalletLedgerEntry = typeof resellerWalletLedgerEntries.$inferSelect;
export type NewResellerWalletLedgerEntry = typeof resellerWalletLedgerEntries.$inferInsert;
