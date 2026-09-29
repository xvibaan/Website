"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditAdminRoutes = void 0;
const audit_service_1 = require("../services/audit.service");
const admin_validation_1 = require("../validation/admin.validation");
const auditAdminRoutes = async (app) => {
    /**
     * GET /api/v1/admin/audit-logs
     * Immutable audit logs for tracking administrative actions across the platform.
     */
    app.get('/', async (request, reply) => {
        const parseResult = admin_validation_1.auditLogQuerySchema.safeParse(request.query);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid query parameters',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const { page, limit, action, entityType, entityId, adminUserId } = parseResult.data;
        const { logs, total } = await audit_service_1.auditService.getLogs({
            page,
            limit,
            action,
            entityType,
            entityId,
            adminUserId,
        });
        return reply.status(200).send({
            success: true,
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    });
};
exports.auditAdminRoutes = auditAdminRoutes;
