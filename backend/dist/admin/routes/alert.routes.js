"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertRoutes = void 0;
const auth_middleware_1 = require("../../auth/auth.middleware");
const alert_service_1 = require("../services/alert.service");
const zod_1 = require("zod");
const getAlertsSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(50),
    type: zod_1.z.string().optional(),
    severity: zod_1.z.string().optional(),
    isResolved: zod_1.z.preprocess((val) => {
        if (val === 'true')
            return true;
        if (val === 'false')
            return false;
        return val;
    }, zod_1.z.boolean().optional()),
});
const alertRoutes = async (app) => {
    // Requires admin role for system alerts
    app.addHook('preHandler', (0, auth_middleware_1.requireRole)('admin'));
    /**
     * GET /api/v1/admin/alerts
     * Retrieves paginated system operational alerts.
     */
    app.get('/', async (request, reply) => {
        const parseResult = getAlertsSchema.safeParse(request.query);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid query parameters',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const { page, limit, type, severity, isResolved } = parseResult.data;
        const result = await alert_service_1.alertService.getAlerts({ page, limit, type, severity, isResolved });
        return reply.status(200).send({
            success: true,
            alerts: result.alerts,
            pagination: {
                total: result.total,
                page,
                limit,
                totalPages: Math.ceil(result.total / limit),
            },
        });
    });
    /**
     * POST /api/v1/admin/alerts/:id/resolve
     * Marks a system alert as resolved.
     */
    app.post('/:id/resolve', async (request, reply) => {
        const { id } = request.params;
        // Zod uuid check
        if (!zod_1.z.string().uuid().safeParse(id).success) {
            return reply.status(400).send({ statusCode: 400, error: 'BadRequest', message: 'Invalid alert ID format' });
        }
        const resolvedAlert = await alert_service_1.alertService.resolveAlert(id, request.user.userId);
        if (!resolvedAlert) {
            return reply.status(404).send({ statusCode: 404, error: 'NotFound', message: 'Alert not found' });
        }
        return reply.status(200).send({
            success: true,
            alert: resolvedAlert,
        });
    });
};
exports.alertRoutes = alertRoutes;
