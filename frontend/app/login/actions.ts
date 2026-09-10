"use server";

import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function loginWithCookie(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // FastAPI OAuth2 requires Form Data
  const fastApiFormData = new URLSearchParams();
  fastApiFormData.append("username", email);
  fastApiFormData.append("password", password);

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: fastApiFormData.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || "Invalid email or password" };
    }

    const data = await response.json();

    // Securely set HttpOnly Cookie via Next.js Server
    cookies().set("access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS in production
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour (matches our FastAPI expiration)
    });

    return { success: true };
  } catch (error) {
    return { error: "Something went wrong. Please try again." };
  }
}
