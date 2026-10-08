/**
 * Next.js API Proxy Route
 *
 * Solves the cross-origin cookie problem:
 * - The session cookie (host_market_session) lives on admin.hostmarketplace.store
 * - The backend API lives on api.hostmarketplace.store
 * - Browsers won't send cookies cross-origin
 *
 * This proxy reads the cookie from the same-origin request and forwards it
 * to the backend, then returns the backend response.
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'host_market_session';

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_URL || 'http://localhost:4000';
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[]
): Promise<Response> {
  try {
    const path = pathSegments.join('/');
    const backendBase = getBackendUrl();

    // Preserve query string from the original request
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    const backendUrl = `${backendBase}/api/v1/${path}${queryString}`;

    // Read the session cookie from the incoming same-origin request
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    // Build headers to forward
    const headers: Record<string, string> = {
      Accept: request.headers.get('accept') || 'application/json',
    };

    // Forward Content-Type (important for multipart/form-data boundaries)
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    // Attach the session cookie for backend authentication
    if (sessionCookie?.value) {
      headers['Cookie'] = `${COOKIE_NAME}=${sessionCookie.value}`;
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // Forward request body for non-GET/HEAD methods
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const buf = await request.arrayBuffer();
        if (buf.byteLength > 0) {
          fetchOptions.body = buf;
        }
      } catch {
        // No body to forward
      }
    }

    const backendRes = await fetch(backendUrl, fetchOptions);

    // Read backend response as text (safe for JSON responses)
    const resText = await backendRes.text();

    // Build the response using standard Response constructor
    const responseHeaders = new Headers();

    // Forward Content-Type from backend
    const resContentType = backendRes.headers.get('content-type');
    if (resContentType) {
      responseHeaders.set('Content-Type', resContentType);
    }

    // Prevent caching of authenticated API responses
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    responseHeaders.set('Pragma', 'no-cache');

    const response = new NextResponse(resText, {
      status: backendRes.status,
      headers: responseHeaders,
    });

    // If the backend cleared the session cookie (logout / account deletion),
    // also clear it on the admin domain so the browser removes it.
    const backendSetCookie = backendRes.headers.get('set-cookie');
    if (backendSetCookie && backendSetCookie.includes(COOKIE_NAME)) {
      if (
        backendSetCookie.includes('Max-Age=0') ||
        backendSetCookie.includes('Expires=Thu, 01 Jan 1970')
      ) {
        response.cookies.set(COOKIE_NAME, '', {
          path: '/',
          maxAge: 0,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }
    }

    return response;
  } catch (error: any) {
    console.error('[API Proxy] Error:', error?.message || error);
    return NextResponse.json(
      {
        statusCode: 502,
        error: 'Bad Gateway',
        message: 'Backend service is currently unavailable',
      },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  // In Next.js 14.2+, params may be a promise in some configurations
  const resolvedParams = await context.params;
  return proxyRequest(request, resolvedParams.path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await context.params;
  return proxyRequest(request, resolvedParams.path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await context.params;
  return proxyRequest(request, resolvedParams.path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await context.params;
  return proxyRequest(request, resolvedParams.path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await context.params;
  return proxyRequest(request, resolvedParams.path);
}
