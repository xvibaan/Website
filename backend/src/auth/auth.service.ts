import { UserRepository, userRepository } from '../db/repositories/user.repository';
import { PasswordService } from './password.service';
import { RegisterInput, LoginInput } from './auth.validation';
import { AuthenticatedUserPayload, SafeUser, UserRole } from './auth.types';
import { createSessionToken } from './session';

export interface AuthResult {
  token: string;
  user: SafeUser;
}

export class AuthService {
  private userRepo: UserRepository;

  constructor(userRepo?: UserRepository) {
    this.userRepo = userRepo || userRepository;
  }

  /**
   * Registers a new customer user.
   * Enforces server-controlled role ('customer'), email normalization, and password hashing.
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check duplicate email
    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing) {
      const error: any = new Error('An account with this email already exists');
      error.statusCode = 409;
      error.name = 'Conflict';
      throw error;
    }

    // Hash password securely with bcrypt
    const passwordHash = await PasswordService.hash(input.password);

    // Create user with server-controlled role
    const created = await this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      role: 'customer',
      isActive: true,
    });

    const userPayload: AuthenticatedUserPayload = {
      userId: created.id,
      email: created.email,
      role: created.role as UserRole,
      isActive: created.isActive,
    };

    const token = createSessionToken(userPayload);
    const safeUser = this.toSafeUser(created);

    return { token, user: safeUser };
  }

  /**
   * Authenticates user credentials.
   * Verifies password hash, active status, and returns a signed session token.
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user) {
      // Generic invalid credentials message to prevent user enumeration
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      error.name = 'Unauthorized';
      throw error;
    }

    if (!user.isActive) {
      const error: any = new Error('Account is inactive or suspended');
      error.statusCode = 403;
      error.name = 'Forbidden';
      throw error;
    }

    const isPasswordValid = await PasswordService.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      error.name = 'Unauthorized';
      throw error;
    }

    const userPayload: AuthenticatedUserPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      isActive: user.isActive,
    };

    const token = createSessionToken(userPayload);
    const safeUser = this.toSafeUser(user);

    return { token, user: safeUser };
  }

  /**
   * Resolves safe user details for the authenticated user ID.
   */
  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      const error: any = new Error('User not found or inactive');
      error.statusCode = 401;
      error.name = 'Unauthorized';
      throw error;
    }

    return this.toSafeUser(user);
  }

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
  }): SafeUser {
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

export const authService = new AuthService();
