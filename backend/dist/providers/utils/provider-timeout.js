"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderAdapterNotFoundError = exports.ProviderMaintenanceError = exports.ProviderDisabledError = exports.ProviderTimeoutError = exports.DEFAULT_PROVIDER_TIMEOUT_MS = void 0;
exports.sanitizeProviderError = sanitizeProviderError;
exports.withTimeout = withTimeout;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.DEFAULT_PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_REQUEST_TIMEOUT_MS) || 10000;
class ProviderTimeoutError extends Error {
    statusCode = 504;
    code = 'PROVIDER_TIMEOUT';
    constructor(providerCode, timeoutMs) {
        super(`Provider '${providerCode}' request timed out after ${timeoutMs}ms`);
        this.name = 'ProviderTimeoutError';
    }
}
exports.ProviderTimeoutError = ProviderTimeoutError;
class ProviderDisabledError extends Error {
    statusCode = 400;
    code = 'PROVIDER_DISABLED';
    constructor(providerCode) {
        super(`The fulfillment provider for this product is currently disabled (provider: ${providerCode})`);
        this.name = 'ProviderDisabledError';
    }
}
exports.ProviderDisabledError = ProviderDisabledError;
class ProviderMaintenanceError extends Error {
    statusCode = 503;
    code = 'PROVIDER_MAINTENANCE';
    constructor(providerCode) {
        super(`The fulfillment provider for this product is currently undergoing maintenance (provider: ${providerCode})`);
        this.name = 'ProviderMaintenanceError';
    }
}
exports.ProviderMaintenanceError = ProviderMaintenanceError;
class ProviderAdapterNotFoundError extends Error {
    statusCode = 500;
    code = 'PROVIDER_ADAPTER_NOT_FOUND';
    constructor(providerCode) {
        super(`No registered adapter found for provider code '${providerCode}'`);
        this.name = 'ProviderAdapterNotFoundError';
    }
}
exports.ProviderAdapterNotFoundError = ProviderAdapterNotFoundError;
/**
 * Sanitizes error messages by scrubbing potential API keys, bearer tokens, passwords, and sensitive params.
 */
function sanitizeProviderError(error) {
    if (!error)
        return 'Unknown provider error';
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
async function withTimeout(promise, timeoutMs = exports.DEFAULT_PROVIDER_TIMEOUT_MS, providerCode = 'unknown') {
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
            reject(new ProviderTimeoutError(providerCode, timeoutMs));
        }, timeoutMs);
    });
    try {
        const result = await Promise.race([promise, timeoutPromise]);
        return result;
    }
    finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}
