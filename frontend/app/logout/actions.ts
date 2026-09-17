"use server";

import { cookies } from "next/headers";

/**
 * Server Action to handle user logout securely.
 * This is required because the access_token is stored as an HttpOnly cookie,
 * which cannot be deleted by client-side JavaScript.
 */
export async function logoutWithAction() {
  try {
    // Securely remove the HttpOnly cookie from the server side
    cookies().delete("access_token");
    
    return { success: true };
  } catch (error: any) {
    console.error("Logout Server Action Error:", error);
    return { error: "An unexpected error occurred during logout." };
  }
}
