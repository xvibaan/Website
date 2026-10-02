/**
 * Admin Application API Client
 *
 * Routes through the same-origin Next.js API proxy (/api/proxy/...)
 * so the browser sends the session cookie (which lives on admin.hostmarketplace.store)
 * to the proxy, which then forwards it to the backend.
 *
 * This eliminates the cross-origin cookie problem that caused /auth/me to return 401.
 */

export const api = {
  async get<T = any>(endpoint: string): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `/api/proxy${cleanEndpoint}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  },

  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `/api/proxy${cleanEndpoint}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `API error ${res.status}`);
    }
    return res.json();
  },

  async patch<T = any>(endpoint: string, body?: any): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `/api/proxy${cleanEndpoint}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `API error ${res.status}`);
    }
    return res.json();
  },

  async delete<T = any>(endpoint: string): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `/api/proxy${cleanEndpoint}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `API error ${res.status}`);
    }
    return res.json();
  }
};
