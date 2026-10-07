CREATE TABLE "product_provider_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"provider_id" uuid NOT NULL,
	"provider_product_id" varchar(255),
	"provider_variant_id" varchar(255),
	"priority" integer DEFAULT 1 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_maintenance" boolean DEFAULT false NOT NULL,
	"cost_price" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"provider_configuration" text,
	"fulfillment_capability" varchar(50) DEFAULT 'AUTOMATED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "product_provider_offers" ADD CONSTRAINT "product_provider_offers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_provider_offers" ADD CONSTRAINT "product_provider_offers_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_provider_offers" ADD CONSTRAINT "product_provider_offers_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ppo_product_id_idx" ON "product_provider_offers" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "ppo_variant_id_idx" ON "product_provider_offers" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "ppo_provider_id_idx" ON "product_provider_offers" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "ppo_priority_idx" ON "product_provider_offers" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "ppo_unique_provider_variant" ON "product_provider_offers" USING btree ("variant_id","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ppo_unique_provider_product_level" ON "product_provider_offers" USING btree ("product_id","provider_id") WHERE "product_provider_offers"."variant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;