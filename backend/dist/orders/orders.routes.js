"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRoutes = void 0;
const auth_middleware_1 = require("../auth/auth.middleware");
const order_service_1 = require("./order.service");
const zod_1 = require("zod");
const rate_limit_1 = require("../rate-limit");
const createOrderSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    variantId: zod_1.z.string().uuid().optional().nullable(),
    quantity: zod_1.z.number().int().positive().default(1).optional(),
    items: zod_1.z.array(zod_1.z.any()).optional(),
    idempotencyKey: zod_1.z.string().optional(),
});
const orderRoutes = async (app) => {
    app.addHook('preHandler', auth_middleware_1.authenticate);
    /**
     * GET /api/v1/orders
     * Returns orders for the authenticated customer.
     */
    app.get('/', async (request, reply) => {
        if (!request.user) {
            return reply.status(401).send({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        const orders = await order_service_1.orderService.getCustomerOrders(request.user.userId);
        return reply.status(200).send(orders);
    });
    /**
     * GET /api/v1/orders/:id
     * Returns a specific order for the authenticated customer.
     */
    app.get('/:id', async (request, reply) => {
        if (!request.user) {
            return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Authentication required' });
        }
        const orderId = parseInt(request.params.id, 10);
        if (isNaN(orderId)) {
            return reply.status(400).send({ statusCode: 400, error: 'BadRequest', message: 'Invalid order ID' });
        }
        const orders = await order_service_1.orderService.getCustomerOrders(request.user.userId);
        const order = orders.find(o => o.id === orderId);
        if (!order) {
            return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Order not found' });
        }
        return reply.status(200).send(order);
    });
    /**
     * POST /api/v1/orders
     * Creates a new order and atomically debits the customer wallet.
     */
    app.post('/', rate_limit_1.rateLimitOverrides.orderCreate, async (request, reply) => {
        if (!request.user) {
            return reply.status(401).send({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        const parseResult = createOrderSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid order parameters',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const { productId, variantId, quantity = 1, idempotencyKey } = parseResult.data;
        try {
            const order = await order_service_1.orderService.createOrder(request.user.userId, productId, quantity, idempotencyKey, variantId || undefined);
            return reply.status(201).send(order);
        }
        catch (err) {
            request.log.error(err, 'Failed to create order');
            return reply.status(err.statusCode || 500).send({
                statusCode: err.statusCode || 500,
                error: err.name || 'InternalServerError',
                message: err.message || 'Failed to create order',
            });
        }
    });
};
exports.orderRoutes = orderRoutes;
