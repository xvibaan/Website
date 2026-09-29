"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderItems = exports.orders = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
const products_1 = require("./products");
const providers_1 = require("./providers");
const resellers_1 = require("./resellers");
exports.orders = (0, pg_core_1.pgTable)('orders', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_1.users.id, { onDelete: 'restrict' }),
    totalAmount: (0, pg_core_1.numeric)('total_amount', { precision: 14, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).notNull().default('INR'),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).notNull().default('COMPLETED'),
    paymentStatus: (0, pg_core_1.varchar)('payment_status', { length: 30 }).notNull().default('SUCCESSFUL'),
    paymentMethod: (0, pg_core_1.varchar)('payment_method', { length: 50 }).notNull().default('WALLET_VAULT'),
    deliveryStatus: (0, pg_core_1.varchar)('delivery_status', { length: 30 }).notNull().default('DELIVERED'),
    reference: (0, pg_core_1.varchar)('reference', { length: 100 }),
    metadata: (0, pg_core_1.text)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`).notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    resellerId: (0, pg_core_1.uuid)('reseller_id').references(() => resellers_1.resellers.id, { onDelete: 'set null' }),
}, (table) => [
    (0, pg_core_1.index)('orders_user_id_idx').on(table.userId),
    (0, pg_core_1.index)('orders_status_idx').on(table.status),
    (0, pg_core_1.index)('orders_reseller_id_idx').on(table.resellerId),
]);
exports.orderItems = (0, pg_core_1.pgTable)('order_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    orderId: (0, pg_core_1.integer)('order_id').notNull().references(() => exports.orders.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id').references(() => products_1.products.id, { onDelete: 'set null' }),
    providerId: (0, pg_core_1.uuid)('provider_id').references(() => providers_1.providers.id, { onDelete: 'set null' }),
    providerProductId: (0, pg_core_1.varchar)('provider_product_id', { length: 100 }),
    productNameSnapshot: (0, pg_core_1.varchar)('product_name_snapshot', { length: 150 }).notNull(),
    variantNameSnapshot: (0, pg_core_1.varchar)('variant_name_snapshot', { length: 150 }).notNull(),
    categorySnapshot: (0, pg_core_1.varchar)('category_snapshot', { length: 100 }),
    priceAtPurchase: (0, pg_core_1.numeric)('price_at_purchase', { precision: 14, scale: 2 }).notNull(),
    providerCostSnapshot: (0, pg_core_1.numeric)('provider_cost_snapshot', { precision: 14, scale: 2 }).default('0.00').notNull(),
    faceValue: (0, pg_core_1.numeric)('face_value', { precision: 14, scale: 2 }),
    discountPercent: (0, pg_core_1.integer)('discount_percent'),
    quantity: (0, pg_core_1.integer)('quantity').notNull().default(1),
    fulfillmentStatus: (0, pg_core_1.varchar)('fulfillment_status', { length: 30 }).notNull().default('DELIVERED'),
    deliveredKey: (0, pg_core_1.text)('delivered_key'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('order_items_order_id_idx').on(table.orderId),
]);
