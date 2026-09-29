"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformSettings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.platformSettings = (0, pg_core_1.pgTable)('platform_settings', {
    key: (0, pg_core_1.varchar)('key', { length: 100 }).primaryKey(),
    value: (0, pg_core_1.text)('value').notNull(),
    description: (0, pg_core_1.text)('description'),
    updatedBy: (0, pg_core_1.uuid)('updated_by').references(() => users_1.users.id, { onDelete: 'set null' }),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
        .notNull(),
});
