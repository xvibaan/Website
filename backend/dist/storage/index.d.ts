import { StorageDriver } from './types';
export * from './types';
export * from './validation';
export * from './LocalStorageDriver';
export * from './S3CompatibleStorageDriver';
/**
 * Returns the configured storage driver singleton.
 * Configured via process.env.STORAGE_DRIVER ('local' | 's3').
 * Default is 'local' for development and testing.
 *
 * PRODUCTION GUARD: Local storage is explicitly rejected in production.
 * Production deployments MUST use S3-compatible object storage.
 */
export declare function getStorageDriver(): StorageDriver;
/**
 * Helper to reset storage driver singleton (useful in unit/integration tests).
 */
export declare function resetStorageDriver(): void;
