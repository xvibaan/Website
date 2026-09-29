import { DbClient, DbTransaction } from '../client';
import { Wallet, NewWallet } from '../schema/wallets';
export declare class WalletRepository {
    private db;
    constructor(db?: DbClient);
    findById(id: string, tx?: DbTransaction): Promise<Wallet | null>;
    findByUserId(userId: string, tx?: DbTransaction): Promise<Wallet | null>;
    /**
     * Reads the wallet row with a row-level lock (FOR UPDATE) inside a transaction.
     * Prevents race conditions during simultaneous debits/credits.
     */
    findByUserIdForUpdate(userId: string, tx: DbTransaction): Promise<Wallet | null>;
    /**
     * Reads the wallet row by ID with a row-level lock (FOR UPDATE) inside a transaction.
     */
    findByIdForUpdate(id: string, tx: DbTransaction): Promise<Wallet | null>;
    /**
     * Creates a new central wallet for a customer.
     */
    create(data: NewWallet, tx?: DbTransaction): Promise<Wallet>;
    /**
     * Updates cached balance within a transaction.
     */
    updateBalance(id: string, newBalance: string, tx: DbTransaction): Promise<Wallet>;
    /**
     * Updates wallet status (active, locked, disabled).
     */
    updateStatus(id: string, status: string, tx?: DbTransaction): Promise<Wallet>;
}
export declare const walletRepository: WalletRepository;
