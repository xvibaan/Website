import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../auth/auth.middleware';
import { orderService } from './order.service';
import { z } from 'zod';
import { rateLimitOverrides } from '../rate-limit';

const createOrderSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive().default(1).optional(),
  items: z.array(z.any()).optional(),
  idempotencyKey: z.string().optional(),
});

export const orderRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

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

    const orders = await orderService.getCustomerOrders(request.user.userId);
    return reply.status(200).send(orders);
  });

  /**
   * GET /api/v1/orders/:id
   * Returns a specific order for the authenticated customer.
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Authentication required' });
    }
    const orderId = parseInt(request.params.id, 10);
    if (isNaN(orderId)) {
      return reply.status(400).send({ statusCode: 400, error: 'BadRequest', message: 'Invalid order ID' });
    }
    const orders = await orderService.getCustomerOrders(request.user.userId);
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
  app.post('/', rateLimitOverrides.orderCreate, async (request, reply) => {
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
      const order = await orderService.createOrder(
        request.user.userId,
        productId,
        quantity,
        idempotencyKey,
        variantId || undefined
      );
      return reply.status(201).send(order);
    } catch (err: any) {
      request.log.error(err, 'Failed to create order');
      return reply.status(err.statusCode || 500).send({
        statusCode: err.statusCode || 500,
        error: err.name || 'InternalServerError',
        message: err.message || 'Failed to create order',
      });
    }
  });
};
