import { eq } from 'drizzle-orm';
import { getDb, DbClient, DbTransaction } from '../client';
import { users, User, NewUser } from '../schema/users';

/**
 * UserRepository provides centralized data-access operations for the users table.
 * Contains purely data access logic — no password hashing/verification, auth tokens,
 * or business rules.
 */
export class UserRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || getDb();
  }

  /**
   * Find a user by their UUID primary key.
   * Can optionally execute within an existing transaction.
   */
  async findById(id: string, tx?: DbTransaction): Promise<User | null> {
    const executor = tx || this.db;
    const result = await executor
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find a user by their unique email address.
   * Can optionally execute within an existing transaction.
   */
  async findByEmail(email: string, tx?: DbTransaction): Promise<User | null> {
    const executor = tx || this.db;
    const result = await executor
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new user record.
   * Can optionally execute within an existing transaction.
   */
  async create(data: NewUser, tx?: DbTransaction): Promise<User> {
    const executor = tx || this.db;
    const normalizedData: NewUser = {
      ...data,
      email: data.email.toLowerCase().trim(),
    };

    const result = await executor
      .insert(users)
      .values(normalizedData)
      .returning();

    return result[0];
  }
}

/**
 * Export default singleton instance for convenience.
 */
export const userRepository = new UserRepository();
