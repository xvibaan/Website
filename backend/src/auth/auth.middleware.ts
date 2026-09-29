import { FastifyRequest, FastifyReply } from 'fastify';
import { AUTH_COOKIE_NAME, verifySessionToken } from './session';
import { AuthenticatedUserPayload, UserRole } from './auth.types';
import { userRepository } from '../db/repositories/user.repository';

// Augment FastifyRequest to include user context
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUserPayload;
  }
}

/**
 * Fastify preHandler hook: verifies the HttpOnly session cookie, validates the JWT,
 * verifies the user exists and is active in the database, and attaches user context.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  let token = request.cookies[AUTH_COOKIE_NAME];
  if (!token && request.headers.authorization) {
    const parts = request.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  const claims = verifySessionToken(token);
  if (!claims) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired session',
    });
  }

  // Active User Check: Ensure account exists and is not deactivated
  const user = await userRepository.findById(claims.sub);
  if (!user || !user.isActive) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Account is deactivated or no longer exists',
    });
  }

  request.user = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    isActive: user.isActive,
  };
}

/**
 * Reusable role-authorization hook factory.
 * Verifies that the authenticated user possesses the required role.
 */
export function requireRole(requiredRole: UserRole) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Must run authenticate first if not already populated
    if (!request.user) {
      await authenticate(request, reply);
      if (reply.sent) return;
    }

    if (request.user?.role !== requiredRole) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to access this resource',
      });
    }
  };
}
