"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceAdminRoutes = void 0;
const resource_service_1 = require("../services/resource.service");
const admin_validation_1 = require("../validation/admin.validation");
const resourceAdminRoutes = async (app) => {
    /**
     * GET /api/v1/admin/resources
     * Lists centralized platform resources (tutorials, how-to-buy, support links, etc.).
     */
    app.get('/', async (request, reply) => {
        const parseResult = admin_validation_1.resourceQuerySchema.safeParse(request.query);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid query parameters',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const { page, limit, type, status, productId } = parseResult.data;
        const { resources, total } = await resource_service_1.resourceAdminService.getResources({
            page,
            limit,
            type,
            status,
            productId,
        });
        return reply.status(200).send({
            success: true,
            resources,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    });
    /**
     * GET /api/v1/admin/resources/:id
     * Single resource detail.
     */
    app.get('/:id', async (request, reply) => {
        const paramResult = admin_validation_1.resourceIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid resource ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const res = await resource_service_1.resourceAdminService.getResourceById(paramResult.data.id);
        if (!res) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Resource '${paramResult.data.id}' not found`,
            });
        }
        return reply.status(200).send({
            success: true,
            resource: res,
        });
    });
    /**
     * POST /api/v1/admin/resources
     * Creates a new centralized resource / tutorial / support link.
     */
    app.post('/', async (request, reply) => {
        const parseResult = admin_validation_1.createResourceSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid resource input',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const created = await resource_service_1.resourceAdminService.createResource(parseResult.data, request.user.userId);
        return reply.status(201).send({
            success: true,
            resource: created,
        });
    });
    /**
     * PATCH /api/v1/admin/resources/:id
     * Updates resource metadata and URL.
     */
    app.patch('/:id', async (request, reply) => {
        const paramResult = admin_validation_1.resourceIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid resource ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = admin_validation_1.updateResourceSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid resource update payload',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const updated = await resource_service_1.resourceAdminService.updateResource(paramResult.data.id, bodyResult.data, request.user.userId);
        if (!updated) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Resource '${paramResult.data.id}' not found`,
            });
        }
        return reply.status(200).send({
            success: true,
            resource: updated,
        });
    });
    /**
     * PATCH /api/v1/admin/resources/:id/status
     * Activates or disables a resource.
     */
    app.patch('/:id/status', async (request, reply) => {
        const paramResult = admin_validation_1.resourceIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid resource ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = admin_validation_1.updateResourceStatusSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid resource status payload',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const updated = await resource_service_1.resourceAdminService.updateResourceStatus(paramResult.data.id, bodyResult.data.status, request.user.userId);
        if (!updated) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Resource '${paramResult.data.id}' not found`,
            });
        }
        return reply.status(200).send({
            success: true,
            resource: updated,
        });
    });
    /**
     * DELETE /api/v1/admin/resources/:id
     * Removes a resource with audit logging.
     */
    app.delete('/:id', async (request, reply) => {
        const paramResult = admin_validation_1.resourceIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid resource ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const deleted = await resource_service_1.resourceAdminService.deleteResource(paramResult.data.id, request.user.userId);
        if (!deleted) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Resource '${paramResult.data.id}' not found`,
            });
        }
        return reply.status(200).send({
            success: true,
            message: 'Resource successfully deleted',
        });
    });
};
exports.resourceAdminRoutes = resourceAdminRoutes;
