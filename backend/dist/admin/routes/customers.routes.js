"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerAdminRoutes = void 0;
const customer_service_1 = require("../services/customer.service");
const admin_validation_1 = require("../validation/admin.validation");
const customerAdminRoutes = async (app) => {
    /**
     * GET /api/v1/admin/customers
     * Lists customer accounts with search, active filtering, and pagination.
     */
    app.get('/', async (request, reply) => {
        const parseResult = admin_validation_1.customerQuerySchema.safeParse(request.query);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid query parameters',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const { page, limit, search, role, isActive } = parseResult.data;
        const { customers, total } = await customer_service_1.customerAdminService.getCustomers({
            page,
            limit,
            search,
            role,
            isActive,
        });
        return reply.status(200).send({
            success: true,
            customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    });
    /**
     * GET /api/v1/admin/customers/:id
     * Retrieves single customer account details + central wallet summary.
     */
    app.get('/:id', async (request, reply) => {
        const paramResult = admin_validation_1.customerIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid customer ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const customer = await customer_service_1.customerAdminService.getCustomerById(paramResult.data.id);
        if (!customer) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Customer '${paramResult.data.id}' not found`,
            });
        }
        return reply.status(200).send({
            success: true,
            customer,
        });
    });
    /**
     * PATCH /api/v1/admin/customers/:id/status
     * Activates or deactivates a customer account with audit logging.
     */
    app.patch('/:id/status', async (request, reply) => {
        const paramResult = admin_validation_1.customerIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid customer ID',
                issues: paramResult.error.flatten().fieldErrors,
            });
        }
        const bodyResult = admin_validation_1.updateCustomerStatusSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid status update input',
                issues: bodyResult.error.flatten().fieldErrors,
            });
        }
        const { id } = paramResult.data;
        const { isActive, reason } = bodyResult.data;
        const updated = await customer_service_1.customerAdminService.updateCustomerStatus(id, isActive, reason, request.user.userId);
        if (!updated) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Customer '${id}' not found`,
            });
        }
        return reply.status(200).send({
            success: true,
            customer: updated,
        });
    });
};
exports.customerAdminRoutes = customerAdminRoutes;
