"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuditLogs = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.adminAuditLogs = (0, pg_core_1.pgTable)('admin_audit_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    adminUserId: (0, pg_core_1.uuid)('admin_user_id')
        .notNull()
        .references(() => users_1.users.id, { onDelete: 'cascade' }),
    action: (0, pg_core_1.varchar)('action', { length: 100 }).notNull(),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 50 }).notNull(), // 'USER' | 'PRODUCT' | 'CATEGORY' | 'PROVIDER' | 'WALLET' | 'RESOURCE' | 'SETTINGS'
    entityId: (0, pg_core_1.varchar)('entity_id', { length: 100 }),
    details: (0, pg_core_1.text)('details'), // Sanitized JSON payload of state changes (no secrets)
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('admin_audit_logs_admin_user_id_idx').on(table.adminUserId),
    (0, pg_core_1.index)('admin_audit_logs_action_idx').on(table.action),
    (0, pg_core_1.index)('admin_audit_logs_entity_type_idx').on(table.entityType),
    (0, pg_core_1.index)('admin_audit_logs_created_at_idx').on(table.createdAt),
]);
