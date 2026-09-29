import { AuthSessionClaims, AuthenticatedUserPayload } from './auth.types';
export declare const AUTH_COOKIE_NAME: string;
export declare const AUTH_SESSION_TTL_SECONDS: number;
/**
 * Creates a signed JWT session token containing non-sensitive claims.
 */
export declare function createSessionToken(user: AuthenticatedUserPayload): string;
/**
 * Verifies and decodes a signed session token. Returns null if invalid or expired.
 */
export declare function verifySessionToken(token: string): AuthSessionClaims | null;
/**
 * Cookie options for the session token.
 * Note: No Domain attribute is set, ensuring correct host-only scoping.
 */
export declare function getSessionCookieOptions(maxAgeSeconds?: number): {
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    maxAge: number;
};
