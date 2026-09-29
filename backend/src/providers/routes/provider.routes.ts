import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../../auth/auth.middleware';
import { providerRepository } from '../repositories/provider.repository';
import { providerResolver } from '../services/ProviderResolver';
import { providerHealthService } from '../services/ProviderHealthService';
import { providerRegistry } from '../registry/ProviderRegistry';
import {
  providerIdParamSchema,
  updateProviderStateSchema,
  providerQuerySchema,
} from '../validation/provider.validation';
import { getDb } from '../../db/client';
import { orders, orderItems } from '../../db/schema/orders';
import { products } from '../../db/schema/products';
import { eq, desc } from 'drizzle-orm';
import { AuditService } from '../../admin/services/audit.service';
import { encryptProviderCredentials } from '../utils/crypto';
import { rateLimitOverrides } from '../../rate-limit';

const auditService = new AuditService();

export const providerRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // All provider management endpoints are strictly restricted to authenticated administrators
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('admin'));

  /**
   * GET /api/v1/admin/providers
   * Lists providers with optional filtering. Returns safe entities only.
   */
  app.get('/', async (request, reply) => {
    const parseResult = providerQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid query parameters',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const { page, limit, isEnabled, health } = parseResult.data;
    const offset = (page - 1) * limit;

    const { providers: list, total } = await providerRepository.findAll({
      isEnabled,
      operationalHealth: health,
      limit,
      offset,
    });

    const safeProviders = list.map((p) => providerRepository.toSafeProvider(p));

    return reply.status(200).send({
      success: true,
      providers: safeProviders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  });

  /**
   * GET /api/v1/admin/providers/adapters
   * Lists all loaded/registered provider adapters in the system.
   */
  app.get('/adapters', async (_request, reply) => {
    const adapters = providerRegistry.listAdapters();
    return reply.status(200).send({
      success: true,
      adapters,
    });
  });

  /**
   * GET /api/v1/admin/providers/:id
   * Retrieves single provider details (sanitized).
   */
  app.get('/:id', async (request, reply) => {
    const paramResult = providerIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid provider ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const { id } = paramResult.data;
    const dbProvider = await providerRepository.findById(id);
    if (!dbProvider) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NotFound',
        message: `Provider '${id}' not found`,
      });
    }

    return reply.status(200).send({
      success: true,
      provider: providerRepository.toSafeProvider(dbProvider),
    });
  });

  /**
   * PATCH /api/v1/admin/providers/:id/state
   * Updates provider business availability (enable/disable, maintenance, priority).
   */
  app.patch('/:id/state', async (request, reply) => {
    const paramResult = providerIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid provider ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const bodyResult = updateProviderStateSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid state update input',
        issues: bodyResult.error.flatten().fieldErrors,
      });
    }

    const { id } = paramResult.data;
    const existing = await providerRepository.findById(id);
    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NotFound',
        message: `Provider '${id}' not found`,
      });
    }

    const updatePayload: any = { ...bodyResult.data };
    delete updatePayload.state;
    delete updatePayload.reason;

    if (bodyResult.data.state) {
      if (bodyResult.data.state === 'ACTIVE') {
        updatePayload.isEnabled = true;
        updatePayload.isMaintenance = false;
      } else if (bodyResult.data.state === 'DISABLED') {
        updatePayload.isEnabled = false;
        updatePayload.isMaintenance = false;
      } else if (bodyResult.data.state === 'MAINTENANCE') {
        updatePayload.isEnabled = true;
        updatePayload.isMaintenance = true;
      }
    }

    if (bodyResult.data.encryptedCredentials) {
      updatePayload.encryptedCredentials = encryptProviderCredentials(bodyResult.data.encryptedCredentials);
    }

    const updated = await providerRepository.update(id, updatePayload);
    if (!updated) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'InternalServerError',
        message: 'Failed to update provider state',
      });
    }

    // Audit Log
    if (request.user) {
      await auditService.record({
        adminUserId: request.user.userId,
        action: 'PROVIDER_STATE_UPDATE',
        entityType: 'PROVIDER',
        entityId: id,
        details: {
          previousState: {
            isEnabled: existing.isEnabled,
            isMaintenance: existing.isMaintenance,
          },
          newState: {
            isEnabled: updated.isEnabled,
            isMaintenance: updated.isMaintenance,
          },
          reason: bodyResult.data.reason || 'Admin state update',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      provider: providerRepository.toSafeProvider(updated),
    });
  });

  /**
   * POST /api/v1/admin/providers/:id/test-connection
   * Runs an on-demand connectivity test using the adapter.
   */
  app.post('/:id/test-connection', rateLimitOverrides.providerTestConnection, async (request, reply) => {
    const paramResult = providerIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid provider ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const { id } = paramResult.data;
    const { adapter, provider } = await providerResolver.resolveForInspection(id);
    const testResult = await adapter.testConnection();

    return reply.status(200).send({
      success: testResult.success,
      provider: {
        id: provider.id,
        code: provider.code,
        name: provider.name,
      },
      testResult,
    });
  });

  /**
   * POST /api/v1/admin/providers/:id/health-check
   * Executes a health check, records operational metrics, and updates DB status.
   */
  app.post('/:id/health-check', rateLimitOverrides.providerHealthCheck, async (request, reply) => {
    const paramResult = providerIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid provider ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const { id } = paramResult.data;
    const result = await providerHealthService.checkHealth(id);

    return reply.status(200).send({
      success: result.success,
      healthCheck: result,
    });
  });

  /**
   * GET /api/v1/admin/providers/:id/health-logs
   * Retrieves historical health logs for auditing and observability.
   */
  app.get('/:id/health-logs', async (request, reply) => {
    const paramResult = providerIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid provider ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const { id } = paramResult.data;
    const logs = await providerHealthService.getHealthLogs(id, 50);

    return reply.status(200).send({
      success: true,
      logs,
    });
  });

  /**
   * POST /api/v1/admin/providers/:id/sync-catalog
   * Executes normalized catalog synchronization via provider adapter.
   */
  app.post('/:id/sync-catalog', rateLimitOverrides.providerCatalogSync, async (request, reply) => {
    const paramResult = providerIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid provider ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const { id } = paramResult.data;
    const { adapter, provider } = await providerResolver.resolveForInspection(id);

    if (!adapter.syncCatalog) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: `Provider adapter '${provider.code}' does not support catalog synchronization`,
      });
    }

    const catalogItems = await adapter.syncCatalog();

    // Query existing marketplace products mapped to this provider
    const db = getDb();
    const mappedProducts = await db
      .select({ id: products.id, name: products.name, providerProductId: products.providerProductId })
      .from(products)
      .where(eq(products.providerId, provider.id));

    const mappedSet = new Set(mappedProducts.map((p) => p.providerProductId).filter(Boolean));

    const enrichedItems = catalogItems.map((item) => ({
      ...item,
      isMapped: mappedSet.has(item.providerProductId),
      mappedProduct: mappedProducts.find((p) => p.providerProductId === item.providerProductId) || null,
    }));

    if (request.user) {
      await auditService.record({
        adminUserId: request.user.userId,
        action: 'PROVIDER_SYNC_CATALOG',
        entityType: 'PROVIDER',
        entityId: id,
        details: {
          providerCode: provider.code,
          totalCatalogItems: catalogItems.length,
          mappedCount: mappedProducts.length,
        },
      });
    }

    return reply.status(200).send({
      success: true,
      provider: {
        id: provider.id,
        code: provider.code,
        name: provider.name,
      },
      syncedAt: new Date().toISOString(),
      totalItems: catalogItems.length,
      mappedItemsCount: mappedProducts.length,
      items: enrichedItems,
    });
  });

  /**
   * GET /api/v1/admin/providers/:id/catalog
   * Retrieves latest normalized catalog products from provider adapter.
   */
  app.get('/:id/catalog', async (request, reply) => {
    const paramResult = providerIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid provider ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const { id } = paramResult.data;
    const { adapter, provider } = await providerResolver.resolveForInspection(id);

    if (!adapter.syncCatalog) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: `Provider adapter '${provider.code}' does not support catalog synchronization`,
      });
    }

    const items = await adapter.syncCatalog();

    return reply.status(200).send({
      success: true,
      provider: {
        id: provider.id,
        code: provider.code,
        name: provider.name,
      },
      totalItems: items.length,
      items,
    });
  });

  /**
   * GET /api/v1/admin/providers/:id/orders
   * Retrieves historical orders fulfilled by this provider.
   */
  app.get('/:id/orders', async (request, reply) => {
    const paramResult = providerIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid provider ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const { id } = paramResult.data;
    const db = getDb();
    const rows = await db
      .select({
        orderItemId: orderItems.id,
        orderId: orderItems.orderId,
        productNameSnapshot: orderItems.productNameSnapshot,
        variantNameSnapshot: orderItems.variantNameSnapshot,
        priceAtPurchase: orderItems.priceAtPurchase,
        providerCostSnapshot: orderItems.providerCostSnapshot,
        providerProductId: orderItems.providerProductId,
        quantity: orderItems.quantity,
        fulfillmentStatus: orderItems.fulfillmentStatus,
        createdAt: orderItems.createdAt,
        orderTotalAmount: orders.totalAmount,
        orderStatus: orders.status,
        orderReference: orders.reference,
        userId: orders.userId,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orderItems.providerId, id))
      .orderBy(desc(orderItems.createdAt))
      .limit(50);

    return reply.status(200).send({
      success: true,
      total: rows.length,
      orders: rows,
    });
  });
};
