// Authoritative Customer API Client

const BASE_URL = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_BACKEND_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:4000"));

interface RequestOptions extends RequestInit {
  data?: any;
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, headers, ...customConfig } = options;

  const config: RequestInit = {
    method: data ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include",
    ...customConfig,
  };

  if (data) {
    config.body = typeof data === "string" ? data : JSON.stringify(data);
  }

  let url = endpoint;
  if (!url.startsWith("http")) {
    if (typeof window !== "undefined") {
      url = endpoint.startsWith("/api") ? endpoint : `/api/${endpoint.replace(/^\/+/, "")}`;
    } else {
      url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    }
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || errorBody.detail || errorMessage;
    } catch {}
    const error: any = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}

export const customerApi = {
  get: <T = any>(url: string, options?: RequestOptions) => apiClient<T>(url, { ...options, method: "GET" }),
  post: <T = any>(url: string, data?: any, options?: RequestOptions) => apiClient<T>(url, { ...options, method: "POST", data }),
  put: <T = any>(url: string, data?: any, options?: RequestOptions) => apiClient<T>(url, { ...options, method: "PUT", data }),
  patch: <T = any>(url: string, data?: any, options?: RequestOptions) => apiClient<T>(url, { ...options, method: "PATCH", data }),
  delete: <T = any>(url: string, options?: RequestOptions) => apiClient<T>(url, { ...options, method: "DELETE" }),
};

export const api = customerApi;
