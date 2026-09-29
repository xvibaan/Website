import { UserRepository } from '../db/repositories/user.repository';
import { RegisterInput, LoginInput } from './auth.validation';
import { SafeUser } from './auth.types';
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
}
export declare const authService: AuthService;
