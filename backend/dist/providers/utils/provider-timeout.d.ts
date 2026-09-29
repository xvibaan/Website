export declare const DEFAULT_PROVIDER_TIMEOUT_MS: number;
export declare class ProviderTimeoutError extends Error {
    readonly statusCode = 504;
    readonly code = "PROVIDER_TIMEOUT";
    constructor(providerCode: string, timeoutMs: number);
}
export declare class ProviderDisabledError extends Error {
    readonly statusCode = 400;
    readonly code = "PROVIDER_DISABLED";
    constructor(providerCode: string);
}
export declare class ProviderMaintenanceError extends Error {
    readonly statusCode = 503;
    readonly code = "PROVIDER_MAINTENANCE";
    constructor(providerCode: string);
}
export declare class ProviderAdapterNotFoundError extends Error {
    readonly statusCode = 500;
    readonly code = "PROVIDER_ADAPTER_NOT_FOUND";
    constructor(providerCode: string);
}
/**
 * Sanitizes error messages by scrubbing potential API keys, bearer tokens, passwords, and sensitive params.
 */
export declare function sanitizeProviderError(error: any): string;
/**
 * Wraps an asynchronous operation with an enforceable timeout promise.
 * Automatically clears timer when resolved/rejected to prevent lingering handles.
 */
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs?: number, providerCode?: string): Promise<T>;
