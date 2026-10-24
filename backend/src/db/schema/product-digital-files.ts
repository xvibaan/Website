import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products';
import { users } from './users';

export const productDigitalFiles = pgTable(
  'product_digital_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),

    // Driver is recorded per file; R2 is the initial supported driver.
    storageDriver: varchar('storage_driver', { length: 20 })
      .notNull()
      .default('r2'),

    // Private object key only. Never store a public URL here.
    storageKey: text('storage_key').notNull(),

    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 128 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull().default(0),

    // PENDING_UPLOAD -> READY; FAILED is available for failed uploads.
    status: varchar('status', { length: 24 })
      .notNull()
      .default('PENDING_UPLOAD'),

    uploadedBy: uuid('uploaded_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    etag: varchar('etag', { length: 256 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('product_digital_files_storage_key_idx').on(table.storageKey),
    index('product_digital_files_product_id_idx').on(table.productId),
    index('product_digital_files_status_idx').on(table.status),
    check(
      'product_digital_files_driver_check',
      sql`${table.storageDriver} in ('r2', 'local')`,
    ),
    check(
      'product_digital_files_status_check',
      sql`${table.status} in ('PENDING_UPLOAD', 'READY', 'FAILED', 'DELETING')`,
    ),
    check(
      'product_digital_files_size_check',
      sql`${table.sizeBytes} >= 0`,
    ),
    check(
      'product_digital_files_mime_check',
      sql`${table.mimeType} in (
        'application/pdf',
        'application/epub+zip',
        'application/zip',
        'application/vnd.android.package-archive'
      )`,
    ),
  ],
);

export type ProductDigitalFile = typeof productDigitalFiles.$inferSelect;
export type NewProductDigitalFile = typeof productDigitalFiles.$inferInsert;
