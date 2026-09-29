"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerRoutes = void 0;
const auth_middleware_1 = require("../../auth/auth.middleware");
const provider_repository_1 = require("../repositories/provider.repository");
const ProviderResolver_1 = require("../services/ProviderResolver");
const ProviderHealthService_1 = require("../services/ProviderHealthService");
const ProviderRegistry_1 = require("../registry/ProviderRegistry");
const provider_validation_1 = require("../validation/provider.validation");
const client_1 = require("../../db/client");
const orders_1 = require("../../db/schema/orders");
const products_1 = require("../../db/schema/products");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../admin/services/audit.service");
const crypto_1 = require("../utils/crypto");
const rate_limit_1 = require("../../rate-limit");
const auditService = new audit_service_1.AuditService();
const providerRoutes = async (app) => {
    // All provider management endpoints are strictly restricted to authenticated administrators
    app.addHook('preHandler', auth_middleware_1.authenticate);
    app.addHook('preHandler', (0, auth_middleware_1.requireRole)('admin'));
    /**
     * GET /api/v1/admin/providers
     * Lists providers with optional filtering. Returns safe entities only.
     */
    app.get('/', async (request, reply) => {
        const parseResult = provider_validation_1.providerQuerySchema.safeParse(request.query);
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
        const { providers: list, total } = await provider_repository_1.providerRepository.findAll({
            isEnabled,
            operationalHealth: health,
            limit,
            offset,
        });
        const safeProviders = list.map((p) => provider_repository_1.providerRepository.toSafeProvider(p));
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
        const adapters = ProviderRegistry_1.providerRegistry.listAdapters();
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
        const paramResult = provider_validation_1.providerIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid provider ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const { id } = paramResult.data;
        const dbProvider = await provider_repository_1.providerRepository.findById(id);
        if (!dbProvider) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Provider '${id}' not found`,
            });
        }
        return reply.status(200).send({
            success: true,
            provider: provider_repository_1.providerRepository.toSafeProvider(dbProvider),
        });
    });
    /**
     * PATCH /api/v1/admin/providers/:id/state
     * Updates provider business availability (enable/disable, maintenance, priority).
     */
    app.patch('/:id/state', async (request, reply) => {
        const paramResult = provider_validation_1.providerIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid provider ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = provider_validation_1.updateProviderStateSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid state update input',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const { id } = paramResult.data;
        const existing = await provider_repository_1.providerRepository.findById(id);
        if (!existing) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Provider '${id}' not found`,
            });
        }
        const updatePayload = { ...bodyResult.data };
        delete updatePayload.state;
        delete updatePayload.reason;
        if (bodyResult.data.state) {
            if (bodyResult.data.state === 'ACTIVE') {
                updatePayload.isEnabled = true;
                updatePayload.isMaintenance = false;
            }
            else if (bodyResult.data.state === 'DISABLED') {
                updatePayload.isEnabled = false;
                updatePayload.isMaintenance = false;
            }
            else if (bodyResult.data.state === 'MAINTENANCE') {
                updatePayload.isEnabled = true;
                updatePayload.isMaintenance = true;
            }
        }
        if (bodyResult.data.encryptedCredentials) {
            updatePayload.encryptedCredentials = (0, crypto_1.encryptProviderCredentials)(bodyResult.data.encryptedCredentials);
        }
        const updated = await provider_repository_1.providerRepository.update(id, updatePayload);
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
            provider: provider_repository_1.providerRepository.toSafeProvider(updated),
        });
    });
    /**
     * POST /api/v1/admin/providers/:id/test-connection
     * Runs an on-demand connectivity test using the adapter.
     */
    app.post('/:id/test-connection', rate_limit_1.rateLimitOverrides.providerTestConnection, async (request, reply) => {
        const paramResult = provider_validation_1.providerIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid provider ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const { id } = paramResult.data;
        const { adapter, provider } = await ProviderResolver_1.providerResolver.resolveForInspection(id);
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
    app.post('/:id/health-check', rate_limit_1.rateLimitOverrides.providerHealthCheck, async (request, reply) => {
        const paramResult = provider_validation_1.providerIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid provider ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const { id } = paramResult.data;
        const result = await ProviderHealthService_1.providerHealthService.checkHealth(id);
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
        const paramResult = provider_validation_1.providerIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid provider ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const { id } = paramResult.data;
        const logs = await ProviderHealthService_1.providerHealthService.getHealthLogs(id, 50);
        return reply.status(200).send({
            success: true,
            logs,
        });
    });
    /**
     * POST /api/v1/admin/providers/:id/sync-catalog
     * Executes normalized catalog synchronization via provider adapter.
     */
    app.post('/:id/sync-catalog', rate_limit_1.rateLimitOverrides.providerCatalogSync, async (request, reply) => {
        const paramResult = provider_validation_1.providerIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid provider ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const { id } = paramResult.data;
        const { adapter, provider } = await ProviderResolver_1.providerResolver.resolveForInspection(id);
        if (!adapter.syncCatalog) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: `Provider adapter '${provider.code}' does not support catalog synchronization`,
            });
        }
        const catalogItems = await adapter.syncCatalog();
        // Query existing marketplace products mapped to this provider
        const db = (0, client_1.getDb)();
        const mappedProducts = await db
            .select({ id: products_1.products.id, name: products_1.products.name, providerProductId: products_1.products.providerProductId })
            .from(products_1.products)
            .where((0, drizzle_orm_1.eq)(products_1.products.providerId, provider.id));
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
        const paramResult = provider_validation_1.providerIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid provider ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const { id } = paramResult.data;
        const { adapter, provider } = await ProviderResolver_1.providerResolver.resolveForInspection(id);
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
        const paramResult = provider_validation_1.providerIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid provider ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const { id } = paramResult.data;
        const db = (0, client_1.getDb)();
        const rows = await db
            .select({
            orderItemId: orders_1.orderItems.id,
            orderId: orders_1.orderItems.orderId,
            productNameSnapshot: orders_1.orderItems.productNameSnapshot,
            variantNameSnapshot: orders_1.orderItems.variantNameSnapshot,
            priceAtPurchase: orders_1.orderItems.priceAtPurchase,
            providerCostSnapshot: orders_1.orderItems.providerCostSnapshot,
            providerProductId: orders_1.orderItems.providerProductId,
            quantity: orders_1.orderItems.quantity,
            fulfillmentStatus: orders_1.orderItems.fulfillmentStatus,
            createdAt: orders_1.orderItems.createdAt,
            orderTotalAmount: orders_1.orders.totalAmount,
            orderStatus: orders_1.orders.status,
            orderReference: orders_1.orders.reference,
            userId: orders_1.orders.userId,
        })
            .from(orders_1.orderItems)
            .innerJoin(orders_1.orders, (0, drizzle_orm_1.eq)(orders_1.orderItems.orderId, orders_1.orders.id))
            .where((0, drizzle_orm_1.eq)(orders_1.orderItems.providerId, id))
            .orderBy((0, drizzle_orm_1.desc)(orders_1.orderItems.createdAt))
            .limit(50);
        return reply.status(200).send({
            success: true,
            total: rows.length,
            orders: rows,
        });
    });
};
exports.providerRoutes = providerRoutes;
