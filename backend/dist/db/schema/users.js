"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Users Table Schema (PostgreSQL)
 *
 * Designed as the foundational schema for future authentication and RBAC.
 * No business logic, passwords stored only as hashed text, email unique constraint.
 */
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    googleId: (0, pg_core_1.varchar)('google_id', { length: 255 }).unique(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    role: (0, pg_core_1.varchar)('role', { length: 50 }).notNull().default('customer'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
