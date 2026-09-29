import { cookies } from "next/headers";

export interface UserRecord {
  id: number | string;
  email: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt?: string;
  walletBalance?: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://127.0.0.1:4000";

export async function getCurrentUser(): Promise<UserRecord | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("host_market_session")?.value;

    if (!token) {
      return null;
    }

    const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `host_market_session=${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.user || data;
  } catch (error) {
    console.error("Auth helper error:", error);
    return null;
  }
}
