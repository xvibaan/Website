CREATE TABLE "reseller_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reseller_id" uuid NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "reseller_wallets_reseller_id_unique" UNIQUE("reseller_id")
);
--> statement-breakpoint
CREATE TABLE "reseller_wallet_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reseller_wallet_id" uuid NOT NULL,
	"reseller_id" uuid NOT NULL,
	"entry_type" varchar(30) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"balance_before" numeric(14, 2) NOT NULL,
	"balance_after" numeric(14, 2) NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"reference_id" varchar(255),
	"idempotency_key" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reseller_wallet_ledger_entries_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "reseller_wallets" ADD CONSTRAINT "reseller_wallets_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_wallet_ledger_entries" ADD CONSTRAINT "reseller_wallet_ledger_entries_reseller_wallet_id_reseller_wallets_id_fk" FOREIGN KEY ("reseller_wallet_id") REFERENCES "public"."reseller_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_wallet_ledger_entries" ADD CONSTRAINT "reseller_wallet_ledger_entries_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rw_ledger_wallet_id_idx" ON "reseller_wallet_ledger_entries" USING btree ("reseller_wallet_id");--> statement-breakpoint
CREATE INDEX "rw_ledger_created_at_idx" ON "reseller_wallet_ledger_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rw_ledger_ref_idx" ON "reseller_wallet_ledger_entries" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rw_ledger_idempotency_idx" ON "reseller_wallet_ledger_entries" USING btree ("idempotency_key");