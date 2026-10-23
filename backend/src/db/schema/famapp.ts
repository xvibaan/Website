import { pgTable, uuid, varchar, numeric, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { wallets } from './wallets';
import { paymentTransactions } from './payment-transactions';

/**
 * FamApp Ingested Email Events Table Schema (PostgreSQL)
 *
 * Stores authoritative incoming credit notification emails extracted via Gmail API.
 * Deduplicates messages by gmail_message_id and indexes UTR for matching.
 * Fail-closed default: auth_status starts as 'MISSING' until positively verified.
 */
export const famappEmailEvents = pgTable(
  'famapp_email_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gmailMessageId: varchar('gmail_message_id', { length: 255 }).notNull().unique(),
    gmailThreadId: varchar('gmail_thread_id', { length: 255 }),
    senderAddress: varchar('sender_address', { length: 255 }).notNull(),
    recipientAddress: varchar('recipient_address', { length: 255 }).notNull(),
    parsedUtr: varchar('parsed_utr', { length: 16 }).notNull(),
    parsedTxId: varchar('parsed_tx_id', { length: 255 }),
    parsedAmount: numeric('parsed_amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    parsedSenderName: varchar('parsed_sender_name', { length: 255 }),
    parsedSenderVpa: varchar('parsed_sender_vpa', { length: 255 }),
    parsedRecipientVpa: varchar('parsed_recipient_vpa', { length: 255 }),
    transactionTimestamp: timestamp('transaction_timestamp', { withTimezone: true }).notNull(),
    dkimStatus: varchar('dkim_status', { length: 50 }).notNull().default('NONE'), // 'PASS' | 'FAIL' | 'NONE'
    spfStatus: varchar('spf_status', { length: 50 }).notNull().default('NONE'),   // 'PASS' | 'FAIL' | 'NONE'
    authStatus: varchar('auth_status', { length: 50 }).notNull().default('MISSING'), // 'VERIFIED' | 'FAILED' | 'MISSING'
    status: varchar('status', { length: 30 }).notNull().default('UNCLAIMED'), // 'UNCLAIMED' | 'CLAIMED' | 'FLAGGED' | 'EXPIRED' | 'UNPARSEABLE'
    claimedBySubmissionId: uuid('claimed_by_submission_id'),
    rawHeaders: text('raw_headers'),
    rawSnippet: text('raw_snippet'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
  },
  (table) => [
    index('famapp_events_utr_status_idx').on(table.parsedUtr, table.status),
    index('famapp_events_tx_timestamp_idx').on(table.transactionTimestamp),
    index('famapp_events_status_idx').on(table.status),
  ]
);

export type FamappEmailEvent = typeof famappEmailEvents.$inferSelect;
export type NewFamappEmailEvent = typeof famappEmailEvents.$inferInsert;

/**
 * UPI Payment Submissions Table Schema (PostgreSQL)
 *
 * Represents customer-initiated claims of having paid via static UPI QR.
 * Does NOT permanently lock a UTR while pending.
 * Enforces unique constraint on UTR ONLY when status = 'CREDITED'.
 */
export const upiPaymentSubmissions = pgTable(
  'upi_payment_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    paymentTransactionId: uuid('payment_transaction_id')
      .references(() => paymentTransactions.id, { onDelete: 'set null' }),
    utr: varchar('utr', { length: 16 }).notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    status: varchar('status', { length: 30 }).notNull().default('PENDING'),
    // 'PENDING' | 'MATCHED' | 'CREDITED' | 'MANUAL_REVIEW' | 'EXPIRED' | 'REJECTED'
    matchedEmailEventId: uuid('matched_email_event_id')
      .references(() => famappEmailEvents.id, { onDelete: 'set null' }),
    failureReason: text('failure_reason'),
    adminNotes: text('admin_notes'),
    overrideReason: text('override_reason'),
    isOverridden: varchar('is_overridden', { length: 10 }).notNull().default('false'),
    reviewedBy: uuid('reviewed_by')
      .references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    creditedAt: timestamp('credited_at', { withTimezone: true }),
  },
  (table) => [
    index('upi_sub_user_status_idx').on(table.userId, table.status),
    index('upi_sub_utr_status_idx').on(table.utr, table.status),
    index('upi_sub_status_idx').on(table.status),
    uniqueIndex('upi_sub_credited_utr_unique_idx')
      .on(table.utr)
      .where(sql`status = 'CREDITED'`),
  ]
);

export type UpiPaymentSubmission = typeof upiPaymentSubmissions.$inferSelect;
export type NewUpiPaymentSubmission = typeof upiPaymentSubmissions.$inferInsert;

/**
 * FamApp Gmail Sync State Table Schema (PostgreSQL)
 *
 * Tracks the Gmail API synchronization cursor (historyId, timestamp, and health counters)
 * to support resumption, missed notification recovery, and exponential backoff.
 */
export const famappSyncState = pgTable('famapp_sync_state', {
  id: varchar('id', { length: 50 }).primaryKey().default('primary'),
  lastHistoryId: varchar('last_history_id', { length: 100 }),
  lastSyncedMessageTimestamp: timestamp('last_synced_message_timestamp', { withTimezone: true }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).defaultNow().notNull(),
  consecutiveErrors: numeric('consecutive_errors', { precision: 5, scale: 0 }).notNull().default('0'),
  lastError: text('last_error'),
});

export type FamappSyncState = typeof famappSyncState.$inferSelect;
export type NewFamappSyncState = typeof famappSyncState.$inferInsert;
