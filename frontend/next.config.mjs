import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path to the frontend directory */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';
const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || '';

let backendOrigin = '';

if (backendApiUrl) {
  try {
    const url = new URL(backendApiUrl);
    backendOrigin = url.origin;
  } catch (e) {
    // Invalid backend URL: keep backendOrigin empty.
  }
}

const scriptSrc = isProd
  ? "'self' 'unsafe-inline' https://checkout.razorpay.com"
  : "'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com";

const connectSrc = isProd
  ? "'self' " + backendOrigin + " https://lumberjack-cx.razorpay.com https://api.razorpay.com"
  : "'self' " + backendOrigin + " https://lumberjack-cx.razorpay.com https://api.razorpay.com ws: wss:";

const imgSrc = "'self' data: blob: " + backendOrigin + " https:";

const cspHeader = [
  "default-src 'self';",
  "script-src " + scriptSrc + ";",
  "style-src 'self' 'unsafe-inline';",
  "img-src " + imgSrc + ";",
  "connect-src " + connectSrc + ";",
  "frame-src 'self' https://api.razorpay.com;",
  "object-src 'none';",
  "base-uri 'self';",
  "form-action 'self';",
  "frame-ancestors 'none';",
].join(' ');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // Keep standalone tracing scoped to the frontend application.
  outputFileTracingRoot: __dirname,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;