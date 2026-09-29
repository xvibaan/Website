/**
 * Password service for hashing and verifying passwords using bcrypt
 * with work factor / cost of 12.
 * Keeps password logic cleanly separated from database operations.
 */
export declare class PasswordService {
    /**
     * Hashes a plaintext password securely.
     */
    static hash(plaintext: string): Promise<string>;
    /**
     * Securely compares a plaintext password against a stored bcrypt hash.
     */
    static compare(plaintext: string, hash: string): Promise<boolean>;
}
