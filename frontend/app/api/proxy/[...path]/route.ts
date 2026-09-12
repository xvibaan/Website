import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function handleProxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const pathArray = params.path || [];
    const targetPath = pathArray.join("/");
    const searchParams = request.nextUrl.search;
    const targetUrl = `${API_BASE_URL}/${targetPath}${searchParams}`;

    // Read HttpOnly access_token cookie securely on the server
    const cookieStore = cookies();
    const token = cookieStore.get("access_token")?.value;

    // Route Protection Rules
    const isPublicAuthRoute = targetPath === "auth/login" || targetPath === "auth/register";
    const isAuthMeRoute = targetPath === "auth/me";
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
    
    // Identify if the request requires authentication:
    // 1. It is explicitly /auth/me (GET)
    // 2. It is a data mutation AND NOT a public auth route (login/register)
    // 3. It accesses sensitive key endpoints
    const isProtectedAction = isAuthMeRoute || (isMutation && !isPublicAuthRoute) || targetPath.includes("keys");

    // If the token is missing on protected/mutating requests, return 401 immediately
    // Public routes like /auth/login and /auth/register bypass this check
    if (isProtectedAction && !token) {
      return NextResponse.json(
        { detail: "Authentication required. Missing access token." },
        { status: 401 }
      );
    }

    // Build headers to forward, excluding unsafe hop-by-hop or browser-specific headers
    const headers = new Headers();
    const excludeHeaders = ["host", "connection", "content-length", "cookie"];
    
    request.headers.forEach((value, key) => {
      if (!excludeHeaders.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // Attach Bearer token if available
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Extract request body for non-GET/HEAD requests
    let body: BodyInit | undefined = undefined;
    if (!["GET", "HEAD"].includes(request.method)) {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json") || contentType.includes("application/x-www-form-urlencoded")) {
        body = await request.text();
      } else {
        body = await request.blob();
      }
    }

    // Forward request to FastAPI backend
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    // Read backend response
    const responseData = await backendResponse.arrayBuffer();

    // Prepare response headers, filtering out hop-by-hop response headers
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      if (!["transfer-encoding", "connection", "keep-alive"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(responseData, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("Proxy routing error:", error);
    // Security enhancement: Remove internal error.message details from client responses
    return NextResponse.json(
      { detail: "Internal proxy gateway error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return handleProxy(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return handleProxy(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return handleProxy(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return handleProxy(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return handleProxy(request, context);
}
