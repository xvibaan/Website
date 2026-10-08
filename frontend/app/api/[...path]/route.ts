import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:4000");

async function proxyRequest(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const params = await context.params;
    const pathArray = params.path || [];
    const rawPath = pathArray.join("/");
    
    // Prevent accessing any admin endpoints through the customer proxy
    if (rawPath.startsWith("admin") || rawPath.startsWith("v1/admin")) {
      return NextResponse.json(
        { error: "Forbidden: Customer proxy cannot access administrative namespaces." },
        { status: 403 }
      );
    }

    // Normalize customer target endpoints to Master Backend /api/v1/
    let targetEndpoint = rawPath.startsWith("v1/") ? `/api/${rawPath}` : `/api/v1/${rawPath}`;
    if (rawPath.startsWith("products") || rawPath.startsWith("categories") || rawPath.startsWith("content") || rawPath.startsWith("wallet") || rawPath.startsWith("payments") || rawPath.startsWith("auth") || rawPath.startsWith("orders")) {
      targetEndpoint = `/api/v1/${rawPath}`;
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("host_market_session")?.value;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["Cookie"] = `host_market_session=${token}`;
    }

    const url = new URL(request.url);
    const searchParams = url.search;
    const targetUrl = `${BACKEND_URL}${targetEndpoint}${searchParams}`;

    let body: any = undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        body = await request.text();
      } catch {}
    }

    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body ? body : undefined,
      cache: "no-store",
    });

    const responseText = await backendResponse.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    const nextResponse = NextResponse.json(responseData, {
      status: backendResponse.status,
    });

    // Forward Set-Cookie if any from authentication
    const setCookie = backendResponse.headers.get("set-cookie");
    if (setCookie) {
      nextResponse.headers.set("set-cookie", setCookie);
    }

    return nextResponse;
  } catch (error: any) {
    console.error("Frontend Proxy Error:", error);
    return NextResponse.json(
      { error: "Backend proxy connection error", detail: error.message },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}
