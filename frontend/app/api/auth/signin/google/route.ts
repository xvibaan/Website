import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "http://127.0.0.1:4000");

const STATE_COOKIE = "google_oauth_state";

function isSafeCallbackPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes("://")
  );
}

export async function GET(request: NextRequest) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json(
        {
          error: "Google authentication backend is not configured.",
        },
        { status: 503 }
      );
    }

    const requestedCallback =
      request.nextUrl.searchParams.get("callbackUrl") || "/dashboard";

    const callbackPath = isSafeCallbackPath(requestedCallback)
      ? requestedCallback
      : "/dashboard";

    const backendUrl = new URL("/api/v1/auth/signin/google", BACKEND_URL);
    backendUrl.searchParams.set("callbackUrl", callbackPath);

    const backendResponse = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok || !data?.authorizationUrl || !data?.state) {
      return NextResponse.json(
        {
          error:
            data?.message ||
            "Google authentication is currently unavailable.",
        },
        { status: backendResponse.status || 503 }
      );
    }

    const response = NextResponse.redirect(data.authorizationUrl);

    cookies().set(STATE_COOKIE, data.state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Google OAuth Start Error:", error);

    return NextResponse.json(
      {
        error: "Unable to start Google authentication.",
      },
      { status: 502 }
    );
  }
}
