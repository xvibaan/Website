/**
 * Encrypts provider credentials using AES-256-GCM.
 * Output format: Base64(iv:authTag:ciphertext)
 */
export declare function encryptProviderCredentials(credentials: Record<string, any> | string): string;
/**
 * Decrypts provider credentials encrypted with AES-256-GCM.
 * Validates authentication tag to prevent tampering.
 */
export declare function decryptProviderCredentials<T = Record<string, any>>(encryptedBase64: string): T;
