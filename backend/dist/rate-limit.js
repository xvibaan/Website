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
        max: 100,
        timeWindow: '1 minute',
        ban: undefined,
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
        allowList: (request) => {
            if (request.url.startsWith('/api/v1/payments/webhook')) {
                return true;
            }
            if (request.url === '/health') {
                return true;
            }
            return false;
        },
    });
}
/**
 * Endpoint-specific rate limit overrides.
 */
exports.rateLimitOverrides = {
    /**
     * Login: 10 attempts per minute per IP.
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
     * Google OAuth authorization start: 10 requests per minute per IP.
     */
    googleOAuthStart: {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
    },
    /**
     * Google OAuth callback: 10 requests per minute per IP.
     */
    googleOAuthCallback: {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
    },
    /**
     * Payment creation: 15 per minute per IP.
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
