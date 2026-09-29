export type WalletStatus = 'active' | 'locked' | 'disabled';
export type LedgerEntryType = 'credit' | 'debit' | 'refund' | 'adjustment' | 'reversal';
export type ReferenceType = 'deposit' | 'payment' | 'order' | 'refund' | 'adjustment' | 'reversal';
export interface SafeWallet {
    id: string;
    userId: string;
    balance: string;
    currency: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface SafeLedgerEntry {
    id: string;
    walletId: string;
    entryType: string;
    amount: string;
    currency: string;
    balanceBefore: string;
    balanceAfter: string;
    referenceType: string;
    referenceId: string | null;
    description: string;
    createdAt: Date;
}
export interface CreditWalletParams {
    userId: string;
    amount: string;
    currency?: string;
    referenceType: ReferenceType;
    referenceId?: string;
    idempotencyKey?: string;
    description: string;
    createdBy?: string;
    metadata?: string;
}
export interface DebitWalletParams {
    userId: string;
    amount: string;
    currency?: string;
    referenceType: ReferenceType;
    referenceId?: string;
    idempotencyKey?: string;
    description: string;
    createdBy?: string;
    metadata?: string;
}
export interface RefundWalletParams {
    userId: string;
    amount: string;
    currency?: string;
    referenceType: ReferenceType;
    referenceId?: string;
    idempotencyKey?: string;
    description: string;
    createdBy?: string;
    metadata?: string;
}
export interface AdjustWalletParams {
    userId: string;
    amount: string;
    currency?: string;
    direction: 'credit' | 'debit';
    reason: string;
    adminUserId: string;
    idempotencyKey?: string;
    metadata?: string;
}
export interface ReconciliationResult {
    walletId: string;
    cachedBalance: string;
    ledgerCalculatedBalance: string;
    isMatched: boolean;
    difference: string;
    totalCredits: string;
    totalDebits: string;
    entryCount: number;
}
