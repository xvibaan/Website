"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productVariants = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const products_1 = require("./products");
exports.productVariants = (0, pg_core_1.pgTable)('product_variants', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => products_1.products.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    duration: (0, pg_core_1.varchar)('duration', { length: 50 }).default('Lifetime').notNull(),
    originalPrice: (0, pg_core_1.numeric)('original_price', { precision: 14, scale: 2 }),
    sellingPrice: (0, pg_core_1.numeric)('selling_price', { precision: 14, scale: 2 }).notNull(),
    costPrice: (0, pg_core_1.numeric)('cost_price', { precision: 14, scale: 2 }).default('0.00').notNull(),
    specs: (0, pg_core_1.text)('specs'),
    availableStock: (0, pg_core_1.integer)('available_stock').notNull().default(999),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
        .notNull(),
}, (table) => [
    (0, pg_core_1.index)('product_variants_product_id_idx').on(table.productId),
    (0, pg_core_1.index)('product_variants_is_active_idx').on(table.isActive),
]);
