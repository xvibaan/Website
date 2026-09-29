"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookEvents = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.webhookEvents = (0, pg_core_1.pgTable)('webhook_events', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    gateway: (0, pg_core_1.varchar)('gateway', { length: 50 }).notNull(),
    gatewayEventId: (0, pg_core_1.varchar)('gateway_event_id', { length: 255 }).notNull(),
    eventType: (0, pg_core_1.varchar)('event_type', { length: 100 }).notNull(),
    paymentReference: (0, pg_core_1.varchar)('payment_reference', { length: 255 }),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).notNull().default('PROCESSED'),
    error: (0, pg_core_1.text)('error'),
    receivedAt: (0, pg_core_1.timestamp)('received_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: (0, pg_core_1.timestamp)('processed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('webhook_events_gateway_event_idx').on(table.gateway, table.gatewayEventId),
    (0, pg_core_1.index)('webhook_events_payment_ref_idx').on(table.paymentReference),
    (0, pg_core_1.index)('webhook_events_received_at_idx').on(table.receivedAt),
]);
