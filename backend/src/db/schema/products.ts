import { pgTable, uuid, varchar, text, numeric, integer, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { categories } from './categories';
import { providers } from './providers';

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'set null' }),
    providerProductId: varchar('provider_product_id', { length: 100 }),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 150 }).notNull().unique(),
    shortDescription: text('short_description'),
    description: text('description'),
    imageUrl: text('image_url'),
    originalPrice: numeric('original_price', { precision: 14, scale: 2 }),
    sellingPrice: numeric('selling_price', { precision: 14, scale: 2 }).notNull(),
    costPrice: numeric('cost_price', { precision: 14, scale: 2 }).default('0.00').notNull(), // Admin internal only, NEVER exposed to customer API
    currency: varchar('currency', { length: 10 }).default('INR').notNull(),
    status: varchar('status', { length: 30 }).default('ACTIVE').notNull(), // 'ACTIVE' | 'DISABLED' | 'OUT_OF_STOCK' | 'DISCONTINUED'
    specs: text('specs'), // JSON string of specifications (CPU, RAM, disk, bandwidth, etc.)
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('products_slug_idx').on(table.slug),
    index('products_category_id_idx').on(table.categoryId),
    index('products_provider_id_idx').on(table.providerId),
    index('products_status_idx').on(table.status),
  ]
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
