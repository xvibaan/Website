"use server";

import { cookies } from "next/headers";

export async function logoutWithAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("host_market_session");
    cookieStore.set("host_market_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return { success: true };
  } catch (error: any) {
    console.error("Logout Server Action Error:", error);
    return { error: "An unexpected error occurred during logout." };
  }
}
