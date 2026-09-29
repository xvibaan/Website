"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_SESSION_TTL_SECONDS = exports.AUTH_COOKIE_NAME = void 0;
exports.createSessionToken = createSessionToken;
exports.verifySessionToken = verifySessionToken;
exports.getSessionCookieOptions = getSessionCookieOptions;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'host_market_session';
exports.AUTH_SESSION_TTL_SECONDS = Number(process.env.AUTH_SESSION_TTL_SECONDS) || 86400; // 24 hours default
function getJwtSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('AUTH_SECRET environment variable is mandatory in production');
        }
        return 'dev-insecure-jwt-secret-do-not-use-in-production';
    }
    return secret;
}
/**
 * Creates a signed JWT session token containing non-sensitive claims.
 */
function createSessionToken(user) {
    const secret = getJwtSecret();
    const claims = {
        sub: user.userId,
        email: user.email,
        role: user.role,
    };
    return jsonwebtoken_1.default.sign(claims, secret, {
        expiresIn: exports.AUTH_SESSION_TTL_SECONDS,
    });
}
/**
 * Verifies and decodes a signed session token. Returns null if invalid or expired.
 */
function verifySessionToken(token) {
    try {
        const secret = getJwtSecret();
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        if (!decoded.sub || !decoded.email || !decoded.role) {
            return null;
        }
        return decoded;
    }
    catch {
        return null;
    }
}
/**
 * Cookie options for the session token.
 * Note: No Domain attribute is set, ensuring correct host-only scoping.
 */
function getSessionCookieOptions(maxAgeSeconds = exports.AUTH_SESSION_TTL_SECONDS) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        path: '/',
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: maxAgeSeconds,
    };
}
