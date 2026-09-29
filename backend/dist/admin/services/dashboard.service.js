"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardAdminService = exports.DashboardAdminService = void 0;
const analytics_service_1 = require("./analytics.service");
const audit_service_1 = require("./audit.service");
class DashboardAdminService {
    async getDashboardOverview() {
        const summary = await analytics_service_1.analyticsAdminService.getSummary('LAST_30_DAYS');
        const recentAudit = await audit_service_1.auditService.getLogs({ page: 1, limit: 5 });
        return {
            success: true,
            timestamp: new Date(),
            metrics: {
                customers: summary.customers,
                wallets: summary.wallets,
                payments: summary.payments,
                providers: summary.providers,
                catalog: summary.catalog,
                orders: summary.orders,
                financial: summary.financial,
            },
            recentActivity: recentAudit.logs,
        };
    }
}
exports.DashboardAdminService = DashboardAdminService;
exports.dashboardAdminService = new DashboardAdminService();
