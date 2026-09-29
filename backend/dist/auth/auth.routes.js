"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const auth_service_1 = require("./auth.service");
const auth_validation_1 = require("./auth.validation");
const auth_middleware_1 = require("./auth.middleware");
const session_1 = require("./session");
const rate_limit_1 = require("../rate-limit");
const authRoutes = async (app) => {
    /**
     * POST /api/v1/auth/register
     * Registers a new customer, sets HttpOnly session cookie, returns safe user object.
     */
    app.post('/register', rate_limit_1.rateLimitOverrides.register, async (request, reply) => {
        const parseResult = auth_validation_1.registerSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid registration input',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const { token, user } = await auth_service_1.authService.register(parseResult.data);
        reply.setCookie(session_1.AUTH_COOKIE_NAME, token, (0, session_1.getSessionCookieOptions)());
        return reply.status(201).send({
            user,
        });
    });
    /**
     * POST /api/v1/auth/login
     * Authenticates credentials, sets HttpOnly session cookie, returns safe user object.
     */
    app.post('/login', rate_limit_1.rateLimitOverrides.login, async (request, reply) => {
        const parseResult = auth_validation_1.loginSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid login input',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const { token, user } = await auth_service_1.authService.login(parseResult.data);
        reply.setCookie(session_1.AUTH_COOKIE_NAME, token, (0, session_1.getSessionCookieOptions)());
        return reply.status(200).send({
            user,
        });
    });
    /**
     * POST /api/v1/auth/logout
     * Clears the HttpOnly session cookie.
     */
    app.post('/logout', async (_request, reply) => {
        reply.clearCookie(session_1.AUTH_COOKIE_NAME, {
            path: '/',
        });
        return reply.status(200).send({
            success: true,
            message: 'Logged out successfully',
        });
    });
    /**
     * GET /api/v1/auth/me
     * Returns current safe user profile for authenticated session.
     */
    app.get('/me', { preHandler: [auth_middleware_1.authenticate] }, async (request, reply) => {
        if (!request.user) {
            return reply.status(401).send({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        const user = await auth_service_1.authService.getCurrentUser(request.user.userId);
        return reply.status(200).send({
            user,
        });
    });
};
exports.authRoutes = authRoutes;
