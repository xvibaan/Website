"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryAdminRoutes = void 0;
const category_service_1 = require("../services/category.service");
const admin_validation_1 = require("../validation/admin.validation");
const categoryAdminRoutes = async (app) => {
    /**
     * GET /api/v1/admin/categories
     * Lists categories.
     */
    app.get('/', async (request, reply) => {
        const parseResult = admin_validation_1.categoryQuerySchema.safeParse(request.query);
        const isActive = parseResult.success ? parseResult.data.isActive : undefined;
        const list = await category_service_1.categoryAdminService.getCategories(isActive);
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
        const parseResult = admin_validation_1.createCategorySchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid category input',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        try {
            const created = await category_service_1.categoryAdminService.createCategory(parseResult.data, request.user.userId);
            return reply.status(201).send({
                success: true,
                category: created,
            });
        }
        catch (err) {
            if (err.code === '23505' ||
                err.cause?.code === '23505' ||
                err.message?.includes('23505') ||
                err.message?.includes('duplicate key') ||
                err.message?.includes('unique constraint')) {
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
        const paramResult = admin_validation_1.categoryIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid category ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = admin_validation_1.updateCategorySchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid category update payload',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const updated = await category_service_1.categoryAdminService.updateCategory(paramResult.data.id, bodyResult.data, request.user.userId);
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
        const paramResult = admin_validation_1.categoryIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid category ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = admin_validation_1.updateCategoryStatusSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid category status payload',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const updated = await category_service_1.categoryAdminService.updateCategoryStatus(paramResult.data.id, bodyResult.data.isActive, request.user.userId);
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
exports.categoryAdminRoutes = categoryAdminRoutes;
