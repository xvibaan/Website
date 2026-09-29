"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptProviderCredentials = encryptProviderCredentials;
exports.decryptProviderCredentials = decryptProviderCredentials;
const node_crypto_1 = __importDefault(require("node:crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits auth tag
/**
 * Derives a 32-byte encryption key from the environment variable.
 */
function getEncryptionKey() {
    const secret = process.env.PROVIDER_ENCRYPTION_KEY || process.env.AUTH_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Critical Security Error: PROVIDER_ENCRYPTION_KEY (or AUTH_SECRET) must be set in production.');
        }
        return node_crypto_1.default.createHash('sha256').update('dev-insecure-master-provider-key-32bytes!').digest();
    }
    return node_crypto_1.default.createHash('sha256').update(secret).digest();
}
/**
 * Encrypts provider credentials using AES-256-GCM.
 * Output format: Base64(iv:authTag:ciphertext)
 */
function encryptProviderCredentials(credentials) {
    const plainText = typeof credentials === 'string' ? credentials : JSON.stringify(credentials);
    const iv = node_crypto_1.default.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = node_crypto_1.default.createCipheriv(ALGORITHM, key, iv);
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
function decryptProviderCredentials(encryptedBase64) {
    try {
        const rawPacked = Buffer.from(encryptedBase64, 'base64').toString('utf8');
        const [ivHex, authTagHex, encryptedHex] = rawPacked.split(':');
        if (!ivHex || !authTagHex || !encryptedHex) {
            throw new Error('Invalid encrypted payload structure');
        }
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = getEncryptionKey();
        const decipher = node_crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        try {
            return JSON.parse(decrypted);
        }
        catch {
            return decrypted;
        }
    }
    catch (error) {
        throw new Error(`Failed to decrypt provider credentials: ${error.message}`);
    }
}
