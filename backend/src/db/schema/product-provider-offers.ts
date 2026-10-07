import { pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products';
import { productVariants } from './product-variants';
import { providers } from './providers';

export const productProviderOffers = pgTable(
  'product_provider_offers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id').notNull().references(() => providers.id, { onDelete: 'cascade' }),

    // Provider-specific identifiers
    providerProductId: varchar('provider_product_id', { length: 255 }),
    providerVariantId: varchar('provider_variant_id', { length: 255 }),

    // Resolution logic
    priority: integer('priority').notNull().default(1),
    isEnabled: boolean('is_enabled').notNull().default(true),
    isMaintenance: boolean('is_maintenance').notNull().default(false),

    // Pricing
    costPrice: numeric('cost_price', { precision: 14, scale: 2 }).default('0.00').notNull(),
    currency: varchar('currency', { length: 10 }).default('INR').notNull(),

    // Config
    providerConfiguration: text('provider_configuration'), // JSON string for specific fulfillment flags
    fulfillmentCapability: varchar('fulfillment_capability', { length: 50 }).notNull().default('AUTOMATED'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('ppo_product_id_idx').on(table.productId),
    index('ppo_variant_id_idx').on(table.variantId),
    index('ppo_provider_id_idx').on(table.providerId),
    index('ppo_priority_idx').on(table.priority),
    uniqueIndex('ppo_unique_provider_variant').on(table.variantId, table.providerId),
    uniqueIndex('ppo_unique_provider_product_level')
      .on(table.productId, table.providerId)
      .where(sql`${table.variantId} IS NULL`),
  ]
);

export type ProductProviderOffer = typeof productProviderOffers.$inferSelect;
export type NewProductProviderOffer = typeof productProviderOffers.$inferInsert;
