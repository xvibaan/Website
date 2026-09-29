/**
 * Admin Authentication Utilities
 * Interfaces and client token decoding for Master Admin Console
 */

export interface AdminUser {
  id: string | number;
  email: string;
  role: string;
  is_active?: boolean;
}

export function parseJwtPayload(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
