import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Password service for hashing and verifying passwords using bcrypt
 * with work factor / cost of 12.
 * Keeps password logic cleanly separated from database operations.
 */
export class PasswordService {
  /**
   * Hashes a plaintext password securely.
   */
  static async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
  }

  /**
   * Securely compares a plaintext password against a stored bcrypt hash.
   */
  static async compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
