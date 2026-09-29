"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitOverrides = void 0;
exports.registerRateLimiting = registerRateLimiting;
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
/**
 * Rate Limiting Configuration
 *
 * Applies Fastify-native in-memory rate limiting to protect critical
 * endpoints against brute force, spam, and abuse.
 *
 * Uses the built-in in-memory store (no Redis required for single-instance
 * deployments). If horizontal scaling across multiple backend instances is
 * needed, replace with a Redis-backed store via @fastify/rate-limit's
 * `redis` option.
 *
 * DESIGN DECISIONS:
 * - Global baseline of 100 req/min is generous enough for all legitimate
 *   customer and admin workflows.
 * - Strict per-route overrides are applied to abuse-sensitive endpoints.
 * - Payment webhooks are exempt to avoid blocking legitimate gateway callbacks.
 * - The background reconciliation worker calls order service directly (not via HTTP),
 *   so it is not affected by rate limiting.
 * - Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset,
 *   Retry-After) are included in responses automatically by the plugin.
 */
async function registerRateLimiting(app) {
    await app.register(rate_limit_1.default, {
        global: true,
        max: 100, // 100 requests per window per IP (generous baseline)
        timeWindow: '1 minute',
        ban: undefined, // Do not permanently ban; just throttle
        addHeadersOnExceeding: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
        },
        addHeaders: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
            'retry-after': true,
        },
        keyGenerator: (request) => {
            // Use X-Forwarded-For (trustProxy is enabled) or fallback to raw IP
            return request.ip;
        },
        errorResponseBuilder: (_request, context) => {
            return {
                statusCode: 429,
                error: 'TooManyRequests',
                message: `Rate limit exceeded. You can make ${context.max} requests per ${context.after}. Please try again later.`,
                retryAfter: context.after,
            };
        },
        // Exempt payment webhooks from rate limiting.
        // Webhooks are authenticated cryptographically (HMAC-SHA256), not by session,
        // and must always be accepted to prevent payment processing failures.
        allowList: (request) => {
            if (request.url.startsWith('/api/v1/payments/webhook')) {
                return true;
            }
            // Health check endpoint should never be rate limited (used by load balancers)
            if (request.url === '/health') {
                return true;
            }
            return false;
        },
    });
}
/**
 * Endpoint-specific rate limit overrides.
 * These are applied as Fastify route config objects and are used
 * to tighten limits on abuse-sensitive endpoints beyond the global baseline.
 */
exports.rateLimitOverrides = {
    /**
     * Login: 10 attempts per minute per IP.
     * Protects against credential brute-force attacks.
     */
    login: {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
    },
    /**
     * Registration: 5 attempts per minute per IP.
     * Protects against account creation spam / bot registrations.
     */
    register: {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '1 minute',
            },
        },
    },
    /**
     * Payment creation: 15 per minute per IP.
     * Customers typically create 1-2 payment intents per session.
     */
    paymentCreate: {
        config: {
            rateLimit: {
                max: 15,
                timeWindow: '1 minute',
            },
        },
    },
    /**
     * Order creation: 20 per minute per IP.
     * Allows rapid legitimate purchasing while blocking automated order spam.
     */
    orderCreate: {
        config: {
            rateLimit: {
                max: 20,
                timeWindow: '1 minute',
            },
        },
    },
    /**
     * Provider test-connection: 6 per minute per IP.
     * Prevents upstream provider flooding from admin panel.
     */
    providerTestConnection: {
        config: {
            rateLimit: {
                max: 6,
                timeWindow: '1 minute',
            },
        },
    },
    /**
     * Provider catalog sync: 5 per minute per IP.
     * Catalog syncs involve upstream API calls and should be throttled.
     */
    providerCatalogSync: {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '1 minute',
            },
        },
    },
    /**
     * Provider health check: 10 per minute per IP.
     * More generous than test-connection since health checks are lightweight.
     */
    providerHealthCheck: {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
    },
    /**
     * Reseller API calls: 60 per minute per IP.
     * Throttles programmatic reseller integrations appropriately.
     */
    resellerApi: {
        config: {
            rateLimit: {
                max: 60,
                timeWindow: '1 minute',
            },
        },
    },
};
