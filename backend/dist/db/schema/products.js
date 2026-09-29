"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.products = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const categories_1 = require("./categories");
const providers_1 = require("./providers");
exports.products = (0, pg_core_1.pgTable)('products', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    categoryId: (0, pg_core_1.uuid)('category_id').references(() => categories_1.categories.id, { onDelete: 'set null' }),
    providerId: (0, pg_core_1.uuid)('provider_id').references(() => providers_1.providers.id, { onDelete: 'set null' }),
    providerProductId: (0, pg_core_1.varchar)('provider_product_id', { length: 100 }),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 150 }).notNull().unique(),
    shortDescription: (0, pg_core_1.text)('short_description'),
    description: (0, pg_core_1.text)('description'),
    imageUrl: (0, pg_core_1.text)('image_url'),
    originalPrice: (0, pg_core_1.numeric)('original_price', { precision: 14, scale: 2 }),
    sellingPrice: (0, pg_core_1.numeric)('selling_price', { precision: 14, scale: 2 }).notNull(),
    costPrice: (0, pg_core_1.numeric)('cost_price', { precision: 14, scale: 2 }).default('0.00').notNull(), // Admin internal only, NEVER exposed to customer API
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).default('INR').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('ACTIVE').notNull(), // 'ACTIVE' | 'DISABLED' | 'OUT_OF_STOCK' | 'DISCONTINUED'
    specs: (0, pg_core_1.text)('specs'), // JSON string of specifications (CPU, RAM, disk, bandwidth, etc.)
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('products_slug_idx').on(table.slug),
    (0, pg_core_1.index)('products_category_id_idx').on(table.categoryId),
    (0, pg_core_1.index)('products_provider_id_idx').on(table.providerId),
    (0, pg_core_1.index)('products_status_idx').on(table.status),
]);
