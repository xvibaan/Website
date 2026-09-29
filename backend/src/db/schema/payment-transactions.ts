import { pgTable, uuid, varchar, numeric, timestamp, text, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { wallets } from './wallets';

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id').references(() => wallets.id, { onDelete: 'set null' }),
    gateway: varchar('gateway', { length: 50 }).notNull(),
    gatewayPaymentId: varchar('gateway_payment_id', { length: 255 }),
    gatewayOrderId: varchar('gateway_order_id', { length: 255 }),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    status: varchar('status', { length: 30 }).notNull().default('PENDING'),
    purpose: varchar('purpose', { length: 50 }).notNull().default('WALLET_RECHARGE'),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
    failureCode: varchar('failure_code', { length: 100 }),
    failureReason: text('failure_reason'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
  },
  (table) => [
    index('payment_tx_user_id_idx').on(table.userId),
    index('payment_tx_gateway_ref_idx').on(table.gateway, table.gatewayPaymentId),
    index('payment_tx_status_idx').on(table.status),
    uniqueIndex('payment_tx_idempotency_key_idx').on(table.idempotencyKey),
  ]
);

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;
