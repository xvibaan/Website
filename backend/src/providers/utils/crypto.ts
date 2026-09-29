import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Derives a 32-byte encryption key from the environment variable.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.PROVIDER_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Critical Security Error: PROVIDER_ENCRYPTION_KEY (or AUTH_SECRET) must be set in production.'
      );
    }
    return crypto.createHash('sha256').update('dev-insecure-master-provider-key-32bytes!').digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts provider credentials using AES-256-GCM.
 * Output format: Base64(iv:authTag:ciphertext)
 */
export function encryptProviderCredentials(credentials: Record<string, any> | string): string {
  const plainText = typeof credentials === 'string' ? credentials : JSON.stringify(credentials);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  const packed = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  return Buffer.from(packed, 'utf8').toString('base64');
}

/**
 * Decrypts provider credentials encrypted with AES-256-GCM.
 * Validates authentication tag to prevent tampering.
 */
export function decryptProviderCredentials<T = Record<string, any>>(encryptedBase64: string): T {
  try {
    const rawPacked = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    const [ivHex, authTagHex, encryptedHex] = rawPacked.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid encrypted payload structure');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return decrypted as unknown as T;
    }
  } catch (error: any) {
    throw new Error(`Failed to decrypt provider credentials: ${error.message}`);
  }
}
