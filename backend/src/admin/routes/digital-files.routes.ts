import { and, desc, eq, sql } from 'drizzle-orm';
import { FastifyPluginAsync, FastifyReply } from 'fastify';
import { getDb } from '../../db/client';
import { orders, orderItems, productDigitalFiles, products } from '../../db/schema';
import {
  createDigitalStorageKey,
  createDigitalStagingKey,
  createPresignedDigitalUpload,
  verifyUploadedDigitalObject,
  promoteStagedDigitalObject,
  deleteStagedDigitalObject,
  deleteDigitalObject,
  validateDigitalFileInput,
  DigitalStorageError,
  type DigitalMimeType,
} from '../../storage/R2DigitalStorageService';
import { cleanupStalePendingUploads } from '../services/digital-files-cleanup.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FINAL_KEY_RE = /^digital-files\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|epub|zip|apk)$/i;

function sendError(
  reply: FastifyReply,
  err: unknown,
) {
  const statusCode = err instanceof DigitalStorageError ? err.statusCode : 500;
  const message =
    err instanceof DigitalStorageError
      ? err.message
      : 'Digital file operation failed. Check server logs.';

  return reply.status(statusCode).send({
    statusCode,
    error: statusCode >= 500 ? 'DigitalStorageError' : 'BadRequest',
    message,
  });
}

async function markFailed(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(productDigitalFiles)
    .set({ status: 'FAILED', updatedAt: new Date() })
    .where(
      and(
        eq(productDigitalFiles.id, id),
        eq(productDigitalFiles.status, 'PENDING_UPLOAD'),
      ),
    );
}

