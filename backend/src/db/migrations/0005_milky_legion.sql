CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" uuid,
	"provider_id" uuid,
	"provider_product_id" varchar(100),
	"product_name_snapshot" varchar(150) NOT NULL,
	"variant_name_snapshot" varchar(150) NOT NULL,
	"category_snapshot" varchar(100),
	"price_at_purchase" numeric(14, 2) NOT NULL,
	"provider_cost_snapshot" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"face_value" numeric(14, 2),
	"discount_percent" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"fulfillment_status" varchar(30) DEFAULT 'DELIVERED' NOT NULL,
	"delivered_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" varchar(30) DEFAULT 'COMPLETED' NOT NULL,
	"payment_status" varchar(30) DEFAULT 'SUCCESSFUL' NOT NULL,
	"payment_method" varchar(50) DEFAULT 'WALLET_VAULT' NOT NULL,
	"delivery_status" varchar(30) DEFAULT 'DELIVERED' NOT NULL,
	"reference" varchar(100),
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");