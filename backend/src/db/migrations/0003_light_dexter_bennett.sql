CREATE TABLE "provider_health_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"health" varchar(30) NOT NULL,
	"response_time_ms" integer NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"adapter_type" varchar(50) NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_maintenance" boolean DEFAULT false NOT NULL,
	"operational_health" varchar(30) DEFAULT 'UNKNOWN' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"encrypted_credentials" text,
	"last_health_check_at" timestamp with time zone,
	"last_successful_health_check_at" timestamp with time zone,
	"last_failed_health_check_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_health_response_time_ms" integer,
	"last_health_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "providers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "provider_health_logs" ADD CONSTRAINT "provider_health_logs_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provider_health_logs_provider_id_idx" ON "provider_health_logs" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_health_logs_checked_at_idx" ON "provider_health_logs" USING btree ("checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "providers_code_idx" ON "providers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "providers_is_enabled_idx" ON "providers" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "providers_operational_health_idx" ON "providers" USING btree ("operational_health");