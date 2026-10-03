import { UserRepository } from '../db/repositories/user.repository';
import { RegisterInput, LoginInput } from './auth.validation';
import { SafeUser } from './auth.types';
import { GoogleIdentity } from './google-oauth.service';
export interface AuthResult {
    token: string;
    user: SafeUser;
}
export declare class AuthService {
    private userRepo;
    constructor(userRepo?: UserRepository);
    /**
     * Registers a new customer user.
     * Enforces server-controlled role ('customer'), email normalization, and password hashing.
     */
    register(input: RegisterInput): Promise<AuthResult>;
    /**
     * Authenticates user credentials.
     * Verifies password hash, active status, and returns a signed session token.
     */
    login(input: LoginInput): Promise<AuthResult>;
    /**
     * Authenticates a verified Google identity.
     *
     * Existing user:
     * - Finds by Google ID first.
     * - Otherwise finds by verified email and links the Google ID.
   *
     * New user:
     * - Creates a customer account.
     * - Stores a random unusable password hash because the current schema
     *   requires password_hash to be non-null.
     */
    loginWithGoogle(identity: GoogleIdentity): Promise<AuthResult>;
    /**
     * Resolves safe user details for the authenticated user ID.
     */
    getCurrentUser(userId: string): Promise<SafeUser>;
    /**
     * Helper to strip sensitive database fields (e.g. passwordHash).
     */
    toSafeUser(user: {
        id: string;
        email: string;
        role: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }): SafeUser;
    /**
     * Securely closes a user account.
     * - Anonymizes personal data (email).
     * - Deactivates the account (prevents login).
     * - Disables the associated wallet to prevent transactions.
     * - Preserves historical financial records tied to the user ID.
     */
    deleteAccount(userId: string): Promise<void>;
}
export declare const authService: AuthService;
