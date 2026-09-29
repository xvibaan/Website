"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentTransactions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
const wallets_1 = require("./wallets");
exports.paymentTransactions = (0, pg_core_1.pgTable)('payment_transactions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_1.users.id, { onDelete: 'cascade' }),
    walletId: (0, pg_core_1.uuid)('wallet_id').references(() => wallets_1.wallets.id, { onDelete: 'set null' }),
    gateway: (0, pg_core_1.varchar)('gateway', { length: 50 }).notNull(),
    gatewayPaymentId: (0, pg_core_1.varchar)('gateway_payment_id', { length: 255 }),
    gatewayOrderId: (0, pg_core_1.varchar)('gateway_order_id', { length: 255 }),
    amount: (0, pg_core_1.numeric)('amount', { precision: 14, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).notNull().default('INR'),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).notNull().default('PENDING'),
    purpose: (0, pg_core_1.varchar)('purpose', { length: 50 }).notNull().default('WALLET_RECHARGE'),
    idempotencyKey: (0, pg_core_1.varchar)('idempotency_key', { length: 255 }).unique(),
    failureCode: (0, pg_core_1.varchar)('failure_code', { length: 100 }),
    failureReason: (0, pg_core_1.text)('failure_reason'),
    metadata: (0, pg_core_1.text)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
        .notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    refundedAt: (0, pg_core_1.timestamp)('refunded_at', { withTimezone: true }),
}, (table) => [
    (0, pg_core_1.index)('payment_tx_user_id_idx').on(table.userId),
    (0, pg_core_1.index)('payment_tx_gateway_ref_idx').on(table.gateway, table.gatewayPaymentId),
    (0, pg_core_1.index)('payment_tx_status_idx').on(table.status),
    (0, pg_core_1.uniqueIndex)('payment_tx_idempotency_key_idx').on(table.idempotencyKey),
]);
