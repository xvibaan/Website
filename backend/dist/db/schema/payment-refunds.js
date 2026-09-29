"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRefunds = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const payment_transactions_1 = require("./payment-transactions");
exports.paymentRefunds = (0, pg_core_1.pgTable)('payment_refunds', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    paymentTransactionId: (0, pg_core_1.uuid)('payment_transaction_id')
        .notNull()
        .references(() => payment_transactions_1.paymentTransactions.id, { onDelete: 'cascade' }),
    gatewayRefundId: (0, pg_core_1.varchar)('gateway_refund_id', { length: 255 }),
    amount: (0, pg_core_1.numeric)('amount', { precision: 14, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).notNull().default('INR'),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).notNull().default('PENDING'),
    reason: (0, pg_core_1.text)('reason'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
}, (table) => [
    (0, pg_core_1.index)('payment_refunds_tx_id_idx').on(table.paymentTransactionId),
]);
