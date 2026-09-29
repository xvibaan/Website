import { DbClient, DbTransaction } from '../client';
import { WalletLedgerEntry, NewWalletLedgerEntry } from '../schema/wallet-ledger';
export interface LedgerPaginationOptions {
    limit?: number;
    offset?: number;
}
export declare class WalletLedgerRepository {
    private db;
    constructor(db?: DbClient);
    /**
     * Inserts an immutable ledger entry.
     * Can only be inserted, never updated or deleted.
     */
    create(data: NewWalletLedgerEntry, tx?: DbTransaction): Promise<WalletLedgerEntry>;
    /**
     * Finds a ledger entry by idempotency key to prevent double credits/debits.
     */
    findByIdempotencyKey(key: string, tx?: DbTransaction): Promise<WalletLedgerEntry | null>;
    /**
     * Returns paginated ledger entries ordered by created_at DESC with total count.
     */
    findByWalletId(walletId: string, options?: LedgerPaginationOptions, tx?: DbTransaction): Promise<{
        entries: WalletLedgerEntry[];
        total: number;
    }>;
    /**
     * Returns all ledger entries for a wallet to support balance reconciliation.
     */
    findAllByWalletId(walletId: string, tx?: DbTransaction): Promise<WalletLedgerEntry[]>;
}
export declare const walletLedgerRepository: WalletLedgerRepository;
