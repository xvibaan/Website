import dotenv from 'dotenv';

dotenv.config();

export const DEFAULT_PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_REQUEST_TIMEOUT_MS) || 10000;

export class ProviderTimeoutError extends Error {
  public readonly statusCode = 504;
  public readonly code = 'PROVIDER_TIMEOUT';

  constructor(providerCode: string, timeoutMs: number) {
    super(`Provider '${providerCode}' request timed out after ${timeoutMs}ms`);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderDisabledError extends Error {
  public readonly statusCode = 400;
  public readonly code = 'PROVIDER_DISABLED';

  constructor(providerCode: string) {
    super(`The fulfillment provider for this product is currently disabled (provider: ${providerCode})`);
    this.name = 'ProviderDisabledError';
  }
}

export class ProviderMaintenanceError extends Error {
  public readonly statusCode = 503;
  public readonly code = 'PROVIDER_MAINTENANCE';

  constructor(providerCode: string) {
    super(`The fulfillment provider for this product is currently undergoing maintenance (provider: ${providerCode})`);
    this.name = 'ProviderMaintenanceError';
  }
}

export class ProviderAdapterNotFoundError extends Error {
  public readonly statusCode = 500;
  public readonly code = 'PROVIDER_ADAPTER_NOT_FOUND';

  constructor(providerCode: string) {
    super(`No registered adapter found for provider code '${providerCode}'`);
    this.name = 'ProviderAdapterNotFoundError';
  }
}

/**
 * Sanitizes error messages by scrubbing potential API keys, bearer tokens, passwords, and sensitive params.
 */
export function sanitizeProviderError(error: any): string {
  if (!error) return 'Unknown provider error';
  const rawMsg = error instanceof Error ? error.message : String(error);

  // Redact potential secrets, tokens, and authorization strings
  return rawMsg
    .replace(/(?:Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/(?:key|secret|password|token)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/(?:api[-_]?key:?\s*)([A-Za-z0-9_\-]{8,})/gi, 'apiKey: [REDACTED]')
    .substring(0, 500); // Prevent unbounded error lengths
}

/**
 * Wraps an asynchronous operation with an enforceable timeout promise.
 * Automatically clears timer when resolved/rejected to prevent lingering handles.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_PROVIDER_TIMEOUT_MS,
  providerCode: string = 'unknown'
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ProviderTimeoutError(providerCode, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
