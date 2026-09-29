"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wallets = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
/**
 * Wallets Table Schema (PostgreSQL)
 *
 * Represents ONE central marketplace wallet per customer.
 * - Enforces unique constraint on user_id (one user = one central wallet).
 * - Balance uses NUMERIC(14, 2) exact decimal representation.
 * - Cached balance for fast reads; historical truth is the immutable ledger.
 */
exports.wallets = (0, pg_core_1.pgTable)('wallets', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .unique()
        .references(() => users_1.users.id, { onDelete: 'cascade' }),
    balance: (0, pg_core_1.numeric)('balance', { precision: 14, scale: 2 }).notNull().default('0.00'),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).notNull().default('INR'),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).notNull().default('active'), // 'active' | 'locked' | 'disabled'
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
