"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemAlerts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.systemAlerts = (0, pg_core_1.pgTable)('system_alerts', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(), // 'WALLET_MISMATCH' | 'WEBHOOK_FAILURE' | 'PROVIDER_OUTAGE' | 'ORDER_RECONCILIATION_FAILURE'
    severity: (0, pg_core_1.varchar)('severity', { length: 20 }).notNull(), // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    message: (0, pg_core_1.text)('message').notNull(),
    details: (0, pg_core_1.jsonb)('details'),
    isResolved: (0, pg_core_1.boolean)('is_resolved').default(false).notNull(),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at', { withTimezone: true }),
    resolvedBy: (0, pg_core_1.uuid)('resolved_by'), // Admin User ID
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('system_alerts_type_idx').on(table.type),
    (0, pg_core_1.index)('system_alerts_is_resolved_idx').on(table.isResolved),
    (0, pg_core_1.index)('system_alerts_created_at_idx').on(table.createdAt),
]);
