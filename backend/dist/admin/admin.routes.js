"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const auth_middleware_1 = require("../auth/auth.middleware");
const dashboard_routes_1 = require("./routes/dashboard.routes");
const customers_routes_1 = require("./routes/customers.routes");
const categories_routes_1 = require("./routes/categories.routes");
const products_routes_1 = require("./routes/products.routes");
const pricing_routes_1 = require("./routes/pricing.routes");
const resources_routes_1 = require("./routes/resources.routes");
const audit_routes_1 = require("./routes/audit.routes");
const settings_routes_1 = require("./routes/settings.routes");
const analytics_routes_1 = require("./routes/analytics.routes");
const orders_routes_1 = require("./routes/orders.routes");
const wallets_routes_1 = require("./routes/wallets.routes");
const payments_routes_1 = require("./routes/payments.routes");
const provider_routes_1 = require("../providers/routes/provider.routes");
const media_routes_1 = require("./routes/media.routes");
const alert_routes_1 = require("./routes/alert.routes");
const resellers_routes_1 = require("./routes/resellers.routes");
const website_instances_routes_1 = require("./routes/website-instances.routes");
const adminRoutes = async (app) => {
    // Enforce server-side authentication and admin RBAC across all /api/v1/admin endpoints
    app.addHook('preHandler', auth_middleware_1.authenticate);
    app.addHook('preHandler', (0, auth_middleware_1.requireRole)('admin'));
    /**
     * GET /api/v1/admin/health
     * Protected Admin Boundary check
     */
    app.get('/health', async (request) => {
        return {
            status: 'ok',
            admin: {
                id: request.user?.userId,
                email: request.user?.email,
                role: request.user?.role,
            },
        };
    });
    // Admin Dashboard Overview
    app.register(dashboard_routes_1.dashboardRoutes, { prefix: '/dashboard' });
    // Customer Management
    app.register(customers_routes_1.customerAdminRoutes, { prefix: '/customers' });
    // Product & Category Management
    app.register(categories_routes_1.categoryAdminRoutes, { prefix: '/categories' });
    app.register(products_routes_1.productAdminRoutes, { prefix: '/products' });
    app.register(pricing_routes_1.pricingAdminRoutes, { prefix: '/pricing' });
    // Centralized Resources (How to Buy, Tutorials, Support Links)
    app.register(resources_routes_1.resourceAdminRoutes, { prefix: '/resources' });
    // Immutable Audit Logs
    app.register(audit_routes_1.auditAdminRoutes, { prefix: '/audit-logs' });
    // Platform Configuration & Settings
    app.register(settings_routes_1.settingsAdminRoutes, { prefix: '/settings' });
    // Real Database Analytics
    app.register(analytics_routes_1.analyticsAdminRoutes, { prefix: '/analytics' });
    // Order Management Contract (Phase 8 integration)
    app.register(orders_routes_1.orderAdminRoutes, { prefix: '/orders' });
    // Central Wallet Admin Management
    app.register(wallets_routes_1.walletAdminRoutes, { prefix: '/wallets' });
    app.register(wallets_routes_1.walletAdminRoutes, { prefix: '/wallet' });
    // Central Payment Admin Management
    app.register(payments_routes_1.paymentAdminRoutes, { prefix: '/payments' });
    // Multi-Provider Management (Phase 6 reuse)
    app.register(provider_routes_1.providerRoutes, { prefix: '/providers' });
    // Product Media Upload & Management (Phase 3C)
    app.register(media_routes_1.mediaAdminRoutes, { prefix: '/media' });
    // System Alerts (Operational Monitoring)
    // System Alerts (Operational Monitoring)
    app.register(alert_routes_1.alertRoutes, { prefix: '/alerts' });
    // Reseller Management
    app.register(resellers_routes_1.resellerAdminRoutes, { prefix: '/resellers' });
    // Website Instances
    app.register(website_instances_routes_1.websiteInstanceAdminRoutes, { prefix: '/website-instances' });
};
exports.adminRoutes = adminRoutes;
