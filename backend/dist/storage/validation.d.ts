export declare const MAX_FILE_SIZE_BYTES: number;
export declare const ALLOWED_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];
export interface FileValidationResult {
    isValid: boolean;
    error?: string;
    detectedMime?: string;
    suggestedExtension?: string;
}
/**
 * Detects image file type from initial binary magic bytes.
 * Reads the first 12 bytes of the buffer.
 */
export declare function detectMagicBytes(buffer: Buffer): string | null;
/**
 * Checks if buffer or declared content looks like an SVG file.
 */
export declare function isSvg(buffer: Buffer, declaredMime: string, filename: string): boolean;
/**
 * Comprehensive Image File Validation
 * Enforces size limit, MIME type allowlist, SVG rejection, and magic byte verification.
 */
export declare function validateImageFile(buffer: Buffer, declaredMime: string, filename: string): FileValidationResult;
/**
 * Generates a collision-resistant, sanitized server-side storage key.
 * Never uses the client's filename directly.
 * Format: products/<uuid>.<ext>
 */
export declare function generateStorageKey(extension: string): string;
/**
 * Validates a storage key to ensure it strictly belongs to the controlled products directory
 * and contains no path traversal sequences.
 */
export declare function isValidStorageKey(key: string): boolean;
