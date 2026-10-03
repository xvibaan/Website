"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const sensible_1 = __importDefault(require("@fastify/sensible"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const static_1 = __importDefault(require("@fastify/static"));
const path_1 = __importDefault(require("path"));
const rate_limit_1 = require("./rate-limit");
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const rate_limit_2 = require("./rate-limit");
const auth_routes_1 = require("./auth/auth.routes");
const admin_routes_1 = require("./admin/admin.routes");
const wallet_routes_1 = require("./wallet/wallet.routes");
const payment_routes_1 = require("./payments/routes/payment.routes");
const ProviderRegistry_1 = require("./providers/registry/ProviderRegistry");
const DevelopmentProviderAdapter_1 = require("./providers/adapters/development/DevelopmentProviderAdapter");
const catalog_routes_1 = require("./catalog/catalog.routes");
const orders_routes_1 = require("./orders/orders.routes");
const settings_service_1 = require("./admin/services/settings.service");
const order_service_1 = require("./orders/order.service");
const reseller_routes_1 = require("./reseller/reseller.routes");
const tenant_middleware_1 = require("./middleware/tenant.middleware");
// Load environment variables if present
dotenv_1.default.config();
const envPort = process.env.PORT;
const PORT = envPort && envPort !== '8080' ? Number(envPort) : 4000;
const HOST = process.env.HOST || '0.0.0.0';
function buildServer() {
    const app = (0, fastify_1.default)({
        logger: {
            redact: {
                paths: [
                    'req.headers.authorization',
                    'req.headers.cookie',
                    'req.body.password',
                    'req.body.token',
                    'req.body.apiKey',
                    'req.body.razorpay_signature',
                    'req.body.providerCredentials',
                    'req.body.credentials',
                    'req.headers["x-api-key"]',
                    'req.headers["x-razorpay-signature"]',
                    'err.config.headers.Authorization', // for axios errors
                    'err.config.data', // for axios errors
                ],
                censor: '[REDACTED]',
            },
        },
        trustProxy: true,
    });
    // Preserve raw body buffer for cryptographic webhook HMAC verification
    app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
        req.rawBody = body;
        try {
            const json = JSON.parse(body.toString('utf8'));
            done(null, json);
        }
        catch (err) {
            err.statusCode = 400;
            done(err, undefined);
        }
    });
    // Centralized Error Handling
    app.setErrorHandler((error, request, reply) => {
        app.log.error({ err: error, reqId: request.id }, 'Unhandled Request Error');
        const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
            ? error.statusCode
            : 500;
        return reply.status(statusCode).send({
            statusCode,
            error: error.name || 'InternalServerError',
            message: statusCode === 500 && process.env.NODE_ENV === 'production'
                ? 'Internal server error occurred'
                : error.message || 'An unexpected error occurred',
            requestId: request.id,
        });
    });
    // Plugins Registration
    app.register(sensible_1.default);
    // Application-layer rate limiting (100 req/min global baseline, strict per-endpoint overrides)
    (0, rate_limit_1.registerRateLimiting)(app);
    // Register Multipart parser with 5 MB size limit
    app.register(multipart_1.default, {
        limits: {
            fileSize: 5242880, // 5 MB max file size
            files: 1, // Exactly 1 file per upload request
        },
    });
    // Ensure local uploads directory exists
    const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
    if (!fs_1.default.existsSync(uploadsDir)) {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
    // Expose static local uploads route in development / fallback
    app.register(static_1.default, {
        root: uploadsDir,
        prefix: '/uploads/',
        decorateReply: false,
    });
    const authSecret = process.env.AUTH_SECRET;
    if (!authSecret) {
        throw new Error('CRITICAL CONFIGURATION ERROR: AUTH_SECRET environment variable is required.');
    }
    app.register(cookie_1.default, {
        secret: authSecret,
        parseOptions: {},
    });
    // CORS Configuration
    const isProd = process.env.NODE_ENV === 'production';
    const defaultOrigins = isProd ? [] : ['http://localhost:3000', 'http://localhost:3001'];
    const envOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
        : [];
    const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));
    app.register(cors_1.default, {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, server-to-server)
            if (!origin) {
                return callback(null, true);
            }
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`Origin '${origin}' not allowed by CORS`), false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
    // Minimal Health Check Endpoint
    app.get('/health', async () => {
        return {
            status: 'ok',
        };
    });
    /**
     * GET /api/v1/config
     * Public endpoint exposing non-sensitive platform configuration to customer frontends.
     * Returns authoritative minimum wallet deposit amounts per currency.
     * No authentication required — these are business rules, not secrets.
     */
    app.get('/api/v1/config', async (_request, reply) => {
        try {
            const settings = await settings_service_1.settingsAdminService.getAllSettings();
            return reply.status(200).send({
                minDeposit: {
                    INR: parseFloat(settings.min_deposit_inr?.value ?? '10'),
                    USDT: parseFloat(settings.min_deposit_usdt?.value ?? '1'),
                },
                defaultCurrency: settings.default_currency?.value ?? 'INR',
            });
        }
        catch (err) {
            // Fallback to hardcoded defaults if DB is unreachable
            return reply.status(200).send({
                minDeposit: {
                    INR: 10,
                    USDT: 1,
                },
                defaultCurrency: 'INR',
            });
        }
    });
    // Authentication API Routes
    app.register(auth_routes_1.authRoutes, { prefix: '/api/v1/auth' });
    // Customer Central Wallet API Routes
    app.register(wallet_routes_1.walletRoutes, { prefix: '/api/v1/wallet' });
    // Central Payment Gateway & Webhook API Routes
    app.register(payment_routes_1.paymentRoutes, { prefix: '/api/v1/payments' });
    // Protected Master Admin API Routes (RBAC Boundary, Providers, Products, Customers, Analytics, Settings)
    app.register(admin_routes_1.adminRoutes, { prefix: '/api/v1/admin' });
    // Public Catalog API Routes (Products & Categories)
    app.register(catalog_routes_1.catalogRoutes, { prefix: '/api/v1' });
    // Production Security Headers
    app.addHook('onRequest', async (request, reply) => {
        reply.header('X-Content-Type-Options', 'nosniff');
        reply.header('X-Frame-Options', 'DENY');
        reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
        reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        if (process.env.NODE_ENV === 'production' && request.protocol === 'https') {
            reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
    });
    // Sensitive API Cache-Control Hardening
    app.addHook('onSend', async (request, reply) => {
        if (request.url.startsWith('/api/v1/auth') ||
            request.url.startsWith('/api/v1/wallet') ||
            request.url.startsWith('/api/v1/admin') ||
            request.url.startsWith('/api/v1/payments')) {
            reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            reply.header('Pragma', 'no-cache');
            reply.header('Expires', '0');
        }
    });
    // Customer Orders API Routes (Phase 8 placeholder)
    app.register(orders_routes_1.orderRoutes, { prefix: '/api/v1/orders' });
    // Reseller API Routes
    app.register(reseller_routes_1.resellerRoutes, { prefix: '/api/v1/reseller', ...rate_limit_2.rateLimitOverrides.resellerApi.config });
    // Tenant Resolution Hook
    app.addHook('onRequest', tenant_middleware_1.tenantResolver);
    // Initialize Development/Test Provider Adapter strictly in non-production environments
    if (process.env.NODE_ENV !== 'production') {
        if (!ProviderRegistry_1.providerRegistry.hasAdapter('dev-provider')) {
            ProviderRegistry_1.providerRegistry.registerAdapter(new DevelopmentProviderAdapter_1.DevelopmentProviderAdapter());
        }
    }
    return app;
}
async function start() {
    const server = buildServer();
    try {
        await server.listen({ port: PORT, host: HOST });
        console.log(`[Master Backend] Server listening at http://${HOST}:${PORT}`);
        // Start background reconciliation worker
        if (process.env.NODE_ENV !== 'test') {
            console.log(`[Master Backend] Starting Order Reconciliation Worker...`);
            // Run every 2 minutes
            setInterval(async () => {
                try {
                    await order_service_1.orderService.reconcileProcessingOrders(20);
                }
                catch (err) {
                    server.log.error(err, 'Failed to run background order reconciliation');
                }
            }, 120000);
        }
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
// Start standalone server when executed directly
if (require.main === module) {
    start();
}
