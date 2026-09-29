import { pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products';

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    duration: varchar('duration', { length: 50 }).default('Lifetime').notNull(),
    originalPrice: numeric('original_price', { precision: 14, scale: 2 }),
    sellingPrice: numeric('selling_price', { precision: 14, scale: 2 }).notNull(),
    costPrice: numeric('cost_price', { precision: 14, scale: 2 }).default('0.00').notNull(),
    specs: text('specs'),
    availableStock: integer('available_stock').notNull().default(999),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('product_variants_product_id_idx').on(table.productId),
    index('product_variants_is_active_idx').on(table.isActive),
  ]
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
