import { pgTable, uuid, varchar, timestamp, text, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gateway: varchar('gateway', { length: 50 }).notNull(),
    gatewayEventId: varchar('gateway_event_id', { length: 255 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    paymentReference: varchar('payment_reference', { length: 255 }),
    status: varchar('status', { length: 30 }).notNull().default('PROCESSED'),
    error: text('error'),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('webhook_events_gateway_event_idx').on(table.gateway, table.gatewayEventId),
    index('webhook_events_payment_ref_idx').on(table.paymentReference),
    index('webhook_events_received_at_idx').on(table.receivedAt),
  ]
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
