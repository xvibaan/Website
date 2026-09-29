import crypto from 'crypto';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB = 5,242,880 bytes

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
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
export function detectMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  // 'R' = 0x52, 'I' = 0x49, 'F' = 0x46, 'F' = 0x46
  // 'W' = 0x57, 'E' = 0x45, 'B' = 0x42, 'P' = 0x50
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Checks if buffer or declared content looks like an SVG file.
 */
export function isSvg(buffer: Buffer, declaredMime: string, filename: string): boolean {
  if (declaredMime && declaredMime.toLowerCase().includes('svg')) {
    return true;
  }
  if (filename && filename.toLowerCase().endsWith('.svg')) {
    return true;
  }
  // Check first 100 bytes for XML or SVG declaration
  const headerText = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8').toLowerCase();
  if (headerText.includes('<svg') || (headerText.includes('<?xml') && headerText.includes('svg'))) {
    return true;
  }
  return false;
}

/**
 * Comprehensive Image File Validation
 * Enforces size limit, MIME type allowlist, SVG rejection, and magic byte verification.
 */
export function validateImageFile(
  buffer: Buffer,
  declaredMime: string,
  filename: string
): FileValidationResult {
  // 1. File Size Verification
  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: 'Uploaded file is empty' };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 5 MB limit (${(buffer.length / (1024 * 1024)).toFixed(2)} MB uploaded)`,
    };
  }

  // 2. Reject SVG explicitly
  if (isSvg(buffer, declaredMime, filename)) {
    return {
      isValid: false,
      error: 'SVG format is not allowed for product images due to security risks. Please use JPEG, PNG, or WebP.',
    };
  }

  // 3. Validate declared MIME type
  const normalizedMime = (declaredMime || '').trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime as AllowedMimeType)) {
    return {
      isValid: false,
      error: `Unsupported image format '${declaredMime}'. Allowed formats are JPEG, PNG, and WebP.`,
    };
  }

  // 4. Validate binary magic bytes signature
  const detectedMime = detectMagicBytes(buffer);
  if (!detectedMime) {
    return {
      isValid: false,
      error: 'File signature does not match any valid image format. File may be corrupted or disguised.',
    };
  }

  // 5. Verify declared MIME matches detected binary signature
  if (detectedMime !== normalizedMime) {
    return {
      isValid: false,
      error: `MIME type mismatch: declared '${declaredMime}', but actual binary signature is '${detectedMime}'.`,
    };
  }

  // 6. Map extension from verified MIME type
  let suggestedExtension = '.jpg';
  if (detectedMime === 'image/png') suggestedExtension = '.png';
  if (detectedMime === 'image/webp') suggestedExtension = '.webp';

  return {
    isValid: true,
    detectedMime,
    suggestedExtension,
  };
}

/**
 * Generates a collision-resistant, sanitized server-side storage key.
 * Never uses the client's filename directly.
 * Format: products/<uuid>.<ext>
 */
export function generateStorageKey(extension: string): string {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  const uuid = crypto.randomUUID();
  return `products/${uuid}${ext}`;
}

/**
 * Validates a storage key to ensure it strictly belongs to the controlled products directory
 * and contains no path traversal sequences.
 */
export function isValidStorageKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  // Key must match: products/<uuid>.<ext> or products/<uuid>
  const keyRegex = /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]+)?$/i;
  return keyRegex.test(key) && !key.includes('..') && !key.includes('\\');
}
