import { pgTable, uuid, varchar, text, timestamp, boolean, index, jsonb } from 'drizzle-orm/pg-core';

export const systemAlerts = pgTable(
  'system_alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 50 }).notNull(), // 'WALLET_MISMATCH' | 'WEBHOOK_FAILURE' | 'PROVIDER_OUTAGE' | 'ORDER_RECONCILIATION_FAILURE'
    severity: varchar('severity', { length: 20 }).notNull(), // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    message: text('message').notNull(),
    details: jsonb('details'),
    isResolved: boolean('is_resolved').default(false).notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by'), // Admin User ID
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('system_alerts_type_idx').on(table.type),
    index('system_alerts_is_resolved_idx').on(table.isResolved),
    index('system_alerts_created_at_idx').on(table.createdAt),
  ]
);

export type SystemAlert = typeof systemAlerts.$inferSelect;
export type NewSystemAlert = typeof systemAlerts.$inferInsert;
