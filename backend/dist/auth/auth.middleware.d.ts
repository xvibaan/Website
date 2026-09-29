import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedUserPayload, UserRole } from './auth.types';
declare module 'fastify' {
    interface FastifyRequest {
        user?: AuthenticatedUserPayload;
    }
}
/**
 * Fastify preHandler hook: verifies the HttpOnly session cookie, validates the JWT,
 * verifies the user exists and is active in the database, and attaches user context.
 */
export declare function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
/**
 * Reusable role-authorization hook factory.
 * Verifies that the authenticated user possesses the required role.
 */
export declare function requireRole(requiredRole: UserRole): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
