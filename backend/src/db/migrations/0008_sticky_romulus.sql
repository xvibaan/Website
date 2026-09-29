CREATE TABLE "resellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"owner_id" uuid NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"plan" varchar(50) DEFAULT 'BASIC' NOT NULL,
	"api_access_enabled" boolean DEFAULT false NOT NULL,
	"api_secret_hash" text,
	"catalog_scope" jsonb DEFAULT '{}'::jsonb,
	"pricing_scope" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "resellers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "resellers" ADD CONSTRAINT "resellers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;