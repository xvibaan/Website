import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { AuthSessionClaims, AuthenticatedUserPayload, UserRole } from './auth.types';

dotenv.config();

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'host_market_session';
export const AUTH_SESSION_TTL_SECONDS = Number(process.env.AUTH_SESSION_TTL_SECONDS) || 86400; // 24 hours default

function getJwtSecret(): string {
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
export function createSessionToken(user: AuthenticatedUserPayload): string {
  const secret = getJwtSecret();
  const claims: AuthSessionClaims = {
    sub: user.userId,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(claims, secret, {
    expiresIn: AUTH_SESSION_TTL_SECONDS,
  });
}

/**
 * Verifies and decodes a signed session token. Returns null if invalid or expired.
 */
export function verifySessionToken(token: string): AuthSessionClaims | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as AuthSessionClaims;
    if (!decoded.sub || !decoded.email || !decoded.role) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Cookie options for the session token.
 * Note: No Domain attribute is set, ensuring correct host-only scoping.
 */
export function getSessionCookieOptions(maxAgeSeconds: number = AUTH_SESSION_TTL_SECONDS) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: maxAgeSeconds,
  };
}
