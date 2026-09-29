import { pgTable, uuid, varchar, timestamp, text, index, uniqueIndex, boolean, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Providers Table
 * Central entity for all external infrastructure, cloud, domain, and service providers.
 * Decoupled from marketplace core, customer wallets, and payment gateways.
 */
export const providers = pgTable(
  'providers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    adapterType: varchar('adapter_type', { length: 50 }).notNull(),
    description: text('description'),
    isEnabled: boolean('is_enabled').notNull().default(true),
    isMaintenance: boolean('is_maintenance').notNull().default(false),
    operationalHealth: varchar('operational_health', { length: 30 }).notNull().default('UNKNOWN'),
    priority: integer('priority').notNull().default(0),
    encryptedCredentials: text('encrypted_credentials'), // Storage for encrypted secrets, NEVER returned over APIs
    lastHealthCheckAt: timestamp('last_health_check_at', { withTimezone: true }),
    lastSuccessfulHealthCheckAt: timestamp('last_successful_health_check_at', { withTimezone: true }),
    lastFailedHealthCheckAt: timestamp('last_failed_health_check_at', { withTimezone: true }),
    failureCount: integer('failure_count').notNull().default(0),
    lastHealthResponseTimeMs: integer('last_health_response_time_ms'),
    lastHealthErrorMessage: text('last_health_error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('providers_code_idx').on(table.code),
    index('providers_is_enabled_idx').on(table.isEnabled),
    index('providers_operational_health_idx').on(table.operationalHealth),
  ]
);

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;

/**
 * Provider Health Logs Table
 * Historical operational audit log of health check executions.
 */
export const providerHealthLogs = pgTable(
  'provider_health_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    health: varchar('health', { length: 30 }).notNull(),
    responseTimeMs: integer('response_time_ms').notNull(),
    success: boolean('success').notNull(),
    errorMessage: text('error_message'),
    checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('provider_health_logs_provider_id_idx').on(table.providerId),
    index('provider_health_logs_checked_at_idx').on(table.checkedAt),
  ]
);

export type ProviderHealthLog = typeof providerHealthLogs.$inferSelect;
export type NewProviderHealthLog = typeof providerHealthLogs.$inferInsert;
