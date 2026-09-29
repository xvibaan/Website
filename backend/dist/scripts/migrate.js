"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const migrator_1 = require("drizzle-orm/node-postgres/migrator");
const client_1 = require("../db/client");
const path_1 = __importDefault(require("path"));
async function runMigration() {
    console.log('Running database migrations...');
    const db = (0, client_1.getDb)();
    try {
        const migrationsFolder = path_1.default.join(process.cwd(), 'src/db/migrations');
        await (0, migrator_1.migrate)(db, { migrationsFolder });
        console.log('Migrations completed successfully.');
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    finally {
        await (0, client_1.closeDbPool)();
    }
}
runMigration();
