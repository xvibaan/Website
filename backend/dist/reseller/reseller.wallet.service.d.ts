import { DbTransaction } from '../db/client';
import { ResellerWallet } from '../db/schema/reseller-wallets';
import { ResellerWalletLedgerEntry } from '../db/schema/reseller-wallet-ledger';
export declare class ResellerWalletService {
    getOrCreateWallet(resellerId: string, tx?: DbTransaction): Promise<ResellerWallet>;
    creditWallet(params: {
        resellerId: string;
        amount: string;
        referenceType: string;
        referenceId?: string;
        idempotencyKey: string;
        description: string;
    }, existingTx?: DbTransaction): Promise<{
        wallet: ResellerWallet;
        ledgerEntry: ResellerWalletLedgerEntry;
    }>;
    debitWallet(params: {
        resellerId: string;
        amount: string;
        referenceType: string;
        referenceId?: string;
        idempotencyKey: string;
        description: string;
    }, existingTx?: DbTransaction): Promise<{
        wallet: ResellerWallet;
        ledgerEntry: ResellerWalletLedgerEntry;
    }>;
    refundWallet(params: {
        resellerId: string;
        amount: string;
        referenceType: string;
        referenceId?: string;
        idempotencyKey: string;
        description: string;
    }, existingTx?: DbTransaction): Promise<{
        wallet: ResellerWallet;
        ledgerEntry: ResellerWalletLedgerEntry;
    }>;
    getLedger(resellerId: string): Promise<{
        id: string;
        resellerWalletId: string;
        resellerId: string;
        entryType: string;
        amount: string;
        currency: string;
        balanceBefore: string;
        balanceAfter: string;
        referenceType: string;
        referenceId: string | null;
        idempotencyKey: string;
        description: string;
        metadata: string | null;
        createdAt: Date;
    }[]>;
}
export declare const resellerWalletService: ResellerWalletService;
