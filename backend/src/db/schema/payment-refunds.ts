import { pgTable, uuid, varchar, numeric, timestamp, text, index } from 'drizzle-orm/pg-core';
import { paymentTransactions } from './payment-transactions';

export const paymentRefunds = pgTable(
  'payment_refunds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    paymentTransactionId: uuid('payment_transaction_id')
      .notNull()
      .references(() => paymentTransactions.id, { onDelete: 'cascade' }),
    gatewayRefundId: varchar('gateway_refund_id', { length: 255 }),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    status: varchar('status', { length: 30 }).notNull().default('PENDING'),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('payment_refunds_tx_id_idx').on(table.paymentTransactionId),
  ]
);

export type PaymentRefund = typeof paymentRefunds.$inferSelect;
export type NewPaymentRefund = typeof paymentRefunds.$inferInsert;
