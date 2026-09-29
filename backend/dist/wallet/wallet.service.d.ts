import { DbTransaction } from '../db/client';
import { WalletRepository, WalletLedgerRepository } from '../db/repositories';
import { Wallet } from '../db/schema/wallets';
import { WalletLedgerEntry } from '../db/schema/wallet-ledger';
import { SafeWallet, SafeLedgerEntry, CreditWalletParams, DebitWalletParams, RefundWalletParams, AdjustWalletParams, ReconciliationResult } from './wallet.types';
export declare class WalletService {
    private walletRepo;
    private ledgerRepo;
    constructor(walletRepo?: WalletRepository, ledgerRepo?: WalletLedgerRepository);
    /**
     * Resolves or atomically initializes a customer's central marketplace wallet.
     * Guarantees 1 Customer = 1 Central Wallet.
     */
    getOrCreateWallet(userId: string, tx?: DbTransaction): Promise<Wallet>;
    /**
     * Credits a customer wallet atomically and records an immutable ledger entry.
     * Can participate in an existing transaction if provided.
     */
    creditWallet(params: CreditWalletParams, existingTx?: DbTransaction): Promise<{
        wallet: SafeWallet;
        ledgerEntry: SafeLedgerEntry;
    }>;
    /**
     * Debits a customer wallet atomically with negative-balance and concurrency protection.
     */
    debitWallet(params: DebitWalletParams, existingTx?: DbTransaction): Promise<{
        wallet: SafeWallet;
        ledgerEntry: SafeLedgerEntry;
    }>;
    /**
     * Issues a wallet refund, restoring funds and writing an immutable refund ledger entry.
     */
    refundWallet(params: RefundWalletParams): Promise<{
        wallet: SafeWallet;
        ledgerEntry: SafeLedgerEntry;
    }>;
    /**
     * Executes a manual administrative adjustment (credit or debit) with mandatory reason.
     */
    adjustWallet(params: AdjustWalletParams): Promise<{
        wallet: SafeWallet;
        ledgerEntry: SafeLedgerEntry;
    }>;
    /**
     * Reconciles cached wallet balance against the sum of all immutable ledger entries.
     * If a discrepancy is found, it is reported without modifying ledger history.
     */
    reconcileWallet(userId: string): Promise<ReconciliationResult>;
    /**
     * Retrieves paginated ledger history for a customer's wallet.
     */
    getLedger(userId: string, page?: number, limit?: number): Promise<{
        entries: SafeLedgerEntry[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    toSafeWallet(w: Wallet): SafeWallet;
    toSafeLedgerEntry(e: WalletLedgerEntry): SafeLedgerEntry;
}
export declare const walletService: WalletService;
