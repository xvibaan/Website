import { FastifyPluginAsync } from 'fastify';
import { categoryAdminService } from '../services/category.service';
import {
  createCategorySchema,
  updateCategorySchema,
  updateCategoryStatusSchema,
  categoryIdParamSchema,
  categoryQuerySchema,
} from '../validation/admin.validation';

export const categoryAdminRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/admin/categories
   * Lists categories.
   */
  app.get('/', async (request, reply) => {
    const parseResult = categoryQuerySchema.safeParse(request.query);
    const isActive = parseResult.success ? parseResult.data.isActive : undefined;

    const list = await categoryAdminService.getCategories(isActive);
    return reply.status(200).send({
      success: true,
      categories: list,
    });
  });

  /**
   * POST /api/v1/admin/categories
   * Creates a new product category.
   */
  app.post('/', async (request, reply) => {
    const parseResult = createCategorySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid category input',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    try {
      const created = await categoryAdminService.createCategory(
        parseResult.data,
        request.user!.userId
      );
      return reply.status(201).send({
        success: true,
        category: created,
      });
    } catch (err: any) {
      if (
        err.code === '23505' ||
        err.cause?.code === '23505' ||
        err.message?.includes('23505') ||
        err.message?.includes('duplicate key') ||
        err.message?.includes('unique constraint')
      ) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: `Category slug '${parseResult.data.slug}' already exists`,
        });
      }
      throw err;
    }
  });

  /**
   * PATCH /api/v1/admin/categories/:id
   * Updates category metadata.
   */
  app.patch('/:id', async (request, reply) => {
    const paramResult = categoryIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid category ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const bodyResult = updateCategorySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid category update payload',
        issues: bodyResult.error.flatten().fieldErrors,
      });
    }

    const updated = await categoryAdminService.updateCategory(
      paramResult.data.id,
      bodyResult.data,
      request.user!.userId
    );

    if (!updated) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NotFound',
        message: `Category '${paramResult.data.id}' not found`,
      });
    }

    return reply.status(200).send({
      success: true,
      category: updated,
    });
  });

  /**
   * PATCH /api/v1/admin/categories/:id/status
   * Enables or disables a category.
   */
  app.patch('/:id/status', async (request, reply) => {
    const paramResult = categoryIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid category ID',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const bodyResult = updateCategoryStatusSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid category status payload',
        issues: bodyResult.error.flatten().fieldErrors,
      });
    }

    const updated = await categoryAdminService.updateCategoryStatus(
      paramResult.data.id,
      bodyResult.data.isActive,
      request.user!.userId
    );

    if (!updated) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NotFound',
        message: `Category '${paramResult.data.id}' not found`,
      });
    }

    return reply.status(200).send({
      success: true,
      category: updated,
    });
  });
};
