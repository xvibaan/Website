"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resources = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const products_1 = require("./products");
exports.resources = (0, pg_core_1.pgTable)('resources', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    productId: (0, pg_core_1.uuid)('product_id').references(() => products_1.products.id, { onDelete: 'set null' }),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(), // 'HOW_TO_BUY' | 'HOW_TO_USE' | 'TUTORIAL' | 'VIDEO' | 'FILE' | 'DOCUMENTATION' | 'SUPPORT' | 'OTHER'
    purpose: (0, pg_core_1.text)('purpose'),
    url: (0, pg_core_1.text)('url').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('ACTIVE').notNull(), // 'ACTIVE' | 'DISABLED'
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
        .notNull(),
}, (table) => [
    (0, pg_core_1.index)('resources_type_idx').on(table.type),
    (0, pg_core_1.index)('resources_status_idx').on(table.status),
    (0, pg_core_1.index)('resources_product_id_idx').on(table.productId),
]);
