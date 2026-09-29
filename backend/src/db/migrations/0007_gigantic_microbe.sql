CREATE TABLE "system_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "system_alerts_type_idx" ON "system_alerts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "system_alerts_is_resolved_idx" ON "system_alerts" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "system_alerts_created_at_idx" ON "system_alerts" USING btree ("created_at");