"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.getDbPool = getDbPool;
exports.getDb = getDb;
exports.withTransaction = withTransaction;
exports.closeDbPool = closeDbPool;
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const dotenv_1 = __importDefault(require("dotenv"));
const schema = __importStar(require("./schema"));
exports.schema = schema;
dotenv_1.default.config();
let pool = null;
let dbInstance = null;
/**
 * Returns or initializes the centralized PostgreSQL connection pool.
 * Avoids creating new connection pools for every query.
 */
function getDbPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        const config = {
            connectionString: connectionString || undefined,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        };
        if (process.env.NODE_ENV === 'production') {
            const sslMode = process.env.DB_SSL_MODE || 'require';
            if (sslMode === 'require') {
                config.ssl = {
                    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
                };
            }
            else if (sslMode !== 'disable') {
                throw new Error(`CRITICAL CONFIGURATION ERROR: Invalid DB_SSL_MODE in production: ${sslMode}. Expected 'require' or 'disable'.`);
            }
        }
        pool = new pg_1.Pool(config);
        pool.on('error', (err) => {
            console.error('[PostgreSQL Pool] Unexpected error on idle client', err);
        });
    }
    return pool;
}
/**
 * Returns the centralized Drizzle database instance initialized with the schema.
 */
function getDb() {
    if (!dbInstance) {
        const currentPool = getDbPool();
        dbInstance = (0, node_postgres_1.drizzle)(currentPool, { schema });
    }
    return dbInstance;
}
/**
 * Transaction helper ensuring future atomic multi-operation sequences.
 * Accepts a callback that receives the transaction client.
 */
async function withTransaction(callback) {
    const db = getDb();
    return db.transaction(callback);
}
/**
 * Gracefully closes the connection pool if active.
 */
async function closeDbPool() {
    if (pool) {
        await pool.end();
        pool = null;
        dbInstance = null;
    }
}
