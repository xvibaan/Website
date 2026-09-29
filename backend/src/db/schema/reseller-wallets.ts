import { pgTable, uuid, varchar, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { resellers } from './resellers';

export const resellerWallets = pgTable('reseller_wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  resellerId: uuid('reseller_id')
    .notNull()
    .unique()
    .references(() => resellers.id, { onDelete: 'cascade' }),
  balance: numeric('balance', { precision: 14, scale: 2 }).notNull().default('0.00'),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'locked' | 'disabled'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type ResellerWallet = typeof resellerWallets.$inferSelect;
export type NewResellerWallet = typeof resellerWallets.$inferInsert;
