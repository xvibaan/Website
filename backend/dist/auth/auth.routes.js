"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const zod_1 = require("zod");
const auth_service_1 = require("./auth.service");
const auth_validation_1 = require("./auth.validation");
const auth_middleware_1 = require("./auth.middleware");
const session_1 = require("./session");
const rate_limit_1 = require("../rate-limit");
const google_oauth_service_1 = require("./google-oauth.service");
const googleCallbackSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(1).max(4096),
    state: zod_1.z.string().trim().min(1).max(4096),
});
function isSafeCallbackPath(value) {
    return (value.startsWith('/') &&
        !value.startsWith('//') &&
        !value.includes('\\') &&
        !value.includes('://'));
}
const authRoutes = async (app) => {
    /**
     * GET /api/v1/auth/providers
     * Returns availability of supported authentication providers.
     * Never exposes provider secrets or configuration values.
     */
    app.get('/providers', async (_request, reply) => {
        return reply.status(200).send({
            google: google_oauth_service_1.googleOAuthService.isConfigured(),
        });
    });
    /**
     * GET /api/v1/auth/signin/google
     * Creates a signed OAuth state and returns Google's authorization URL.
     *
     * The frontend owns the browser-side state cookie and will perform the
     * callback exchange server-to-server.
     */
    app.get('/signin/google', { config: rate_limit_1.rateLimitOverrides.googleOAuthStart.config }, async (request, reply) => {
        try {
            const query = request.query;
            const callbackPath = query.callbackUrl?.trim() || '/dashboard';
            if (!isSafeCallbackPath(callbackPath)) {
                return reply.status(400).send({
                    statusCode: 400,
                    error: 'BadRequest',
                    message: 'Invalid callback URL',
                });
            }
            if (!google_oauth_service_1.googleOAuthService.isConfigured()) {
                return reply.status(503).send({
                    statusCode: 503,
                    error: 'ServiceUnavailable',
                    message: 'Google authentication is not configured',
                });
            }
            const state = google_oauth_service_1.googleOAuthService.createState(callbackPath);
            const authorizationUrl = google_oauth_service_1.googleOAuthService.generateAuthorizationUrl(state);
            return reply.status(200).send({
                authorizationUrl,
                state,
            });
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to initialize Google OAuth');
            return reply.status(500).send({
                statusCode: 500,
                error: 'InternalServerError',
                message: 'Unable to initialize Google authentication',
            });
        }
    });
    /**
     * POST /api/v1/auth/callback/google
     * Exchanges the Google authorization code and signs the user into the
     * existing application session.
     *
     * This endpoint is intended for the frontend server-side callback route,
     * not direct browser-side JavaScript.
     */
    app.post('/callback/google', { config: rate_limit_1.rateLimitOverrides.googleOAuthCallback.config }, async (request, reply) => {
        const parseResult = googleCallbackSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid Google OAuth callback input',
            });
        }
        const { code, state } = parseResult.data;
        if (!google_oauth_service_1.googleOAuthService.verifyState(state)) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid or expired Google OAuth state',
            });
        }
        const callbackPath = google_oauth_service_1.googleOAuthService.getCallbackPath(state);
        if (!callbackPath) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid Google OAuth callback state',
            });
        }
        try {
            const identity = await google_oauth_service_1.googleOAuthService.verifyAuthorizationCode(code);
            const { token, user } = await auth_service_1.authService.loginWithGoogle(identity);
            return reply.status(200).send({
                token,
                user,
                callbackPath,
            });
        }
        catch (error) {
            request.log.error({ err: error }, 'Google OAuth authentication failed');
            const statusCode = error?.statusCode === 403
                ? 403
                : error?.statusCode === 409
                    ? 409
                    : 401;
            const message = statusCode === 403
                ? 'Account is inactive or suspended'
                : statusCode === 409
                    ? error.message || 'Unable to link this Google account'
                    : 'Google authentication failed. Please try again.';
            return reply.status(statusCode).send({
                statusCode,
                error: statusCode === 403
                    ? 'Forbidden'
                    : statusCode === 409
                        ? 'Conflict'
                        : 'Unauthorized',
                message,
            });
        }
    });
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
    /**
     * DELETE /api/v1/auth/me
     * Securely closes the authenticated user's account and clears session.
     */
    app.delete('/me', { preHandler: [auth_middleware_1.authenticate] }, async (request, reply) => {
        if (!request.user) {
            return reply.status(401).send({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        await auth_service_1.authService.deleteAccount(request.user.userId);
        reply.clearCookie(session_1.AUTH_COOKIE_NAME, {
            path: '/',
        });
        return reply.status(200).send({
            success: true,
            message: 'Account has been successfully closed and personal data anonymized.',
        });
    });
};
exports.authRoutes = authRoutes;
