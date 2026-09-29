import { pgTable, uuid, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * Wallets Table Schema (PostgreSQL)
 *
 * Represents ONE central marketplace wallet per customer.
 * - Enforces unique constraint on user_id (one user = one central wallet).
 * - Balance uses NUMERIC(14, 2) exact decimal representation.
 * - Cached balance for fast reads; historical truth is the immutable ledger.
 */
export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  balance: numeric('balance', { precision: 14, scale: 2 }).notNull().default('0.00'),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'locked' | 'disabled'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
