/**
 * Admin Application API Client
 * Uses the same-origin Next.js proxy so the HttpOnly
 * host_market_session cookie remains on admin.hostmarketplace.store.
 */

function buildUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `/api/proxy${cleanEndpoint}`;
}

export const api = {
  async get<T = any>(endpoint: string): Promise<T> {
    const res = await fetch(buildUrl(endpoint), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }

    return res.json();
  },

  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    const res = await fetch(buildUrl(endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: res.statusText }));

      throw new Error(err.message || `API error ${res.status}`);
    }

    return res.json();
  },

  async patch<T = any>(endpoint: string, body?: any): Promise<T> {
    const res = await fetch(buildUrl(endpoint), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: res.statusText }));

      throw new Error(err.message || `API error ${res.status}`);
    }

    return res.json();
  },

  async delete<T = any>(endpoint: string): Promise<T> {
    const res = await fetch(buildUrl(endpoint), {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: res.statusText }));

      throw new Error(err.message || `API error ${res.status}`);
    }

    return res.json();
  },
};
