import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authService } from './auth.service';
import { registerSchema, loginSchema } from './auth.validation';
import { authenticate } from './auth.middleware';
import { AUTH_COOKIE_NAME, getSessionCookieOptions } from './session';
import { rateLimitOverrides } from '../rate-limit';
import { googleOAuthService } from './google-oauth.service';

const googleCallbackSchema = z.object({
  code: z.string().trim().min(1).max(4096),
  state: z.string().trim().min(1).max(4096),
});

function isSafeCallbackPath(value: string): boolean {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.includes('://')
  );
}

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * GET /api/v1/auth/providers
   * Returns availability of supported authentication providers.
   * Never exposes provider secrets or configuration values.
   */
  app.get('/providers', async (_request, reply) => {
    return reply.status(200).send({
      google: googleOAuthService.isConfigured(),
    });
  });

  /**
   * GET /api/v1/auth/signin/google
   * Creates a signed OAuth state and returns Google's authorization URL.
   *
   * The frontend owns the browser-side state cookie and will perform the
   * callback exchange server-to-server.
   */
  app.get(
    '/signin/google',
    { config: rateLimitOverrides.googleOAuthStart.config },
    async (request, reply) => {
      try {
        const query = request.query as { callbackUrl?: string };
        const callbackPath = query.callbackUrl?.trim() || '/dashboard';

        if (!isSafeCallbackPath(callbackPath)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'BadRequest',
            message: 'Invalid callback URL',
          });
        }

        if (!googleOAuthService.isConfigured()) {
          return reply.status(503).send({
            statusCode: 503,
            error: 'ServiceUnavailable',
            message: 'Google authentication is not configured',
          });
        }

        const state = googleOAuthService.createState(callbackPath);
        const authorizationUrl = googleOAuthService.generateAuthorizationUrl(state);

        return reply.status(200).send({
          authorizationUrl,
          state,
        });
      } catch (error: any) {
        request.log.error(
          { err: error },
          'Failed to initialize Google OAuth'
        );

        return reply.status(500).send({
          statusCode: 500,
          error: 'InternalServerError',
          message: 'Unable to initialize Google authentication',
        });
      }
    }
  );

  /**
   * POST /api/v1/auth/callback/google
   * Exchanges the Google authorization code and signs the user into the
   * existing application session.
   *
   * This endpoint is intended for the frontend server-side callback route,
   * not direct browser-side JavaScript.
   */
  app.post(
    '/callback/google',
    { config: rateLimitOverrides.googleOAuthCallback.config },
    async (request, reply) => {
      const parseResult = googleCallbackSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid Google OAuth callback input',
        });
      }

      const { code, state } = parseResult.data;

      if (!googleOAuthService.verifyState(state)) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid or expired Google OAuth state',
        });
      }

      const callbackPath = googleOAuthService.getCallbackPath(state);

      if (!callbackPath) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid Google OAuth callback state',
        });
      }

      try {
        const identity = await googleOAuthService.verifyAuthorizationCode(code);
        const { token, user } = await authService.loginWithGoogle(identity);

        return reply.status(200).send({
          token,
          user,
          callbackPath,
        });
      } catch (error: any) {
        request.log.error(
          { err: error },
          'Google OAuth authentication failed'
        );

        const statusCode =
          error?.statusCode === 403
            ? 403
            : error?.statusCode === 409
              ? 409
              : 401;

        const message =
          statusCode === 403
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
    }
  );

  /**
   * POST /api/v1/auth/register
   * Registers a new customer, sets HttpOnly session cookie, returns safe user object.
   */
  app.post('/register', rateLimitOverrides.register, async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid registration input',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const { token, user } = await authService.register(parseResult.data);

    reply.setCookie(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

    return reply.status(201).send({
      user,
    });
  });

  /**
   * POST /api/v1/auth/login
   * Authenticates credentials, sets HttpOnly session cookie, returns safe user object.
   */
  app.post('/login', rateLimitOverrides.login, async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid login input',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const { token, user } = await authService.login(parseResult.data);

    reply.setCookie(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

    return reply.status(200).send({
      user,
    });
  });

  /**
   * POST /api/v1/auth/logout
   * Clears the HttpOnly session cookie.
   */
  app.post('/logout', async (_request, reply) => {
    reply.clearCookie(AUTH_COOKIE_NAME, {
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
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const user = await authService.getCurrentUser(request.user.userId);

    return reply.status(200).send({
      user,
    });
  });

  /**
   * DELETE /api/v1/auth/me
   * Securely closes the authenticated user's account and clears session.
   */
  app.delete('/me', { preHandler: [authenticate] }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    await authService.deleteAccount(request.user.userId);

    reply.clearCookie(AUTH_COOKIE_NAME, {
      path: '/',
    });

    return reply.status(200).send({
      success: true,
      message: 'Account has been successfully closed and personal data anonymized.',
    });
  });
};
