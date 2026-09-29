"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resellerWallets = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const resellers_1 = require("./resellers");
exports.resellerWallets = (0, pg_core_1.pgTable)('reseller_wallets', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    resellerId: (0, pg_core_1.uuid)('reseller_id')
        .notNull()
        .unique()
        .references(() => resellers_1.resellers.id, { onDelete: 'cascade' }),
    balance: (0, pg_core_1.numeric)('balance', { precision: 14, scale: 2 }).notNull().default('0.00'),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).notNull().default('INR'),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).notNull().default('active'), // 'active' | 'locked' | 'disabled'
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
