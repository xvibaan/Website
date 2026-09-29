"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRoutes = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
const dashboardRoutes = async (app) => {
    /**
     * GET /api/v1/admin/dashboard
     * Consolidated real-time database overview metrics.
     */
    app.get('/', async (_request, reply) => {
        const overview = await dashboard_service_1.dashboardAdminService.getDashboardOverview();
        return reply.status(200).send(overview);
    });
};
exports.dashboardRoutes = dashboardRoutes;
