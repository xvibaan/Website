"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productAdminRoutes = void 0;
const product_service_1 = require("../services/product.service");
const admin_validation_1 = require("../validation/admin.validation");
const productAdminRoutes = async (app) => {
    /**
     * GET /api/v1/admin/products
     * Lists products with category, provider information, and pagination.
     */
    app.get('/', async (request, reply) => {
        const parseResult = admin_validation_1.productQuerySchema.safeParse(request.query);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid query parameters',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const { page, limit, categoryId, providerId, status, search } = parseResult.data;
        const { products, total } = await product_service_1.productAdminService.getProducts({
            page,
            limit,
            categoryId,
            providerId,
            status,
            search,
        });
        return reply.status(200).send({
            success: true,
            products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    });
    /**
     * GET /api/v1/admin/products/:id
     * Retrieves single product with admin-level pricing, category, variants, resources, and provider mapping.
     */
    app.get('/:id', async (request, reply) => {
        const paramResult = admin_validation_1.productIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid product ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const product = await product_service_1.productAdminService.getProductById(paramResult.data.id);
        if (!product) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Product '${paramResult.data.id}' not found`,
            });
        }
        return reply.status(200).send({
            success: true,
            product,
        });
    });
    /**
     * POST /api/v1/admin/products
     * Creates a new product with validated monetary prices.
     */
    app.post('/', async (request, reply) => {
        const parseResult = admin_validation_1.createProductSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid product input',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        try {
            const created = await product_service_1.productAdminService.createProduct(parseResult.data, request.user.userId);
            return reply.status(201).send({
                success: true,
                product: created,
            });
        }
        catch (err) {
            if (err.code === '23505') {
                return reply.status(409).send({
                    statusCode: 409,
                    error: 'Conflict',
                    message: `Product slug '${parseResult.data.slug}' already exists`,
                });
            }
            throw err;
        }
    });
    /**
     * PATCH /api/v1/admin/products/:id
     * Updates product metadata and pricing.
     */
    app.patch('/:id', async (request, reply) => {
        const paramResult = admin_validation_1.productIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid product ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = admin_validation_1.updateProductSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid product update payload',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const updated = await product_service_1.productAdminService.updateProduct(paramResult.data.id, bodyResult.data, request.user.userId);
        if (!updated) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Product '${paramResult.data.id}' not found`,
            });
        }
        return reply.status(200).send({
            success: true,
            product: updated,
        });
    });
    /**
     * PATCH /api/v1/admin/products/:id/status
     * Updates product availability status ('ACTIVE', 'DISABLED', 'OUT_OF_STOCK', 'DISCONTINUED').
     */
    app.patch('/:id/status', async (request, reply) => {
        const paramResult = admin_validation_1.productIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid product ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = admin_validation_1.updateProductStatusSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid product status payload',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const updated = await product_service_1.productAdminService.updateProductStatus(paramResult.data.id, bodyResult.data.status, request.user.userId);
        if (!updated) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Product '${paramResult.data.id}' not found`,
            });
        }
        return reply.status(200).send({
            success: true,
            product: updated,
        });
    });
    // --- Product Variants Admin Endpoints ---
    /**
     * GET /api/v1/admin/products/:id/variants
     * Lists all variants configured for a product.
     */
    app.get('/:id/variants', async (request, reply) => {
        const paramResult = admin_validation_1.productIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid product ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const variants = await product_service_1.productAdminService.getVariants(paramResult.data.id);
        return reply.status(200).send({
            success: true,
            variants,
        });
    });
    /**
     * POST /api/v1/admin/products/:id/variants
     * Creates a new variant for a product.
     */
    app.post('/:id/variants', async (request, reply) => {
        const paramResult = admin_validation_1.productIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid product ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = admin_validation_1.createVariantSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid variant input',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const created = await product_service_1.productAdminService.createVariant(paramResult.data.id, bodyResult.data, request.user.userId);
        return reply.status(201).send({
            success: true,
            variant: created,
        });
    });
    /**
     * PATCH /api/v1/admin/products/:id/variants/:variantId
     * Updates an existing variant.
     */
    app.patch('/:id/variants/:variantId', async (request, reply) => {
        const paramResult = admin_validation_1.productAndVariantParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid parameters',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = admin_validation_1.updateVariantSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid variant update payload',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const updated = await product_service_1.productAdminService.updateVariant(paramResult.data.id, paramResult.data.variantId, bodyResult.data, request.user.userId);
        return reply.status(200).send({
            success: true,
            variant: updated,
        });
    });
    /**
     * PATCH /api/v1/admin/products/:id/variants/:variantId/status
     * Activates or deactivates a variant.
     */
    app.patch('/:id/variants/:variantId/status', async (request, reply) => {
        const paramResult = admin_validation_1.productAndVariantParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid parameters',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = admin_validation_1.updateVariantStatusSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid variant status payload',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const updated = await product_service_1.productAdminService.updateVariantStatus(paramResult.data.id, paramResult.data.variantId, bodyResult.data.isActive, request.user.userId);
        return reply.status(200).send({
            success: true,
            variant: updated,
        });
    });
    /**
     * DELETE /api/v1/admin/products/:id/variants/:variantId
     * Deletes a variant if not referenced by historical orders.
     */
    app.delete('/:id/variants/:variantId', async (request, reply) => {
        const paramResult = admin_validation_1.productAndVariantParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid parameters',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const result = await product_service_1.productAdminService.deleteVariant(paramResult.data.id, paramResult.data.variantId, request.user.userId);
        return reply.status(200).send(result);
    });
};
exports.productAdminRoutes = productAdminRoutes;
