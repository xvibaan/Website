import { StorageDriver } from './types';
import { LocalStorageDriver } from './LocalStorageDriver';
import { S3CompatibleStorageDriver } from './S3CompatibleStorageDriver';

export * from './types';
export * from './validation';
export * from './LocalStorageDriver';
export * from './S3CompatibleStorageDriver';

let activeDriverInstance: StorageDriver | null = null;

/**
 * Returns the configured storage driver singleton.
 * Configured via process.env.STORAGE_DRIVER ('local' | 's3').
 * Default is 'local' for development and testing.
 *
 * PRODUCTION GUARD: Local storage is explicitly rejected in production.
 * Production deployments MUST use S3-compatible object storage.
 */
export function getStorageDriver(): StorageDriver {
  if (activeDriverInstance) {
    return activeDriverInstance;
  }

  const driverType = (process.env.STORAGE_DRIVER || 'local').toLowerCase().trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (driverType === 's3') {
    // S3CompatibleStorageDriver constructor will strictly validate required S3 env vars
    // and throw a configuration error if missing, rather than silently falling back.
    activeDriverInstance = new S3CompatibleStorageDriver();
  } else if (driverType === 'local') {
    if (isProduction) {
      throw new Error(
        'FATAL: STORAGE_DRIVER="local" is not allowed in production. ' +
        'Set STORAGE_DRIVER=s3 and configure STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_REGION, ' +
        'STORAGE_ACCESS_KEY_ID, and STORAGE_SECRET_ACCESS_KEY for production deployments.'
      );
    }
    activeDriverInstance = new LocalStorageDriver();
  } else {
    throw new Error(
      `Invalid STORAGE_DRIVER '${driverType}'. Supported drivers are 'local' and 's3'.`
    );
  }

  return activeDriverInstance;
}

/**
 * Helper to reset storage driver singleton (useful in unit/integration tests).
 */
export function resetStorageDriver(): void {
  activeDriverInstance = null;
}
