"use server";

import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function loginWithCookie(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "Email and password are required." };
    }

    // FastAPI's OAuth2PasswordRequestForm strictly requires form-urlencoded data
    // and expects the email to be mapped to the "username" field
    const body = new URLSearchParams();
    body.append("username", email);
    body.append("password", password);

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      let errorMessage = "Invalid email or password.";
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        // Fallback if parsing fails
      }
      return { error: errorMessage };
    }

    const data = await res.json();

    // Securely set the HttpOnly cookie using Next.js cookies API
    cookies().set("access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour expiration
    });

    return { success: true };
  } catch (error: any) {
    console.error("Login Server Action Error:", error);
    return { error: "An unexpected network error occurred. Please try again." };
  }
}
