import crypto from 'crypto';
import { UserRepository, userRepository } from '../db/repositories/user.repository';
import { PasswordService } from './password.service';
import { RegisterInput, LoginInput } from './auth.validation';
import { AuthenticatedUserPayload, SafeUser, UserRole } from './auth.types';
import { createSessionToken } from './session';
import { GoogleIdentity } from './google-oauth.service';

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
  async loginWithGoogle(identity: GoogleIdentity): Promise<AuthResult> {
    if (!identity.googleId || !identity.email || !identity.emailVerified) {
      const error: any = new Error('Invalid Google identity');
      error.statusCode = 401;
      error.name = 'Unauthorized';
      throw error;
    }

    const normalizedEmail = identity.email.toLowerCase().trim();

    let user = await this.userRepo.findByGoogleId(identity.googleId);

    if (user) {
      if (!user.isActive) {
        const error: any = new Error('Account is inactive or suspended');
        error.statusCode = 403;
        error.name = 'Forbidden';
        throw error;
      }

      // Keep the verified Google email synchronized with the account.
      if (user.email !== normalizedEmail) {
        user = (await this.userRepo.update(user.id, {
          email: normalizedEmail,
          updatedAt: new Date(),
        })) || user;
      }
    } else {
      user = await this.userRepo.findByEmail(normalizedEmail);

      if (user) {
        if (!user.isActive) {
          const error: any = new Error('Account is inactive or suspended');
          error.statusCode = 403;
          error.name = 'Forbidden';
          throw error;
        }

        if (user.googleId && user.googleId !== identity.googleId) {
          const error: any = new Error('This account is already linked to another Google account');
          error.statusCode = 409;
          error.name = 'Conflict';
          throw error;
        }

        user = (await this.userRepo.update(user.id, {
          googleId: identity.googleId,
          updatedAt: new Date(),
        })) || user;
      } else {
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await PasswordService.hash(randomPassword);

        user = await this.userRepo.create({
          email: normalizedEmail,
          googleId: identity.googleId,
          passwordHash,
          role: 'customer',
          isActive: true,
        });
      }
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

  /**
   * Securely closes a user account.
   * - Anonymizes personal data (email).
   * - Deactivates the account (prevents login).
   * - Disables the associated wallet to prevent transactions.
   * - Preserves historical financial records tied to the user ID.
   */
  async deleteAccount(userId: string): Promise<void> {
    const { getDb } = await import('../db/client');
    const { walletRepository } = await import('../db/repositories/wallet.repository');
    const db = getDb();

    await db.transaction(async (tx) => {
      const user = await this.userRepo.findById(userId, tx);
      if (!user) {
        const error: any = new Error('User not found');
        error.statusCode = 404;
        error.name = 'NotFound';
        throw error;
      }

      if (!user.isActive && user.email.startsWith('deleted_')) {
        // Already deleted
        return;
      }

      const anonymizedEmail = `deleted_${user.id}@deleted.local`;
      const anonymizedPassword = '*DELETED*';

      await this.userRepo.update(userId, {
        email: anonymizedEmail,
        passwordHash: anonymizedPassword,
        isActive: false,
        updatedAt: new Date(),
      }, tx);

      const wallet = await walletRepository.findByUserId(userId, tx);
      if (wallet && wallet.status !== 'disabled') {
        await walletRepository.updateStatus(wallet.id, 'disabled', tx);
      }
    });
  }
}

export const authService = new AuthService();
