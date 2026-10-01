import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { registerRateLimiting } from './rate-limit';
import fs from 'fs';
import dotenv from 'dotenv';
import { rateLimitOverrides } from './rate-limit';
import { authRoutes } from './auth/auth.routes';
import { adminRoutes } from './admin/admin.routes';
import { walletRoutes } from './wallet/wallet.routes';
import { paymentRoutes } from './payments/routes/payment.routes';
import { providerRoutes } from './providers/routes/provider.routes';
import { providerRegistry } from './providers/registry/ProviderRegistry';
import { DevelopmentProviderAdapter } from './providers/adapters/development/DevelopmentProviderAdapter';
import { catalogRoutes } from './catalog/catalog.routes';
import { orderRoutes } from './orders/orders.routes';
import { settingsAdminService } from './admin/services/settings.service';
import { orderService } from './orders/order.service';
import { resellerRoutes } from './reseller/reseller.routes';
import { tenantResolver } from './middleware/tenant.middleware';

// Load environment variables if present
dotenv.config();

const envPort = process.env.PORT;
const PORT = envPort && envPort !== '8080' ? Number(envPort) : 4000;
const HOST = process.env.HOST || '0.0.0.0';

export function buildServer(): FastifyInstance {
  const app = Fastify({
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
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      (req as any).rawBody = body;
      try {
        const json = JSON.parse(body.toString('utf8'));
        done(null, json);
      } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
      }
    }
  );

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
  app.register(sensible);

  // Application-layer rate limiting (100 req/min global baseline, strict per-endpoint overrides)
  registerRateLimiting(app);

  // Register Multipart parser with 5 MB size limit
  app.register(multipart, {
    limits: {
      fileSize: 5242880, // 5 MB max file size
      files: 1, // Exactly 1 file per upload request
    },
  });

  // Ensure local uploads directory exists
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Expose static local uploads route in development / fallback
  app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    throw new Error('CRITICAL CONFIGURATION ERROR: AUTH_SECRET environment variable is required.');
  }

  app.register(cookie, {
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

  app.register(cors, {
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
      const settings = await settingsAdminService.getAllSettings();
      return reply.status(200).send({
        minDeposit: {
          INR: parseFloat(settings.min_deposit_inr?.value ?? '10'),
          USDT: parseFloat(settings.min_deposit_usdt?.value ?? '1'),
        },
        defaultCurrency: settings.default_currency?.value ?? 'INR',
      });
    } catch (err: any) {
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
  app.register(authRoutes, { prefix: '/api/v1/auth' });

  // Customer Central Wallet API Routes
  app.register(walletRoutes, { prefix: '/api/v1/wallet' });

  // Central Payment Gateway & Webhook API Routes
  app.register(paymentRoutes, { prefix: '/api/v1/payments' });

  // Protected Master Admin API Routes (RBAC Boundary, Providers, Products, Customers, Analytics, Settings)
  app.register(adminRoutes, { prefix: '/api/v1/admin' });

  // Public Catalog API Routes (Products & Categories)
  app.register(catalogRoutes, { prefix: '/api/v1' });

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
    if (
      request.url.startsWith('/api/v1/auth') ||
      request.url.startsWith('/api/v1/wallet') ||
      request.url.startsWith('/api/v1/admin') ||
      request.url.startsWith('/api/v1/payments')
    ) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }
  });

  // Customer Orders API Routes (Phase 8 placeholder)
  app.register(orderRoutes, { prefix: '/api/v1/orders' });

  // Reseller API Routes
  app.register(resellerRoutes, { prefix: '/api/v1/reseller', ...rateLimitOverrides.resellerApi.config });

  // Tenant Resolution Hook
  app.addHook('onRequest', tenantResolver);

  // Initialize Development/Test Provider Adapter strictly in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    if (!providerRegistry.hasAdapter('dev-provider')) {
      providerRegistry.registerAdapter(new DevelopmentProviderAdapter());
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
          await orderService.reconcileProcessingOrders(20);
        } catch (err) {
          server.log.error(err, 'Failed to run background order reconciliation');
        }
      }, 120000);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Start standalone server when executed directly
if (require.main === module) {
  start();
}
