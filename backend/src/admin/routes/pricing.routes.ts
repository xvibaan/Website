import { FastifyPluginAsync } from 'fastify';
import { pricingAdminService } from '../services/pricing.service';
import {
  updatePricingSchema,
  productIdParamSchema,
  paginationQuerySchema,
} from '../validation/admin.validation';

export const pricingAdminRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/admin/pricing
   * Overview of all product pricing, cost prices, profit margins, and margin percentages.
   */
  app.get('/', async (request, reply) => {
    const parseResult = paginationQuerySchema.safeParse(request.query);
    const page = parseResult.success ? parseResult.data.page : 1;
    const limit = parseResult.success ? parseResult.data.limit : 20;

    const { pricing, total } = await pricingAdminService.getPricingOverview({
      page,
      limit,
    });

    return reply.status(200).send({
      success: true,
      pricing,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  });

  /**
   * PATCH /api/v1/admin/pricing/:id
   * Updates selling price, cost price, and margin calculation with audit logs.
   */
  app.patch('/:id', async (request, reply) => {
    const paramResult = productIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid product ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const bodyResult = updatePricingSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid pricing update payload',
        issues: bodyResult.error.flatten().fieldErrors,
      });
    }

    const updated = await pricingAdminService.updatePricing(
      paramResult.data.id,
      bodyResult.data,
      request.user!.userId
    );

    if (!updated) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NotFound',
        message: `Product '${paramResult.data.id}' not found`,
      });
    }

    return reply.status(200).send({
      success: true,
      pricing: updated,
    });
  });
};