export const digitalFileAdminRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/v1/admin/digital-files/upload/initiate
   * Creates a pending record and a short-lived direct-to-R2 upload URL.
   */
  app.post('/upload/initiate', async (request, reply) => {
    const body = request.body as Record<string, unknown> | null;

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      typeof body.productId !== 'string' ||
      !UUID_RE.test(body.productId)
    ) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'A valid product ID is required.',
      });
    }

    let validated;
    try {
      validated = validateDigitalFileInput({
        filename: String(body.filename || ''),
        mimeType: String(body.mimeType || ''),
        sizeBytes: Number(body.sizeBytes),
      });
    } catch (err) {
      return sendError(reply, err);
    }

    const db = getDb();

    try {
      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, body.productId))
        .limit(1);

      if (!product) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NotFound',
          message: 'Product not found.',
        });
      }

      const finalKey = createDigitalStorageKey(validated.mimeType);
      const stagingKey = createDigitalStagingKey(finalKey);

      const [record] = await db
        .insert(productDigitalFiles)
        .values({
          productId: product.id,
          storageDriver: 'r2',
          storageKey: finalKey,
          originalFilename: validated.originalFilename,
          mimeType: validated.mimeType,
          sizeBytes: validated.sizeBytes,
          status: 'PENDING_UPLOAD',
          uploadedBy: request.user?.userId ?? null,
        })
        .returning({
          id: productDigitalFiles.id,
        });

      if (!record) {
        throw new Error('Failed to create digital-file upload record.');
      }

      try {
        const signed = await createPresignedDigitalUpload({
          storageKey: stagingKey,
          mimeType: validated.mimeType,
        });

        return reply.status(201).send({
          success: true,
          fileId: record.id,
          status: 'PENDING_UPLOAD',
          uploadUrl: signed.uploadUrl,
          expiresInSeconds: signed.expiresInSeconds,
          requiredHeaders: {
            'Content-Type': validated.mimeType,
            'Cache-Control': 'private, no-store',
          },
        });
      } catch (err) {
        await markFailed(record.id);
        throw err;
      }
    } catch (err) {
      request.log.error({ err }, 'Digital-file upload initiation failed');
      return sendError(reply, err);
    }
  });

  /**
   * POST /api/v1/admin/digital-files/:id/complete
   * Verifies the staging object before promoting it to private final storage.
   */
  app.post<{ Params: { id: string } }>('/:id/complete', async (request, reply) => {
    const { id } = request.params;

    if (!UUID_RE.test(id)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid digital-file ID.',
      });
    }

    const db = getDb();

    try {
      const [file] = await db
        .select()
        .from(productDigitalFiles)
        .where(eq(productDigitalFiles.id, id))
        .limit(1);

      if (!file) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NotFound',
          message: 'Digital file not found.',
        });
      }

      // Allow safe retries if a prior completion already succeeded.
      if (file.status === 'READY') {
        return reply.send({
          success: true,
          fileId: file.id,
          status: 'READY',
          sizeBytes: file.sizeBytes,
        });
      }

      if (file.status !== 'PENDING_UPLOAD' || file.storageDriver !== 'r2') {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'This file is not awaiting an R2 upload.',
        });
      }

      const stagingKey = createDigitalStagingKey(file.storageKey);
      const mimeType = file.mimeType as DigitalMimeType;
      let promoted = false;

      try {
        const verified = await verifyUploadedDigitalObject({
          storageKey: stagingKey,
          expectedMimeType: mimeType,
          expectedSizeBytes: file.sizeBytes,
        });

        if (!verified.etag) {
          throw new DigitalStorageError(
            'R2 did not return an ETag; upload cannot be safely promoted.',
            409,
            'DIGITAL_FILE_ETAG_REQUIRED',
          );
        }

        const finalKey = await promoteStagedDigitalObject({
          stagingKey,
          mimeType,
          expectedETag: verified.etag,
        });

        if (finalKey !== file.storageKey) {
          throw new DigitalStorageError(
            'Final storage key did not match the pending record.',
            500,
          );
        }

        promoted = true;

        const [updated] = await db
          .update(productDigitalFiles)
          .set({
            status: 'READY',
            sizeBytes: verified.sizeBytes,
            etag: verified.etag,
            uploadedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(productDigitalFiles.id, id),
              eq(productDigitalFiles.status, 'PENDING_UPLOAD'),
            ),
          )
          .returning({
            id: productDigitalFiles.id,
          });

        if (!updated) {
          const [latest] = await db
            .select()
            .from(productDigitalFiles)
            .where(eq(productDigitalFiles.id, id))
            .limit(1);

          if (latest?.status !== 'READY') {
            return reply.status(409).send({
              statusCode: 409,
              error: 'Conflict',
              message: 'Upload completion state changed; inspect the record before retrying.',
            });
          }
        }

        // Cleanup staging object after promotion
        try {
          await deleteStagedDigitalObject(stagingKey);
        } catch (cleanupError) {
          request.log.warn(
            { err: cleanupError, fileId: id },
            'Could not remove completed digital-file staging object',
          );
        }

        return reply.send({
          success: true,
          fileId: id,
          status: 'READY',
          sizeBytes: verified.sizeBytes,
        });
      } catch (err) {
        if (
          !promoted &&
          err instanceof DigitalStorageError &&
          err.statusCode < 500
        ) {
          try {
            await markFailed(id);
          } catch (dbError) {
            request.log.error(
              { err: dbError, fileId: id },
              'Could not mark invalid digital upload as FAILED',
            );
          }

          try {
            await deleteStagedDigitalObject(stagingKey);
          } catch (cleanupError) {
            request.log.warn(
              { err: cleanupError, fileId: id },
              'Could not clean up failed digital-file staging object',
            );
          }
        }

        throw err;
      }
    } catch (err) {
      request.log.error({ err, fileId: id }, 'Digital-file completion failed');
      return sendError(reply, err);
    }
  });

  /**
   * GET /api/v1/admin/digital-files/product/:productId
   * Lists all digital files for a given product with associated customer purchase count.
   */
  app.get<{ Params: { productId: string } }>(
    '/product/:productId',
    async (request, reply) => {
      const { productId } = request.params;

      if (!UUID_RE.test(productId)) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid product ID.',
        });
      }

      const db = getDb();

      try {
        const files = await db
          .select({
            id: productDigitalFiles.id,
            productId: productDigitalFiles.productId,
            originalFilename: productDigitalFiles.originalFilename,
            mimeType: productDigitalFiles.mimeType,
            sizeBytes: productDigitalFiles.sizeBytes,
            status: productDigitalFiles.status,
            uploadedAt: productDigitalFiles.uploadedAt,
            createdAt: productDigitalFiles.createdAt,
            updatedAt: productDigitalFiles.updatedAt,
          })
          .from(productDigitalFiles)
          .where(eq(productDigitalFiles.productId, productId))
          .orderBy(desc(productDigitalFiles.createdAt));

        const [orderCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .where(
            and(
              eq(orderItems.productId, productId),
              eq(orders.status, 'COMPLETED'),
              eq(orders.paymentStatus, 'SUCCESSFUL'),
            ),
          );

        return reply.send({
          success: true,
          data: files,
          completedOrdersCount: Number(orderCountResult?.count || 0),
        });
      } catch (err) {
        request.log.error({ err, productId }, 'Failed to list product digital files');
        return sendError(reply, err);
      }
    },
  );

  /**
   * DELETE /api/v1/admin/digital-files/:id
   * Authenticated Admin deletion endpoint.
   *
   * Safeguards:
   * 1. Customer Entitlement Guard: If ANY completed, successfully paid orders exist for this product,
   *    permanent deletion is unconditionally blocked (409 Conflict). Customer access is never revoked.
   * 2. State & Retry Safety: Transitions DB status to 'DELETING' prior to storage operations.
   *    If storage deletion fails, the DB record is PRESERVED in 'DELETING' status and an HTTP 502
   *    retryable error is returned. The DB record is NEVER deleted on storage failure.
   * 3. Idempotent Missing Objects: Missing R2 objects (404/NoSuchKey) are treated as successful deletions.
   * 4. Safe Retry: Retrying a file in 'DELETING' state re-executes storage cleanup and finishes DB deletion.
   */
  app.delete<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;

    if (!UUID_RE.test(id)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid digital-file ID.',
      });
    }

    const db = getDb();

    try {
      const [file] = await db
        .select()
        .from(productDigitalFiles)
        .where(eq(productDigitalFiles.id, id))
        .limit(1);

      if (!file) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NotFound',
          message: 'Digital file not found.',
        });
      }

      // Check for completed customer orders for this product
      const [orderCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(
          and(
            eq(orderItems.productId, file.productId),
            eq(orders.status, 'COMPLETED'),
            eq(orders.paymentStatus, 'SUCCESSFUL'),
          ),
        );

      const completedOrdersCount = Number(orderCountResult?.count || 0);

      // Entitlement protection safeguard: Unconditionally block permanent deletion if orders exist
      if (completedOrdersCount > 0) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: `Cannot delete digital file: ${completedOrdersCount} completed customer order(s) exist for this product. Permanent deletion would revoke paid customer access. Archival/versioning must be used instead.`,
          completedOrdersCount,
        });
      }

      // Transition DB record to DELETING to persist intent and allow safe retries
      if (file.status !== 'DELETING') {
        await db
          .update(productDigitalFiles)
          .set({ status: 'DELETING', updatedAt: new Date() })
          .where(eq(productDigitalFiles.id, id));
      }

      // Execute storage cleanup in Cloudflare R2
      if (file.storageDriver === 'r2') {
        const finalKey = file.storageKey;
        if (!FINAL_KEY_RE.test(finalKey)) {
          throw new DigitalStorageError(
            `Stored storage key "${finalKey}" has an invalid format; storage deletion aborted.`,
            500,
          );
        }

        const stagingKey = createDigitalStagingKey(finalKey);

        const deleteStorageIdempotently = async (key: string, isStaging: boolean) => {
          try {
            if (isStaging) {
              await deleteStagedDigitalObject(key);
            } else {
              await deleteDigitalObject(key);
            }
          } catch (storageErr: any) {
            const isMissing =
              storageErr?.name === 'NoSuchKey' ||
              storageErr?.name === 'NotFound' ||
              storageErr?.$metadata?.httpStatusCode === 404 ||
              storageErr?.code === 'NoSuchKey';

            if (!isMissing) {
              throw storageErr;
            }
          }
        };

        try {
          if (file.status === 'READY' || file.status === 'DELETING') {
            // Delete promoted final object
            await deleteStorageIdempotently(finalKey, false);
            // Also idempotently remove any lingering staging object
            await deleteStorageIdempotently(stagingKey, true);
          } else {
            // PENDING_UPLOAD or FAILED file: staging object only
            await deleteStorageIdempotently(stagingKey, true);
          }
        } catch (storageErr: any) {
          request.log.error(
            { err: storageErr, fileId: id, storageKey: finalKey },
            'R2 storage deletion failed. Retaining DB record in DELETING status for retry.',
          );
          return reply.status(502).send({
            statusCode: 502,
            error: 'BadGateway',
            message: `R2 storage deletion failed: ${storageErr?.message || 'Storage error'}. Database record is retained in DELETING status and can be safely retried.`,
            fileId: id,
            status: 'DELETING',
          });
        }
      }

      // ONLY remove the database record when storage deletion was confirmed successful (or already missing)
      await db.delete(productDigitalFiles).where(eq(productDigitalFiles.id, id));

      return reply.send({
        success: true,
        message: 'Digital file deleted successfully.',
        fileId: id,
        completedOrdersCount: 0,
      });
    } catch (err) {
      request.log.error({ err, fileId: id }, 'Failed to delete digital file');
      return sendError(reply, err);
    }
  });

  /**
   * POST /api/v1/admin/digital-files/cleanup-stale
   * Admin maintenance endpoint to trigger a sweep of abandoned staging uploads.
   */
  app.post<{
    Body?: { maxAgeHours?: number; limit?: number; dryRun?: boolean };
  }>('/cleanup-stale', async (request, reply) => {
    try {
      const options = request.body || {};
      const result = await cleanupStalePendingUploads(options);
      return reply.send({
        success: true,
        ...result,
      });
    } catch (err) {
      request.log.error({ err }, 'Manual stale upload cleanup failed');
      return sendError(reply, err);
    }
  });
};