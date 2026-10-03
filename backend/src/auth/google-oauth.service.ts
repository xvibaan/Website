import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
}

interface GoogleOAuthState {
  purpose: 'google_oauth';
  nonce: string;
  callbackPath: string;
  iat?: number;
  exp?: number;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is required');
  }

  return secret;
}

class GoogleOAuthService {
  private getConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

    return {
      clientId,
      clientSecret,
      redirectUri,
      configured: Boolean(clientId && clientSecret && redirectUri),
    };
  }

  isConfigured(): boolean {
    return this.getConfig().configured;
  }

  getRedirectUri(): string {
    const { redirectUri } = this.getConfig();

    if (!redirectUri) {
      throw new Error('GOOGLE_REDIRECT_URI is not configured');
    }

    return redirectUri;
  }

  createState(callbackPath: string): string {
    const payload: GoogleOAuthState = {
      purpose: 'google_oauth',
      nonce: crypto.randomBytes(32).toString('hex'),
      callbackPath,
    };

    return jwt.sign(payload, getAuthSecret(), {
      expiresIn: 600,
    });
  }

  verifyState(state: string): boolean {
    try {
      const secret = getAuthSecret();
      const decoded = jwt.verify(state, secret) as GoogleOAuthState;

      return (
        decoded.purpose === 'google_oauth' &&
        typeof decoded.nonce === 'string' &&
        decoded.nonce.length >= 32 &&
        this.isSafeCallbackPath(decoded.callbackPath)
      );
    } catch {
      return false;
    }
  }

  getCallbackPath(state: string): string | null {
    try {
      const secret = getAuthSecret();
      const decoded = jwt.verify(state, secret) as GoogleOAuthState;

      if (
        decoded.purpose !== 'google_oauth' ||
        typeof decoded.nonce !== 'string' ||
        decoded.nonce.length < 32 ||
        !this.isSafeCallbackPath(decoded.callbackPath)
      ) {
        return null;
      }

      return decoded.callbackPath;
    } catch {
      return null;
    }
  }

  private isSafeCallbackPath(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      value.startsWith('/') &&
      !value.startsWith('//') &&
      !value.includes('\\') &&
      !value.includes('://')
    );
  }

  generateAuthorizationUrl(state: string): string {
    const { clientId, clientSecret, redirectUri } = this.getConfig();

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Google OAuth is not configured. Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI'
      );
    }

    if (!this.verifyState(state)) {
      throw new Error('Invalid Google OAuth state');
    }

    const client = new OAuth2Client(clientId, clientSecret, redirectUri);

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
      state,
    });
  }

  async verifyAuthorizationCode(code: string): Promise<GoogleIdentity> {
    const { clientId, clientSecret, redirectUri } = this.getConfig();

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Google OAuth is not configured. Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI'
      );
    }

    const normalizedCode = code.trim();

    if (!normalizedCode) {
      throw new Error('Google authorization code is missing');
    }

    const client = new OAuth2Client(clientId, clientSecret, redirectUri);

    const { tokens } = await client.getToken(normalizedCode);

    if (!tokens.id_token) {
      throw new Error('Google did not return an ID token');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Google ID token payload is missing');
    }

    const issuer = payload.iss;

    if (
      issuer !== 'https://accounts.google.com' &&
      issuer !== 'accounts.google.com'
    ) {
      throw new Error('Invalid Google ID token issuer');
    }

    const googleId = payload.sub?.trim();
    const email = payload.email?.trim().toLowerCase();
    const emailVerified = payload.email_verified === true;

    if (!googleId) {
      throw new Error('Google account ID is missing');
    }

    if (!email) {
      throw new Error('Google account email is missing');
    }

    if (!emailVerified) {
      throw new Error('Google account email is not verified');
    }

    return {
      googleId,
      email,
      emailVerified,
    };
  }
}

export const googleOAuthService = new GoogleOAuthService();
