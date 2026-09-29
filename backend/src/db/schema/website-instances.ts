import { pgTable, uuid, varchar, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { resellers } from './resellers';

export const websiteInstances = pgTable('website_instances', {
  id: uuid('id').defaultRandom().primaryKey(),
  resellerId: uuid('reseller_id').notNull().references(() => resellers.id, { onDelete: 'cascade' }),
  instanceName: varchar('instance_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('ACTIVE'), // ACTIVE, SUSPENDED, DISABLED
  primaryDomain: varchar('primary_domain', { length: 255 }), // Can be null if no domain is verified yet
  brandingConfig: jsonb('branding_config').default(sql`'{}'::jsonb`), // e.g. logoUrl, colors
  supportConfig: jsonb('support_config').default(sql`'{}'::jsonb`), // e.g. email, phone
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const domainRoutes = pgTable('domain_routes', {
  id: uuid('id').defaultRandom().primaryKey(),
  instanceId: uuid('instance_id').notNull().references(() => websiteInstances.id, { onDelete: 'cascade' }),
  hostname: varchar('hostname', { length: 255 }).notNull().unique(), // Unique normalized hostname
  hostnameType: varchar('hostname_type', { length: 50 }).notNull(), // SUBDOMAIN, CUSTOM_DOMAIN
  status: varchar('status', { length: 50 }).notNull().default('PENDING_VERIFICATION'), // PENDING_VERIFICATION, VERIFIED, DISABLED
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type WebsiteInstance = typeof websiteInstances.$inferSelect;
export type NewWebsiteInstance = typeof websiteInstances.$inferInsert;

export type DomainRoute = typeof domainRoutes.$inferSelect;
export type NewDomainRoute = typeof domainRoutes.$inferInsert;
