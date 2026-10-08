"use server";

import { cookies } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://127.0.0.1:4000";

export async function loginWithCookie(formData: FormData) {
  try {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = (formData.get("password") as string)?.trim();

    if (!email || !password) {
      return { error: "Email and password are required." };
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { error: data.message || data.detail || "Invalid email or password." };
      }

      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const tokenMatch = setCookie.match(/host_market_session=([^;]+)/);
        if (tokenMatch && tokenMatch[1]) {
          (await cookies()).set("host_market_session", tokenMatch[1], {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24,
          });
        }
      }

      return { success: true };
    } catch (fetchErr: any) {
      return { error: "Authentication service currently unavailable. Please try again." };
    }
  } catch (error: any) {
    console.error("Login Server Action Error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}
