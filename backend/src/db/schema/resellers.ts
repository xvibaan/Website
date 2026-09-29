import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const resellers = pgTable('resellers', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('ACTIVE'), // ACTIVE, SUSPENDED, DISABLED
  plan: varchar('plan', { length: 50 }).notNull().default('BASIC'),
  apiAccessEnabled: boolean('api_access_enabled').notNull().default(false),
  apiSecretHash: text('api_secret_hash'),
  catalogScope: jsonb('catalog_scope').default(sql`'{}'::jsonb`),
  pricingScope: jsonb('pricing_scope').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type Reseller = typeof resellers.$inferSelect;
export type NewReseller = typeof resellers.$inferInsert;
