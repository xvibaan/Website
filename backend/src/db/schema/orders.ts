import { pgTable, serial, uuid, varchar, text, numeric, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { products } from './products';
import { providers } from './providers';
import { resellers } from './resellers';

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    status: varchar('status', { length: 30 }).notNull().default('COMPLETED'),
    paymentStatus: varchar('payment_status', { length: 30 }).notNull().default('SUCCESSFUL'),
    paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('WALLET_VAULT'),
    deliveryStatus: varchar('delivery_status', { length: 30 }).notNull().default('DELIVERED'),
    reference: varchar('reference', { length: 100 }),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    resellerId: uuid('reseller_id').references(() => resellers.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('orders_user_id_idx').on(table.userId),
    index('orders_status_idx').on(table.status),
    index('orders_reseller_id_idx').on(table.resellerId),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'set null' }),
    providerProductId: varchar('provider_product_id', { length: 100 }),
    productNameSnapshot: varchar('product_name_snapshot', { length: 150 }).notNull(),
    variantNameSnapshot: varchar('variant_name_snapshot', { length: 150 }).notNull(),
    categorySnapshot: varchar('category_snapshot', { length: 100 }),
    priceAtPurchase: numeric('price_at_purchase', { precision: 14, scale: 2 }).notNull(),
    providerCostSnapshot: numeric('provider_cost_snapshot', { precision: 14, scale: 2 }).default('0.00').notNull(),
    faceValue: numeric('face_value', { precision: 14, scale: 2 }),
    discountPercent: integer('discount_percent'),
    quantity: integer('quantity').notNull().default(1),
    fulfillmentStatus: varchar('fulfillment_status', { length: 30 }).notNull().default('DELIVERED'),
    deliveredKey: text('delivered_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('order_items_order_id_idx').on(table.orderId),
  ]
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
