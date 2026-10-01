import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authService } from './auth.service';
import { registerSchema, loginSchema } from './auth.validation';
import { authenticate } from './auth.middleware';
import { AUTH_COOKIE_NAME, getSessionCookieOptions } from './session';
import { rateLimitOverrides } from '../rate-limit';

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
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
