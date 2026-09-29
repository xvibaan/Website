import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products';

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 150 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'HOW_TO_BUY' | 'HOW_TO_USE' | 'TUTORIAL' | 'VIDEO' | 'FILE' | 'DOCUMENTATION' | 'SUPPORT' | 'OTHER'
    purpose: text('purpose'),
    url: text('url').notNull(),
    status: varchar('status', { length: 30 }).default('ACTIVE').notNull(), // 'ACTIVE' | 'DISABLED'
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('resources_type_idx').on(table.type),
    index('resources_status_idx').on(table.status),
    index('resources_product_id_idx').on(table.productId),
  ]
);

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
