import { and, eq, lt } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { productDigitalFiles } from '../../db/schema';
import {
  createDigitalStagingKey,
  deleteStagedDigitalObject,
  DigitalStorageError,
} from '../../storage/R2DigitalStorageService';

const STAGING_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|epub|zip|apk)$/i;

export interface CleanupStaleUploadsOptions {
  /** Maximum age in hours for a PENDING_UPLOAD to be considered abandoned. Default 24 hours (min 1). */
  maxAgeHours?: number;
  /** Max records to process in a single sweep. Default 50. */
  limit?: number;
  /** If true, identify records without deleting or modifying them. */
  dryRun?: boolean;
}

export interface CleanupStaleUploadsResult {
  scanned: number;
  cleaned: number;
  failed: number;
  dryRun: boolean;
  errors: Array<{ fileId: string; error: string }>;
}

/**
 * Sweeps abandoned PENDING_UPLOAD digital file records older than maxAgeHours.
 *
 * Reliability & Safety Rules:
 * - A successful staging deletion, or a confirmed already-missing staging object,
 *   permits the record to transition to FAILED.
 * - A non-404 storage deletion failure DOES NOT transition the record to FAILED,
 *   preserving it in PENDING_UPLOAD so subsequent cleanup runs can retry the operation.
 * - Final objects under digital-files/ can NEVER be deleted by this staging cleanup service.
 * - maxAgeHours is clamped to a minimum of 1 hour to prevent aborting active in-flight uploads.
 * - Staging keys are strictly validated against regex before invoking R2 deletion.
 * - Cleanup remains strictly manual/admin-triggered; no automatic production scheduler is created.
 */
export async function cleanupStalePendingUploads(
  options: CleanupStaleUploadsOptions = {},
): Promise<CleanupStaleUploadsResult> {
  const maxAgeHours = Math.max(1, options.maxAgeHours ?? 24);
  const limit = Math.min(200, Math.max(1, options.limit ?? 50));
  const dryRun = Boolean(options.dryRun);

  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  const db = getDb();

  const staleRecords = await db
    .select({
      id: productDigitalFiles.id,
      storageKey: productDigitalFiles.storageKey,
      storageDriver: productDigitalFiles.storageDriver,
      createdAt: productDigitalFiles.createdAt,
    })
    .from(productDigitalFiles)
    .where(
      and(
        eq(productDigitalFiles.status, 'PENDING_UPLOAD'),
        eq(productDigitalFiles.storageDriver, 'r2'),
        lt(productDigitalFiles.createdAt, cutoff),
      ),
    )
    .limit(limit);

  const result: CleanupStaleUploadsResult = {
    scanned: staleRecords.length,
    cleaned: 0,
    failed: 0,
    dryRun,
    errors: [],
  };

  if (dryRun || staleRecords.length === 0) {
    return result;
  }

  for (const record of staleRecords) {
    try {
      // Derive and strictly validate staging key
      let stagingKey: string;
      try {
        stagingKey = createDigitalStagingKey(record.storageKey);
      } catch (err: any) {
        throw new Error(`Invalid storage key format for derivation: ${err?.message}`);
      }

      // Hard safety guard: staging cleanup must NEVER target final storage keys
      if (stagingKey.startsWith('digital-files/') || !stagingKey.startsWith('digital-staging/')) {
        throw new Error(`CRITICAL: Staging cleanup aborted; invalid key "${stagingKey}" does not have digital-staging/ prefix.`);
      }

      const stagingFilename = stagingKey.replace(/^digital-staging\//, '');
      if (!STAGING_KEY_RE.test(stagingFilename)) {
        throw new Error(`Staging key "${stagingKey}" does not match strict digital-staging regex; deletion aborted.`);
      }

      // Delete from R2 staging prefix
      let stagingDeletedOrMissing = false;
      try {
        await deleteStagedDigitalObject(stagingKey);
        stagingDeletedOrMissing = true;
      } catch (storageErr: any) {
        // If the object was never uploaded to R2, NoSuchKey / 404 is an idempotent already-missing success
        const isNotFound =
          storageErr?.name === 'NoSuchKey' ||
          storageErr?.name === 'NotFound' ||
          storageErr?.$metadata?.httpStatusCode === 404 ||
          storageErr?.code === 'NoSuchKey';

        if (isNotFound) {
          stagingDeletedOrMissing = true;
        } else {
          // Non-404 storage deletion failure: do NOT mark FAILED.
          // Preserve PENDING_UPLOAD status so future cleanup sweeps can retry.
          console.warn(
            `[DigitalCleanup] R2 staging deletion failed for ${stagingKey} (record ${record.id} will remain PENDING_UPLOAD for retry):`,
            storageErr?.message,
          );
          result.failed++;
          result.errors.push({
            fileId: record.id,
            error: `R2 staging deletion failed: ${storageErr?.message || 'Storage error'}. Preserved in PENDING_UPLOAD for retry.`,
          });
          continue;
        }
      }

      // ONLY transition record to FAILED if staging deletion succeeded or was confirmed missing
      if (stagingDeletedOrMissing) {
        await db
          .update(productDigitalFiles)
          .set({
            status: 'FAILED',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(productDigitalFiles.id, record.id),
              eq(productDigitalFiles.status, 'PENDING_UPLOAD'),
            ),
          );

        result.cleaned++;
      }
    } catch (err: any) {
      result.failed++;
      result.errors.push({
        fileId: record.id,
        error: err?.message || 'Unknown cleanup error',
      });
    }
  }

  return result;
}