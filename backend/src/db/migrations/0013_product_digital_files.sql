CREATE TABLE "product_digital_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"storage_driver" varchar(20) DEFAULT 'r2' NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"status" varchar(24) DEFAULT 'PENDING_UPLOAD' NOT NULL,
	"uploaded_by" uuid,
	"etag" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"uploaded_at" timestamp with time zone,
	CONSTRAINT "product_digital_files_driver_check" CHECK ("product_digital_files"."storage_driver" in ('r2', 'local')),
	CONSTRAINT "product_digital_files_status_check" CHECK ("product_digital_files"."status" in ('PENDING_UPLOAD', 'READY', 'FAILED', 'DELETING')),
	CONSTRAINT "product_digital_files_size_check" CHECK ("product_digital_files"."size_bytes" >= 0),
	CONSTRAINT "product_digital_files_mime_check" CHECK ("product_digital_files"."mime_type" in (
        'application/pdf',
        'application/epub+zip',
        'application/zip',
        'application/vnd.android.package-archive'
      ))
);
--> statement-breakpoint
ALTER TABLE "product_digital_files" ADD CONSTRAINT "product_digital_files_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_digital_files" ADD CONSTRAINT "product_digital_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_digital_files_storage_key_idx" ON "product_digital_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "product_digital_files_product_id_idx" ON "product_digital_files" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_digital_files_status_idx" ON "product_digital_files" USING btree ("status");