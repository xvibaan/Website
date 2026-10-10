import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === 'production';
const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || '';

let backendOrigin = '';

if (backendApiUrl) {
  try {
    const url = new URL(backendApiUrl);
    backendOrigin = url.origin;
  } catch (e) {
    // Keep backendOrigin empty if the URL is invalid.
  }
}

const scriptSrc = isProd
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'";

const connectSrc = isProd
  ? `'self' ${backendOrigin}`.trim()
  : `'self' ${backendOrigin} ws: wss:`.trim();

const imgSrc = `'self' data: blob: ${backendOrigin} https:`.trim();

const cspHeader = `
  default-src 'self';
  script-src ${scriptSrc};
  style-src 'self' 'unsafe-inline';
  img-src ${imgSrc};
  connect-src ${connectSrc};
  frame-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
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