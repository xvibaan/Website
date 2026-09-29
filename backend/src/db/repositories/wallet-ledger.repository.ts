import { eq, desc, sql } from 'drizzle-orm';
import { getDb, DbClient, DbTransaction } from '../client';
import {
  walletLedgerEntries,
  WalletLedgerEntry,
  NewWalletLedgerEntry,
} from '../schema/wallet-ledger';

export interface LedgerPaginationOptions {
  limit?: number;
  offset?: number;
}

export class WalletLedgerRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || getDb();
  }

  /**
   * Inserts an immutable ledger entry.
   * Can only be inserted, never updated or deleted.
   */
  async create(data: NewWalletLedgerEntry, tx?: DbTransaction): Promise<WalletLedgerEntry> {
    const executor = tx || this.db;
    const result = await executor
      .insert(walletLedgerEntries)
      .values(data)
      .returning();

    return result[0];
  }

  /**
   * Finds a ledger entry by idempotency key to prevent double credits/debits.
   */
  async findByIdempotencyKey(
    key: string,
    tx?: DbTransaction
  ): Promise<WalletLedgerEntry | null> {
    const executor = tx || this.db;
    const result = await executor
      .select()
      .from(walletLedgerEntries)
      .where(eq(walletLedgerEntries.idempotencyKey, key))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Returns paginated ledger entries ordered by created_at DESC with total count.
   */
  async findByWalletId(
    walletId: string,
    options: LedgerPaginationOptions = {},
    tx?: DbTransaction
  ): Promise<{ entries: WalletLedgerEntry[]; total: number }> {
    const executor = tx || this.db;
    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const offset = Math.max(options.offset || 0, 0);

    const [entries, countResult] = await Promise.all([
      executor
        .select()
        .from(walletLedgerEntries)
        .where(eq(walletLedgerEntries.walletId, walletId))
        .orderBy(desc(walletLedgerEntries.createdAt))
        .limit(limit)
        .offset(offset),
      executor
        .select({ count: sql<number>`count(*)::int` })
        .from(walletLedgerEntries)
        .where(eq(walletLedgerEntries.walletId, walletId)),
    ]);

    const total = countResult[0]?.count || 0;
    return { entries, total };
  }

  /**
   * Returns all ledger entries for a wallet to support balance reconciliation.
   */
  async findAllByWalletId(
    walletId: string,
    tx?: DbTransaction
  ): Promise<WalletLedgerEntry[]> {
    const executor = tx || this.db;
    return executor
      .select()
      .from(walletLedgerEntries)
      .where(eq(walletLedgerEntries.walletId, walletId))
      .orderBy(walletLedgerEntries.createdAt);
  }
}

export const walletLedgerRepository = new WalletLedgerRepository();
