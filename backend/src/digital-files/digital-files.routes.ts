import { and, eq } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../auth/auth.middleware';
import { getDb } from '../db/client';
import { orders, orderItems, productDigitalFiles } from '../db/schema';
import { rateLimitOverrides } from '../rate-limit';
import {
  createPresignedDigitalDownload,
  type DigitalMimeType,
} from '../storage/R2DigitalStorageService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const digitalFileRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/digital-files/:fileId/download
   * Issues a short-lived private download URL only to an entitled customer.
   * Throttled by dedicated rate limiting (15 req/min per IP).
   */
  app.get<{ Params: { fileId: string } }>(
    '/:fileId/download',
    rateLimitOverrides.digitalDownload,
    async (request, reply) => {
      const { fileId } = request.params;

      if (!UUID_RE.test(fileId)) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NotFound',
          message: 'Digital file is unavailable.',
        });
      }

      if (!request.user?.userId) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required.',
        });
      }

      try {
        const db = getDb();

        const [file] = await db
          .select({
            id: productDigitalFiles.id,
            storageKey: productDigitalFiles.storageKey,
            storageDriver: productDigitalFiles.storageDriver,
            mimeType: productDigitalFiles.mimeType,
            filename: productDigitalFiles.originalFilename,
            status: productDigitalFiles.status,
          })
          .from(productDigitalFiles)
          .innerJoin(
            orderItems,
            eq(orderItems.productId, productDigitalFiles.productId),
          )
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .where(
            and(
              eq(productDigitalFiles.id, fileId),
              eq(productDigitalFiles.status, 'READY'),
              eq(productDigitalFiles.storageDriver, 'r2'),
              eq(orders.userId, request.user.userId),
              eq(orders.status, 'COMPLETED'),
              eq(orders.paymentStatus, 'SUCCESSFUL'),
            ),
          )
          .limit(1);

        // Do not reveal whether an inaccessible file exists.
        if (!file || file.status !== 'READY' || file.storageDriver !== 'r2') {
          return reply.status(404).send({
            statusCode: 404,
            error: 'NotFound',
            message: 'Digital file is unavailable.',
          });
        }

        const signed = await createPresignedDigitalDownload({
          storageKey: file.storageKey,
          mimeType: file.mimeType as DigitalMimeType,
          originalFilename: file.filename,
        });

        reply.header(
          'Cache-Control',
          'no-store, no-cache, must-revalidate, proxy-revalidate',
        );
        reply.header('Pragma', 'no-cache');

        return reply.status(200).send({
          success: true,
          fileId: file.id,
          ...signed,
        });
      } catch (err) {
        request.log.error(
          { err, fileId },
          'Authorized digital-file download URL creation failed',
        );

        return reply.status(500).send({
          statusCode: 500,
          error: 'DigitalDownloadError',
          message: 'Unable to create the download link right now.',
        });
      }
    },
  );
  /**
   * GET /api/v1/digital-files/product/:productId
   * Returns list of ready digital files for a product, strictly verifying customer entitlement.
   */
  app.get<{ Params: { productId: string } }>(
    '/product/:productId',
    async (request, reply) => {
      const { productId } = request.params;

      if (!UUID_RE.test(productId)) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NotFound',
          message: 'Digital files are unavailable.',
        });
      }

      if (!request.user?.userId) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required.',
        });
      }

      try {
        const db = getDb();

        // Customer entitlement check: Must have at least one completed, successfully paid order containing this product
        const [order] = await db
          .select({ id: orders.id })
          .from(orders)
          .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
          .where(
            and(
              eq(orders.userId, request.user.userId),
              eq(orderItems.productId, productId),
              eq(orders.status, 'COMPLETED'),
              eq(orders.paymentStatus, 'SUCCESSFUL'),
            ),
          )
          .limit(1);

        if (!order) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'NotFound',
            message: 'Digital files are unavailable.',
          });
        }

        const files = await db
          .select({
            id: productDigitalFiles.id,
            filename: productDigitalFiles.originalFilename,
            mimeType: productDigitalFiles.mimeType,
            sizeBytes: productDigitalFiles.sizeBytes,
            status: productDigitalFiles.status,
          })
          .from(productDigitalFiles)
          .where(
            and(
              eq(productDigitalFiles.productId, productId),
              eq(productDigitalFiles.status, 'READY'),
              eq(productDigitalFiles.storageDriver, 'r2'),
            ),
          );

        return reply.send({
          success: true,
          data: files,
        });
      } catch (err) {
        request.log.error({ err, productId }, 'Customer digital files lookup failed');
        return reply.status(500).send({
          statusCode: 500,
          error: 'InternalServerError',
          message: 'Unable to retrieve digital files right now.',
        });
      }
    },
  );
};
