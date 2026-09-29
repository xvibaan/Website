import { eq, sql } from 'drizzle-orm';
import { getDb, DbClient, DbTransaction } from '../client';
import { wallets, Wallet, NewWallet } from '../schema/wallets';

export class WalletRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || getDb();
  }

  async findById(id: string, tx?: DbTransaction): Promise<Wallet | null> {
    const executor = tx || this.db;
    const result = await executor
      .select()
      .from(wallets)
      .where(eq(wallets.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findByUserId(userId: string, tx?: DbTransaction): Promise<Wallet | null> {
    const executor = tx || this.db;
    const result = await executor
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Reads the wallet row with a row-level lock (FOR UPDATE) inside a transaction.
   * Prevents race conditions during simultaneous debits/credits.
   */
  async findByUserIdForUpdate(userId: string, tx: DbTransaction): Promise<Wallet | null> {
    const result = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .for('update')
      .limit(1);

    return result[0] || null;
  }

  /**
   * Reads the wallet row by ID with a row-level lock (FOR UPDATE) inside a transaction.
   */
  async findByIdForUpdate(id: string, tx: DbTransaction): Promise<Wallet | null> {
    const result = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.id, id))
      .for('update')
      .limit(1);

    return result[0] || null;
  }

  /**
   * Creates a new central wallet for a customer.
   */
  async create(data: NewWallet, tx?: DbTransaction): Promise<Wallet> {
    const executor = tx || this.db;
    const result = await executor
      .insert(wallets)
      .values(data)
      .returning();

    return result[0];
  }

  /**
   * Updates cached balance within a transaction.
   */
  async updateBalance(id: string, newBalance: string, tx: DbTransaction): Promise<Wallet> {
    const result = await tx
      .update(wallets)
      .set({
        balance: newBalance,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(wallets.id, id))
      .returning();

    return result[0];
  }

  /**
   * Updates wallet status (active, locked, disabled).
   */
  async updateStatus(id: string, status: string, tx?: DbTransaction): Promise<Wallet> {
    const executor = tx || this.db;
    const result = await executor
      .update(wallets)
      .set({
        status,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(wallets.id, id))
      .returning();

    return result[0];
  }
}

export const walletRepository = new WalletRepository();
