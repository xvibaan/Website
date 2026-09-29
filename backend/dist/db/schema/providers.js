"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerHealthLogs = exports.providers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Providers Table
 * Central entity for all external infrastructure, cloud, domain, and service providers.
 * Decoupled from marketplace core, customer wallets, and payment gateways.
 */
exports.providers = (0, pg_core_1.pgTable)('providers', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull().unique(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    adapterType: (0, pg_core_1.varchar)('adapter_type', { length: 50 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    isEnabled: (0, pg_core_1.boolean)('is_enabled').notNull().default(true),
    isMaintenance: (0, pg_core_1.boolean)('is_maintenance').notNull().default(false),
    operationalHealth: (0, pg_core_1.varchar)('operational_health', { length: 30 }).notNull().default('UNKNOWN'),
    priority: (0, pg_core_1.integer)('priority').notNull().default(0),
    encryptedCredentials: (0, pg_core_1.text)('encrypted_credentials'), // Storage for encrypted secrets, NEVER returned over APIs
    lastHealthCheckAt: (0, pg_core_1.timestamp)('last_health_check_at', { withTimezone: true }),
    lastSuccessfulHealthCheckAt: (0, pg_core_1.timestamp)('last_successful_health_check_at', { withTimezone: true }),
    lastFailedHealthCheckAt: (0, pg_core_1.timestamp)('last_failed_health_check_at', { withTimezone: true }),
    failureCount: (0, pg_core_1.integer)('failure_count').notNull().default(0),
    lastHealthResponseTimeMs: (0, pg_core_1.integer)('last_health_response_time_ms'),
    lastHealthErrorMessage: (0, pg_core_1.text)('last_health_error_message'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
        .notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('providers_code_idx').on(table.code),
    (0, pg_core_1.index)('providers_is_enabled_idx').on(table.isEnabled),
    (0, pg_core_1.index)('providers_operational_health_idx').on(table.operationalHealth),
]);
/**
 * Provider Health Logs Table
 * Historical operational audit log of health check executions.
 */
exports.providerHealthLogs = (0, pg_core_1.pgTable)('provider_health_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    providerId: (0, pg_core_1.uuid)('provider_id')
        .notNull()
        .references(() => exports.providers.id, { onDelete: 'cascade' }),
    health: (0, pg_core_1.varchar)('health', { length: 30 }).notNull(),
    responseTimeMs: (0, pg_core_1.integer)('response_time_ms').notNull(),
    success: (0, pg_core_1.boolean)('success').notNull(),
    errorMessage: (0, pg_core_1.text)('error_message'),
    checkedAt: (0, pg_core_1.timestamp)('checked_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('provider_health_logs_provider_id_idx').on(table.providerId),
    (0, pg_core_1.index)('provider_health_logs_checked_at_idx').on(table.checkedAt),
]);
