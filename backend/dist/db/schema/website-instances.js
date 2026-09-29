"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainRoutes = exports.websiteInstances = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const resellers_1 = require("./resellers");
exports.websiteInstances = (0, pg_core_1.pgTable)('website_instances', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    resellerId: (0, pg_core_1.uuid)('reseller_id').notNull().references(() => resellers_1.resellers.id, { onDelete: 'cascade' }),
    instanceName: (0, pg_core_1.varchar)('instance_name', { length: 255 }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('ACTIVE'), // ACTIVE, SUSPENDED, DISABLED
    primaryDomain: (0, pg_core_1.varchar)('primary_domain', { length: 255 }), // Can be null if no domain is verified yet
    brandingConfig: (0, pg_core_1.jsonb)('branding_config').default((0, drizzle_orm_1.sql) `'{}'::jsonb`), // e.g. logoUrl, colors
    supportConfig: (0, pg_core_1.jsonb)('support_config').default((0, drizzle_orm_1.sql) `'{}'::jsonb`), // e.g. email, phone
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
exports.domainRoutes = (0, pg_core_1.pgTable)('domain_routes', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    instanceId: (0, pg_core_1.uuid)('instance_id').notNull().references(() => exports.websiteInstances.id, { onDelete: 'cascade' }),
    hostname: (0, pg_core_1.varchar)('hostname', { length: 255 }).notNull().unique(), // Unique normalized hostname
    hostnameType: (0, pg_core_1.varchar)('hostname_type', { length: 50 }).notNull(), // SUBDOMAIN, CUSTOM_DOMAIN
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('PENDING_VERIFICATION'), // PENDING_VERIFICATION, VERIFIED, DISABLED
    isPrimary: (0, pg_core_1.boolean)('is_primary').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
