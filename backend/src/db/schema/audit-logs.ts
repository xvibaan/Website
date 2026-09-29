import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminUserId: uuid('admin_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'USER' | 'PRODUCT' | 'CATEGORY' | 'PROVIDER' | 'WALLET' | 'RESOURCE' | 'SETTINGS'
    entityId: varchar('entity_id', { length: 100 }),
    details: text('details'), // Sanitized JSON payload of state changes (no secrets)
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('admin_audit_logs_admin_user_id_idx').on(table.adminUserId),
    index('admin_audit_logs_action_idx').on(table.action),
    index('admin_audit_logs_entity_type_idx').on(table.entityType),
    index('admin_audit_logs_created_at_idx').on(table.createdAt),
  ]
);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
