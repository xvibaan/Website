CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid,
	"gateway" varchar(50) NOT NULL,
	"gateway_payment_id" varchar(255),
	"gateway_order_id" varchar(255),
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"purpose" varchar(50) DEFAULT 'WALLET_RECHARGE' NOT NULL,
	"idempotency_key" varchar(255),
	"failure_code" varchar(100),
	"failure_reason" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completed_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	CONSTRAINT "payment_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gateway" varchar(50) NOT NULL,
	"gateway_event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payment_reference" varchar(255),
	"status" varchar(30) DEFAULT 'PROCESSED' NOT NULL,
	"error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_transaction_id" uuid NOT NULL,
	"gateway_refund_id" varchar(255),
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_transaction_id_payment_transactions_id_fk" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_tx_user_id_idx" ON "payment_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_tx_gateway_ref_idx" ON "payment_transactions" USING btree ("gateway","gateway_payment_id");--> statement-breakpoint
CREATE INDEX "payment_tx_status_idx" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_tx_idempotency_key_idx" ON "payment_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_gateway_event_idx" ON "webhook_events" USING btree ("gateway","gateway_event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_payment_ref_idx" ON "webhook_events" USING btree ("payment_reference");--> statement-breakpoint
CREATE INDEX "webhook_events_received_at_idx" ON "webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "payment_refunds_tx_id_idx" ON "payment_refunds" USING btree ("payment_transaction_id");