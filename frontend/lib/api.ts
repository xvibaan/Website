/**
 * Centralized API helper for Next.js client components.
 * This routes all requests through the Next.js API proxy (`/api/proxy/[...path]`),
 * which securely attaches the HttpOnly JWT access_token to protected backend routes.
 */

const PROXY_BASE_URL = "/api/proxy";

interface FetchOptions extends RequestInit {
  body?: any;
}

export async function apiFetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const formattedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${PROXY_BASE_URL}${formattedEndpoint}`;

  const headers = new Headers(options.headers);

  // Automatically handle JSON bodies if the body is an object (and not FormData)
  let requestBody = options.body;
  if (
    requestBody &&
    typeof requestBody === "object" &&
    !(requestBody instanceof FormData)
  ) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    requestBody = JSON.stringify(requestBody);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body: requestBody,
  });

  // Handle non-2xx responses gracefully
  if (!res.ok) {
    let errorMessage = "An error occurred during the request.";
    try {
      const errorData = await res.json();
      // FastAPI traditionally returns errors inside a "detail" key
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content explicitly
  if (res.status === 204) {
    return {} as T;
  }

  // Parse and return JSON data
  try {
    const data = await res.json();
    return data as T;
  } catch (e) {
    // If response is not JSON (e.g., empty body but 200 OK), return empty object
    return {} as T;
  }
}

// Convenience wrapper for common HTTP methods
export const api = {
  get: <T = any>(endpoint: string, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body: any, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch<T>(endpoint, { ...options, method: "POST", body }),

  put: <T = any>(endpoint: string, body: any, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T = any>(endpoint: string, body: any, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T = any>(endpoint: string, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
};
