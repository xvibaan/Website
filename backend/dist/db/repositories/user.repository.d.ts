import { DbClient, DbTransaction } from '../client';
import { User, NewUser } from '../schema/users';
/**
 * UserRepository provides centralized data-access operations for the users table.
 * Contains purely data access logic — no password hashing/verification, auth tokens,
 * or business rules.
 */
export declare class UserRepository {
    private db;
    constructor(db?: DbClient);
    /**
     * Find a user by their UUID primary key.
     * Can optionally execute within an existing transaction.
     */
    findById(id: string, tx?: DbTransaction): Promise<User | null>;
    /**
     * Find a user by their unique email address.
     * Can optionally execute within an existing transaction.
     */
    findByEmail(email: string, tx?: DbTransaction): Promise<User | null>;
    /**
     * Create a new user record.
     * Can optionally execute within an existing transaction.
     */
    create(data: NewUser, tx?: DbTransaction): Promise<User>;
}
/**
 * Export default singleton instance for convenience.
 */
export declare const userRepository: UserRepository;
