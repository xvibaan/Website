"use server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function registerWithAction(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "Email and password are required." };
    }

    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let errorMessage = "Registration failed. Please try again.";
      try {
        const errorData = await res.json();
        // FastAPI usually returns specific error messages (e.g., "Email already registered") in the `detail` field
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        // Fallback if parsing JSON fails
      }
      return { error: errorMessage };
    }

    // Do not set a JWT cookie here; the user will be routed to login or logged in separately.
    return { success: true };
  } catch (error: any) {
    console.error("Register Server Action Error:", error);
    return { error: "An unexpected network error occurred. Please try again." };
  }
}
