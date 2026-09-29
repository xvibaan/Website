CREATE TABLE "domain_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"hostname_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "domain_routes_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
CREATE TABLE "website_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reseller_id" uuid NOT NULL,
	"instance_name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"primary_domain" varchar(255),
	"branding_config" jsonb DEFAULT '{}'::jsonb,
	"support_config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "domain_routes" ADD CONSTRAINT "domain_routes_instance_id_website_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."website_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_instances" ADD CONSTRAINT "website_instances_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;