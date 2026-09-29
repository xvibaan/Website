"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsAdminRoutes = void 0;
const settings_service_1 = require("../services/settings.service");
const admin_validation_1 = require("../validation/admin.validation");
const settingsAdminRoutes = async (app) => {
    /**
     * GET /api/v1/admin/settings
     * Platform configuration settings.
     */
    app.get('/', async (_request, reply) => {
        const settings = await settings_service_1.settingsAdminService.getAllSettings();
        return reply.status(200).send({
            success: true,
            settings,
        });
    });
    /**
     * PATCH /api/v1/admin/settings
     * Updates platform settings with audit logging.
     */
    app.patch('/', async (request, reply) => {
        const parseResult = admin_validation_1.updateSettingsSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid settings payload',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const updated = await settings_service_1.settingsAdminService.updateSettings(parseResult.data.settings, request.user.userId);
        return reply.status(200).send({
            success: true,
            settings: updated,
        });
    });
};
exports.settingsAdminRoutes = settingsAdminRoutes;
