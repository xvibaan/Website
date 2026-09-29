"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const session_1 = require("./session");
const user_repository_1 = require("../db/repositories/user.repository");
/**
 * Fastify preHandler hook: verifies the HttpOnly session cookie, validates the JWT,
 * verifies the user exists and is active in the database, and attaches user context.
 */
async function authenticate(request, reply) {
    let token = request.cookies[session_1.AUTH_COOKIE_NAME];
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
    const claims = (0, session_1.verifySessionToken)(token);
    if (!claims) {
        return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid or expired session',
        });
    }
    // Active User Check: Ensure account exists and is not deactivated
    const user = await user_repository_1.userRepository.findById(claims.sub);
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
        role: user.role,
        isActive: user.isActive,
    };
}
/**
 * Reusable role-authorization hook factory.
 * Verifies that the authenticated user possesses the required role.
 */
function requireRole(requiredRole) {
    return async (request, reply) => {
        // Must run authenticate first if not already populated
        if (!request.user) {
            await authenticate(request, reply);
            if (reply.sent)
                return;
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
