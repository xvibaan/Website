import { FastifyInstance } from 'fastify';
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
export declare function registerRateLimiting(app: FastifyInstance): Promise<void>;
/**
 * Endpoint-specific rate limit overrides.
 */
export declare const rateLimitOverrides: {
    /**
     * Login: 10 attempts per minute per IP.
     */
    readonly login: {
        readonly config: {
            readonly rateLimit: {
                readonly max: 10;
                readonly timeWindow: "1 minute";
            };
        };
    };
    /**
     * Registration: 5 attempts per minute per IP.
     */
    readonly register: {
        readonly config: {
            readonly rateLimit: {
                readonly max: 5;
                readonly timeWindow: "1 minute";
            };
        };
    };
    /**
     * Google OAuth authorization start: 10 requests per minute per IP.
     */
    readonly googleOAuthStart: {
        readonly config: {
            readonly rateLimit: {
                readonly max: 10;
                readonly timeWindow: "1 minute";
            };
        };
    };
    /**
     * Google OAuth callback: 10 requests per minute per IP.
     */
    readonly googleOAuthCallback: {
        readonly config: {
            readonly rateLimit: {
                readonly max: 10;
                readonly timeWindow: "1 minute";
            };
        };
    };
    /**
     * Payment creation: 15 per minute per IP.
     */
    readonly paymentCreate: {
        readonly config: {
            readonly rateLimit: {
                readonly max: 15;
                readonly timeWindow: "1 minute";
            };
        };
    };
    /**
     * Order creation: 20 per minute per IP.
     */
    readonly orderCreate: {
        readonly config: {
            readonly rateLimit: {
                readonly max: 20;
                readonly timeWindow: "1 minute";
            };
        };
    };
    /**
     * Provider test-connection: 6 per minute per IP.
     */
    readonly providerTestConnection: {
        readonly config: {
            readonly rateLimit: {
                readonly max: 6;
                readonly timeWindow: "1 minute";
            };
        };
    };
    /**
     * Provider catalog sync: 5 per minute per IP.
     */
    readonly providerCatalogSync: {
        readonly config: {
            readonly rateLimit: {
                readonly max: 5;
                readonly timeWindow: "1 minute";
            };
        };
    };
    /**
     * Provider health check: 10 per minute per IP.
     */
    readonly providerHealthCheck: {
        readonly config: {
            readonly rateLimit: {
                readonly max: 10;
                readonly timeWindow: "1 minute";
            };
        };
    };
    /**
     * Reseller API calls: 60 per minute per IP.
     */
    readonly resellerApi: {
        readonly config: {
            readonly rateLimit: {
                readonly max: 60;
                readonly timeWindow: "1 minute";
            };
        };
    };
};
