CREATE TABLE IF NOT EXISTS "famapp_email_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gmail_message_id" varchar(255) NOT NULL UNIQUE,
  "gmail_thread_id" varchar(255),
  "sender_address" varchar(255) NOT NULL,
  "recipient_address" varchar(255) NOT NULL,
  "parsed_utr" varchar(16) NOT NULL,
  "parsed_tx_id" varchar(255),
  "parsed_amount" numeric(14, 2) NOT NULL,
  "currency" varchar(10) DEFAULT 'INR' NOT NULL,
  "parsed_sender_name" varchar(255),
  "parsed_sender_vpa" varchar(255),
  "parsed_recipient_vpa" varchar(255),
  "transaction_timestamp" timestamp with time zone NOT NULL,
  "dkim_status" varchar(50) DEFAULT 'NONE' NOT NULL,
  "spf_status" varchar(50) DEFAULT 'NONE' NOT NULL,
  "auth_status" varchar(50) DEFAULT 'MISSING' NOT NULL,
  "status" varchar(30) DEFAULT 'UNCLAIMED' NOT NULL,
  "claimed_by_submission_id" uuid,
  "raw_headers" text,
  "raw_snippet" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "claimed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "famapp_events_utr_status_idx" ON "famapp_email_events" ("parsed_utr", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "famapp_events_tx_timestamp_idx" ON "famapp_email_events" ("transaction_timestamp");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "famapp_events_status_idx" ON "famapp_email_events" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "upi_payment_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "wallet_id" uuid NOT NULL REFERENCES "public"."wallets"("id") ON DELETE cascade,
  "payment_transaction_id" uuid REFERENCES "public"."payment_transactions"("id") ON DELETE set null,
  "utr" varchar(16) NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "currency" varchar(10) DEFAULT 'INR' NOT NULL,
  "status" varchar(30) DEFAULT 'PENDING' NOT NULL,
  "matched_email_event_id" uuid REFERENCES "public"."famapp_email_events"("id") ON DELETE set null,
  "failure_reason" text,
  "admin_notes" text,
  "override_reason" text,
  "is_overridden" varchar(10) DEFAULT 'false' NOT NULL,
  "reviewed_by" uuid REFERENCES "public"."users"("id") ON DELETE set null,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "credited_at" timestamp with time zone,
  CONSTRAINT "upi_sub_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "upi_sub_utr_format" CHECK ("utr" ~ '^[0-9]{12}$')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "upi_sub_user_status_idx" ON "upi_payment_submissions" ("user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "upi_sub_utr_status_idx" ON "upi_payment_submissions" ("utr", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "upi_sub_status_idx" ON "upi_payment_submissions" ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "upi_sub_credited_utr_unique_idx" ON "upi_payment_submissions" ("utr") WHERE status = 'CREDITED';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "famapp_sync_state" (
  "id" varchar(50) PRIMARY KEY DEFAULT 'primary' NOT NULL,
  "last_history_id" varchar(100),
  "last_synced_message_timestamp" timestamp with time zone,
  "last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
  "consecutive_errors" numeric(5, 0) DEFAULT '0' NOT NULL,
  "last_error" text
);
