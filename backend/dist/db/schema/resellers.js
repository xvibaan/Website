"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resellers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.resellers = (0, pg_core_1.pgTable)('resellers', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull().unique(),
    businessName: (0, pg_core_1.varchar)('business_name', { length: 255 }).notNull(),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => users_1.users.id),
    contactEmail: (0, pg_core_1.varchar)('contact_email', { length: 255 }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('ACTIVE'), // ACTIVE, SUSPENDED, DISABLED
    plan: (0, pg_core_1.varchar)('plan', { length: 50 }).notNull().default('BASIC'),
    apiAccessEnabled: (0, pg_core_1.boolean)('api_access_enabled').notNull().default(false),
    apiSecretHash: (0, pg_core_1.text)('api_secret_hash'),
    catalogScope: (0, pg_core_1.jsonb)('catalog_scope').default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    pricingScope: (0, pg_core_1.jsonb)('pricing_scope').default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
