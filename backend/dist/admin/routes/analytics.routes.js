"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsAdminRoutes = void 0;
const analytics_service_1 = require("../services/analytics.service");
const admin_validation_1 = require("../validation/admin.validation");
const analyticsAdminRoutes = async (app) => {
    /**
     * GET /api/v1/admin/analytics/summary
     * Real database-backed summary analytics across financial, orders, customers, wallets, payments, providers.
     */
    app.get('/summary', async (request, reply) => {
        const parseResult = admin_validation_1.analyticsFilterSchema.safeParse(request.query);
        const timeRange = parseResult.success
            ? parseResult.data.timeRange
            : 'LAST_30_DAYS';
        const startDate = parseResult.success ? parseResult.data.startDate : undefined;
        const endDate = parseResult.success ? parseResult.data.endDate : undefined;
        const providerId = parseResult.success ? parseResult.data.providerId : undefined;
        const summary = await analytics_service_1.analyticsAdminService.getSummary(timeRange, startDate, endDate, providerId);
        return reply.status(200).send({
            success: true,
            analytics: summary,
            summary,
        });
    });
    /**
     * GET /api/v1/admin/analytics/providers-breakdown
     * Provider-wise accounting: orders, gross sales, refunds, net sales, provider cost, gross profit, consolidation.
     */
    app.get('/providers-breakdown', async (request, reply) => {
        const parseResult = admin_validation_1.analyticsFilterSchema.safeParse(request.query);
        const timeRange = parseResult.success
            ? parseResult.data.timeRange
            : 'LAST_30_DAYS';
        const startDate = parseResult.success ? parseResult.data.startDate : undefined;
        const endDate = parseResult.success ? parseResult.data.endDate : undefined;
        const data = await analytics_service_1.analyticsAdminService.getProviderWiseAnalytics(timeRange, startDate, endDate);
        return reply.status(200).send({
            success: true,
            ...data,
        });
    });
    /**
     * GET /api/v1/admin/analytics/daily-sales
     * Daily sales timeline with actual order and refund timestamps.
     */
    app.get('/daily-sales', async (request, reply) => {
        const parseResult = admin_validation_1.analyticsFilterSchema.safeParse(request.query);
        const timeRange = parseResult.success
            ? parseResult.data.timeRange
            : 'LAST_30_DAYS';
        const startDate = parseResult.success ? parseResult.data.startDate : undefined;
        const endDate = parseResult.success ? parseResult.data.endDate : undefined;
        const providerId = parseResult.success ? parseResult.data.providerId : undefined;
        const data = await analytics_service_1.analyticsAdminService.getDailySales(timeRange, startDate, endDate, providerId);
        return reply.status(200).send({
            success: true,
            ...data,
        });
    });
    /**
     * GET /api/v1/admin/analytics/daily-provider-sales
     * Daily sales matrix per provider.
     */
    app.get('/daily-provider-sales', async (request, reply) => {
        const parseResult = admin_validation_1.analyticsFilterSchema.safeParse(request.query);
        const timeRange = parseResult.success
            ? parseResult.data.timeRange
            : 'LAST_30_DAYS';
        const startDate = parseResult.success ? parseResult.data.startDate : undefined;
        const endDate = parseResult.success ? parseResult.data.endDate : undefined;
        const data = await analytics_service_1.analyticsAdminService.getProviderDailySales(timeRange, startDate, endDate);
        return reply.status(200).send({
            success: true,
            ...data,
        });
    });
    /**
     * GET /api/v1/admin/analytics/products-breakdown
     * Product analytics using historical snapshots.
     */
    app.get('/products-breakdown', async (request, reply) => {
        const parseResult = admin_validation_1.analyticsFilterSchema.safeParse(request.query);
        const timeRange = parseResult.success
            ? parseResult.data.timeRange
            : 'LAST_30_DAYS';
        const startDate = parseResult.success ? parseResult.data.startDate : undefined;
        const endDate = parseResult.success ? parseResult.data.endDate : undefined;
        const providerId = parseResult.success ? parseResult.data.providerId : undefined;
        const data = await analytics_service_1.analyticsAdminService.getProductAnalytics(timeRange, startDate, endDate, providerId);
        return reply.status(200).send({
            success: true,
            ...data,
        });
    });
    /**
     * GET /api/v1/admin/analytics/variants-breakdown
     * Variant-level analytics.
     */
    app.get('/variants-breakdown', async (request, reply) => {
        const parseResult = admin_validation_1.analyticsFilterSchema.safeParse(request.query);
        const timeRange = parseResult.success
            ? parseResult.data.timeRange
            : 'LAST_30_DAYS';
        const startDate = parseResult.success ? parseResult.data.startDate : undefined;
        const endDate = parseResult.success ? parseResult.data.endDate : undefined;
        const productId = parseResult.success ? parseResult.data.productId : undefined;
        const data = await analytics_service_1.analyticsAdminService.getVariantAnalytics(timeRange, startDate, endDate, productId);
        return reply.status(200).send({
            success: true,
            ...data,
        });
    });
    /**
     * GET /api/v1/admin/analytics/order-statuses
     * Distribution of orders by status.
     */
    app.get('/order-statuses', async (request, reply) => {
        const parseResult = admin_validation_1.analyticsFilterSchema.safeParse(request.query);
        const timeRange = parseResult.success
            ? parseResult.data.timeRange
            : 'LAST_30_DAYS';
        const startDate = parseResult.success ? parseResult.data.startDate : undefined;
        const endDate = parseResult.success ? parseResult.data.endDate : undefined;
        const data = await analytics_service_1.analyticsAdminService.getOrderStatusAnalytics(timeRange, startDate, endDate);
        return reply.status(200).send({
            success: true,
            ...data,
        });
    });
    /**
     * GET /api/v1/admin/analytics/wallet
     * Central wallet metrics, active wallets, frozen wallets, aggregate balance, deposits, debits, refunds.
     */
    app.get('/wallet', async (_request, reply) => {
        const stats = await analytics_service_1.analyticsAdminService.getWalletAnalytics();
        return reply.status(200).send({
            success: true,
            walletAnalytics: stats,
        });
    });
    /**
     * GET /api/v1/admin/analytics/payments
     * Payment transactions volume, completed/pending/failed breakdown, refunds.
     */
    app.get('/payments', async (request, reply) => {
        const parseResult = admin_validation_1.analyticsFilterSchema.safeParse(request.query);
        const timeRange = parseResult.success
            ? parseResult.data.timeRange
            : 'LAST_30_DAYS';
        const startDate = parseResult.success ? parseResult.data.startDate : undefined;
        const endDate = parseResult.success ? parseResult.data.endDate : undefined;
        const stats = await analytics_service_1.analyticsAdminService.getPaymentAnalytics(timeRange, startDate, endDate);
        return reply.status(200).send({
            success: true,
            paymentAnalytics: stats,
        });
    });
    /**
     * GET /api/v1/admin/analytics/providers
     * Provider infrastructure health breakdown (healthy, unhealthy, degraded, disabled, maintenance).
     */
    app.get('/providers', async (_request, reply) => {
        const stats = await analytics_service_1.analyticsAdminService.getProviderAnalytics();
        return reply.status(200).send({
            success: true,
            providerAnalytics: stats,
        });
    });
};
exports.analyticsAdminRoutes = analyticsAdminRoutes;
