import { IGmailClient, RawGmailMessage } from './famapp.types';

export interface GoogleOAuthGmailClientConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

/**
 * Concrete Google OAuth2 Gmail API Client.
 * Communicates with Gmail REST API v1 using minimal read-only scope.
 * In development or unconfigured staging, safe mock mode is preserved.
 */
export class GoogleOAuthGmailClient implements IGmailClient {
  private clientId?: string;
  private clientSecret?: string;
  private refreshToken?: string;
  private cachedAccessToken?: string;
  private tokenExpiresAt: number = 0;

  constructor(config: GoogleOAuthGmailClientConfig = {}) {
    this.clientId = config.clientId || process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    this.refreshToken = config.refreshToken || process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
  }

  isConfigured(): boolean {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      return false;
    }
    const cleanId = this.clientId.trim();
    const cleanSecret = this.clientSecret.trim();
    const cleanToken = this.refreshToken.trim();
    if (!cleanId || !cleanSecret || !cleanToken) {
      return false;
    }
    if (cleanId.includes('placeholder') || cleanId.includes('your-client-id')) {
      return false;
    }
    return true;
  }

  /**
   * Refreshes OAuth2 access token using the stored refresh token.
   */
  private async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gmail OAuth credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) are not configured.');
    }

    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedAccessToken;
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const body = new URLSearchParams({
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
      refresh_token: this.refreshToken!,
      grant_type: 'refresh_token',
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google OAuth token refresh failed (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    this.cachedAccessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

    return this.cachedAccessToken!;
  }

  async listMessages(
    query: string,
    pageToken?: string,
    maxResults: number = 50
  ): Promise<{ messages: Array<{ id: string; threadId: string }>; nextPageToken?: string }> {
    const token = await this.getAccessToken();
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', maxResults.toString());
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gmail API listMessages error (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    return {
      messages: data.messages || [],
      nextPageToken: data.nextPageToken,
    };
  }

  async getMessage(id: string): Promise<RawGmailMessage> {
    const token = await this.getAccessToken();
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gmail API getMessage error (${res.status}): ${errText}`);
    }

    return (await res.json()) as RawGmailMessage;
  }

  async listHistory(startHistoryId: string): Promise<{ history?: any[]; historyId: string }> {
    const token = await this.getAccessToken();
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gmail API listHistory error (${res.status}): ${errText}`);
    }

    return (await res.json()) as any;
  }
}
