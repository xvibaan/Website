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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageDriver = getStorageDriver;
exports.resetStorageDriver = resetStorageDriver;
const LocalStorageDriver_1 = require("./LocalStorageDriver");
const S3CompatibleStorageDriver_1 = require("./S3CompatibleStorageDriver");
__exportStar(require("./types"), exports);
__exportStar(require("./validation"), exports);
__exportStar(require("./LocalStorageDriver"), exports);
__exportStar(require("./S3CompatibleStorageDriver"), exports);
let activeDriverInstance = null;
/**
 * Returns the configured storage driver singleton.
 * Configured via process.env.STORAGE_DRIVER ('local' | 's3').
 * Default is 'local' for development and testing.
 *
 * PRODUCTION GUARD: Local storage is explicitly rejected in production.
 * Production deployments MUST use S3-compatible object storage.
 */
function getStorageDriver() {
    if (activeDriverInstance) {
        return activeDriverInstance;
    }
    const driverType = (process.env.STORAGE_DRIVER || 'local').toLowerCase().trim();
    const isProduction = process.env.NODE_ENV === 'production';
    if (driverType === 's3') {
        // S3CompatibleStorageDriver constructor will strictly validate required S3 env vars
        // and throw a configuration error if missing, rather than silently falling back.
        activeDriverInstance = new S3CompatibleStorageDriver_1.S3CompatibleStorageDriver();
    }
    else if (driverType === 'local') {
        if (isProduction) {
            throw new Error('FATAL: STORAGE_DRIVER="local" is not allowed in production. ' +
                'Set STORAGE_DRIVER=s3 and configure STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_REGION, ' +
                'STORAGE_ACCESS_KEY_ID, and STORAGE_SECRET_ACCESS_KEY for production deployments.');
        }
        activeDriverInstance = new LocalStorageDriver_1.LocalStorageDriver();
    }
    else {
        throw new Error(`Invalid STORAGE_DRIVER '${driverType}'. Supported drivers are 'local' and 's3'.`);
    }
    return activeDriverInstance;
}
/**
 * Helper to reset storage driver singleton (useful in unit/integration tests).
 */
function resetStorageDriver() {
    activeDriverInstance = null;
}
