"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const user_repository_1 = require("../db/repositories/user.repository");
const password_service_1 = require("./password.service");
const session_1 = require("./session");
class AuthService {
    userRepo;
    constructor(userRepo) {
        this.userRepo = userRepo || user_repository_1.userRepository;
    }
    /**
     * Registers a new customer user.
     * Enforces server-controlled role ('customer'), email normalization, and password hashing.
     */
    async register(input) {
        const normalizedEmail = input.email.toLowerCase().trim();
        // Check duplicate email
        const existing = await this.userRepo.findByEmail(normalizedEmail);
        if (existing) {
            const error = new Error('An account with this email already exists');
            error.statusCode = 409;
            error.name = 'Conflict';
            throw error;
        }
        // Hash password securely with bcrypt
        const passwordHash = await password_service_1.PasswordService.hash(input.password);
        // Create user with server-controlled role
        const created = await this.userRepo.create({
            email: normalizedEmail,
            passwordHash,
            role: 'customer',
            isActive: true,
        });
        const userPayload = {
            userId: created.id,
            email: created.email,
            role: created.role,
            isActive: created.isActive,
        };
        const token = (0, session_1.createSessionToken)(userPayload);
        const safeUser = this.toSafeUser(created);
        return { token, user: safeUser };
    }
    /**
     * Authenticates user credentials.
     * Verifies password hash, active status, and returns a signed session token.
     */
    async login(input) {
        const normalizedEmail = input.email.toLowerCase().trim();
        const user = await this.userRepo.findByEmail(normalizedEmail);
        if (!user) {
            // Generic invalid credentials message to prevent user enumeration
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            error.name = 'Unauthorized';
            throw error;
        }
        if (!user.isActive) {
            const error = new Error('Account is inactive or suspended');
            error.statusCode = 403;
            error.name = 'Forbidden';
            throw error;
        }
        const isPasswordValid = await password_service_1.PasswordService.compare(input.password, user.passwordHash);
        if (!isPasswordValid) {
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            error.name = 'Unauthorized';
            throw error;
        }
        const userPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
        };
        const token = (0, session_1.createSessionToken)(userPayload);
        const safeUser = this.toSafeUser(user);
        return { token, user: safeUser };
    }
    /**
     * Resolves safe user details for the authenticated user ID.
     */
    async getCurrentUser(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user || !user.isActive) {
            const error = new Error('User not found or inactive');
            error.statusCode = 401;
            error.name = 'Unauthorized';
            throw error;
        }
        return this.toSafeUser(user);
    }
    /**
     * Helper to strip sensitive database fields (e.g. passwordHash).
     */
    toSafeUser(user) {
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
