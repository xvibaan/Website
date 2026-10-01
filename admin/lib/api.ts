/**
 * Admin Application API Client
 * Dispatches to /api/v1/admin (or /api/v1) backed by Fastify Master Backend
 */

const isProd = process.env.NODE_ENV === 'production';
const envUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
if (isProd && !envUrl) {
  throw new Error('CRITICAL CONFIGURATION ERROR: NEXT_PUBLIC_BACKEND_API_URL is required in production.');
}
const BACKEND_URL = envUrl || "http://localhost:4000";

export const api = {
  async get<T = any>(endpoint: string): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const urlPath = cleanEndpoint.startsWith('/admin')
      ? `/api/v1${cleanEndpoint}`
      : `/api/v1${cleanEndpoint}`;
    const url = `${BACKEND_URL}${urlPath}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  },

  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const urlPath = cleanEndpoint.startsWith('/admin')
      ? `/api/v1${cleanEndpoint}`
      : `/api/v1${cleanEndpoint}`;
    const url = `${BACKEND_URL}${urlPath}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
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
    const urlPath = cleanEndpoint.startsWith('/admin')
      ? `/api/v1${cleanEndpoint}`
      : `/api/v1${cleanEndpoint}`;
    const url = `${BACKEND_URL}${urlPath}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
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
    const urlPath = cleanEndpoint.startsWith('/admin')
      ? `/api/v1${cleanEndpoint}`
      : `/api/v1${cleanEndpoint}`;
    const url = `${BACKEND_URL}${urlPath}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `API error ${res.status}`);
    }
    return res.json();
  }
};
