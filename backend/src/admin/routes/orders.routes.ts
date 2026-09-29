import { FastifyPluginAsync } from 'fastify';

export const orderAdminRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/admin/orders
   * Interface contract for future Phase 8 Order Fulfillment & Processing engine.
   */
  app.get('/', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      orders: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
      status: 'NOT_IMPLEMENTED',
      message: 'Order processing and provider fulfillment engine is scheduled for Phase 8 implementation',
    });
  });

  /**
   * GET /api/v1/admin/orders/:id
   * Single order detail contract for Phase 8.
   */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.status(200).send({
      success: true,
      order: null,
      requestedId: id,
      status: 'NOT_IMPLEMENTED',
      message: 'Order processing engine is scheduled for Phase 8 implementation',
    });
  });
};
