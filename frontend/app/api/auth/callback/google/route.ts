import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "http://127.0.0.1:4000");

const PUBLIC_APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL || "https://hostmarketplace.store";

const STATE_COOKIE = "google_oauth_state";
const SESSION_COOKIE = "host_market_session";

function isSafeCallbackPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes("://")
  );
}

function createPublicUrl(path: string): URL {
  return new URL(path, PUBLIC_APP_ORIGIN);
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state")?.trim();
  const code = request.nextUrl.searchParams.get("code")?.trim();
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      createPublicUrl(
        `/login?error=google_${encodeURIComponent(oauthError)}`
      )
    );
  }

  if (!state || !code) {
    return NextResponse.redirect(
      createPublicUrl("/login?error=google_callback_invalid")
    );
  }

  const stateCookie = cookies().get(STATE_COOKIE)?.value;

  if (!stateCookie || stateCookie !== state) {
    cookies().delete(STATE_COOKIE);

    return NextResponse.redirect(
      createPublicUrl("/login?error=google_state_invalid")
    );
  }

  if (!BACKEND_URL) {
    cookies().delete(STATE_COOKIE);

    return NextResponse.redirect(
      createPublicUrl("/login?error=google_backend_unavailable")
    );
  }

  try {
    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/auth/callback/google`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          code,
          state,
        }),
        cache: "no-store",
      }
    );

    const data = await backendResponse.json().catch(() => null);

    cookies().delete(STATE_COOKIE);

    if (!backendResponse.ok || !data?.token) {
      const message =
        typeof data?.message === "string"
          ? data.message
          : "Google authentication failed.";

      return NextResponse.redirect(
        createPublicUrl(`/login?error=${encodeURIComponent(message)}`)
      );
    }

    const callbackPath =
      typeof data.callbackPath === "string" &&
      isSafeCallbackPath(data.callbackPath)
        ? data.callbackPath
        : "/dashboard";

    const response = NextResponse.redirect(
      createPublicUrl(callbackPath)
    );

    response.cookies.set(SESSION_COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Google OAuth Callback Error:", error);

    cookies().delete(STATE_COOKIE);

    return NextResponse.redirect(
      createPublicUrl("/login?error=google_callback_failed")
    );
  }
}
