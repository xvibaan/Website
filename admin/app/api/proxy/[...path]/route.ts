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
export const runtime = 'nodejs';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';
const COOKIE_NAME = 'host_market_session';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
): Promise<NextResponse> {
  const pathSegments = params.path;
  const path = pathSegments.join('/');

  // Preserve query string from the original request
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  const backendUrl = `${BACKEND_URL}/api/v1/${path}${queryString}`;

  // Read the session cookie from the incoming same-origin request
  const cookieStore = cookies();
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

  // Forward request body for non-GET/HEAD methods
  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const buf = await request.arrayBuffer();
      if (buf.byteLength > 0) {
        body = buf;
      }
    } catch {
      // No body to forward
    }
  }

  try {
    const backendRes = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
    });

    // Read backend response
    const resBody = await backendRes.arrayBuffer();

    const response = new NextResponse(resBody, {
      status: backendRes.status,
      statusText: backendRes.statusText,
    });

    // Forward Content-Type from backend
    const resContentType = backendRes.headers.get('content-type');
    if (resContentType) {
      response.headers.set('Content-Type', resContentType);
    }

    // Prevent caching of authenticated API responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');

    // If the backend cleared the session cookie (logout / account deletion),
    // also clear it on the admin domain so the browser removes it.
    const backendSetCookie = backendRes.headers.get('set-cookie');
    if (backendSetCookie && backendSetCookie.includes(COOKIE_NAME)) {
      // Backend is setting/clearing the cookie — mirror the clear on admin domain
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
    console.error('[API Proxy] Backend request failed:', error.message);
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
  context: { params: { path: string[] } }
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(request, context);
}
