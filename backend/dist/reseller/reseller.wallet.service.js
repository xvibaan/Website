"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resellerWalletService = exports.ResellerWalletService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const reseller_wallets_1 = require("../db/schema/reseller-wallets");
const reseller_wallet_ledger_1 = require("../db/schema/reseller-wallet-ledger");
const money_1 = require("../wallet/money");
class ResellerWalletService {
    async getOrCreateWallet(resellerId, tx) {
        const db = tx || (0, client_1.getDb)();
        const [existing] = await db.select().from(reseller_wallets_1.resellerWallets).where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.resellerId, resellerId)).limit(1);
        if (existing)
            return existing;
        try {
            const [wallet] = await db.insert(reseller_wallets_1.resellerWallets).values({
                resellerId,
                balance: '0.00',
                currency: 'INR',
                status: 'active',
            }).returning();
            return wallet;
        }
        catch (err) {
            const [refetched] = await db.select().from(reseller_wallets_1.resellerWallets).where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.resellerId, resellerId)).limit(1);
            if (refetched)
                return refetched;
            throw err;
        }
    }
    async creditWallet(params, existingTx) {
        const amount = money_1.Money.format(params.amount);
        if (!money_1.Money.isPositive(amount)) {
            throw new Error('Credit amount must be greater than zero');
        }
        const executeOperation = async (tx) => {
            // Check idempotency inside transaction
            const [existingLedger] = await tx
                .select()
                .from(reseller_wallet_ledger_1.resellerWalletLedgerEntries)
                .where((0, drizzle_orm_1.eq)(reseller_wallet_ledger_1.resellerWalletLedgerEntries.idempotencyKey, params.idempotencyKey))
                .limit(1);
            if (existingLedger) {
                if (existingLedger.resellerId !== params.resellerId || existingLedger.amount !== amount || existingLedger.entryType !== 'credit') {
                    throw new Error('Idempotency key reused with conflicting transaction parameters');
                }
                const [wallet] = await tx.select().from(reseller_wallets_1.resellerWallets).where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.resellerId, params.resellerId)).limit(1);
                return { wallet, ledgerEntry: existingLedger };
            }
            // Lock row
            let [wallet] = await tx
                .select()
                .from(reseller_wallets_1.resellerWallets)
                .where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.resellerId, params.resellerId))
                .for('update')
                .limit(1);
            if (!wallet) {
                [wallet] = await tx.insert(reseller_wallets_1.resellerWallets).values({
                    resellerId: params.resellerId,
                    balance: '0.00',
                    currency: 'INR',
                }).returning();
            }
            if (wallet.status !== 'active') {
                throw new Error(`Wallet is ${wallet.status}`);
            }
            const balanceBefore = wallet.balance;
            const balanceAfter = money_1.Money.add(balanceBefore, amount);
            const [updatedWallet] = await tx
                .update(reseller_wallets_1.resellerWallets)
                .set({ balance: balanceAfter, updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP` })
                .where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.id, wallet.id))
                .returning();
            const [ledgerEntry] = await tx
                .insert(reseller_wallet_ledger_1.resellerWalletLedgerEntries)
                .values({
                resellerWalletId: wallet.id,
                resellerId: params.resellerId,
                entryType: 'credit',
                amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter,
                referenceType: params.referenceType,
                referenceId: params.referenceId || null,
                idempotencyKey: params.idempotencyKey,
                description: params.description,
            })
                .returning();
            return { wallet: updatedWallet, ledgerEntry };
        };
        if (existingTx)
            return executeOperation(existingTx);
        return (0, client_1.withTransaction)(executeOperation);
    }
    async debitWallet(params, existingTx) {
        const amount = money_1.Money.format(params.amount);
        if (!money_1.Money.isPositive(amount)) {
            throw new Error('Debit amount must be greater than zero');
        }
        const executeOperation = async (tx) => {
            const [existingLedger] = await tx
                .select()
                .from(reseller_wallet_ledger_1.resellerWalletLedgerEntries)
                .where((0, drizzle_orm_1.eq)(reseller_wallet_ledger_1.resellerWalletLedgerEntries.idempotencyKey, params.idempotencyKey))
                .limit(1);
            if (existingLedger) {
                if (existingLedger.resellerId !== params.resellerId || existingLedger.amount !== amount || existingLedger.entryType !== 'debit') {
                    throw new Error('Idempotency key reused with conflicting transaction parameters');
                }
                const [wallet] = await tx.select().from(reseller_wallets_1.resellerWallets).where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.resellerId, params.resellerId)).limit(1);
                return { wallet, ledgerEntry: existingLedger };
            }
            const [wallet] = await tx
                .select()
                .from(reseller_wallets_1.resellerWallets)
                .where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.resellerId, params.resellerId))
                .for('update')
                .limit(1);
            if (!wallet)
                throw new Error('Reseller wallet not found');
            if (wallet.status !== 'active')
                throw new Error(`Wallet is ${wallet.status}`);
            if (!money_1.Money.isGreaterThanOrEqual(wallet.balance, amount)) {
                throw new Error(`Insufficient wallet funds. Current balance: ${wallet.balance}, Requested debit: ${amount}`);
            }
            const balanceBefore = wallet.balance;
            const balanceAfter = money_1.Money.subtract(balanceBefore, amount);
            const [updatedWallet] = await tx
                .update(reseller_wallets_1.resellerWallets)
                .set({ balance: balanceAfter, updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP` })
                .where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.id, wallet.id))
                .returning();
            const [ledgerEntry] = await tx
                .insert(reseller_wallet_ledger_1.resellerWalletLedgerEntries)
                .values({
                resellerWalletId: wallet.id,
                resellerId: params.resellerId,
                entryType: 'debit',
                amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter,
                referenceType: params.referenceType,
                referenceId: params.referenceId || null,
                idempotencyKey: params.idempotencyKey,
                description: params.description,
            })
                .returning();
            return { wallet: updatedWallet, ledgerEntry };
        };
        if (existingTx)
            return executeOperation(existingTx);
        return (0, client_1.withTransaction)(executeOperation);
    }
    async refundWallet(params, existingTx) {
        const amount = money_1.Money.format(params.amount);
        if (!money_1.Money.isPositive(amount)) {
            throw new Error('Refund amount must be greater than zero');
        }
        const executeOperation = async (tx) => {
            const [existingLedger] = await tx
                .select()
                .from(reseller_wallet_ledger_1.resellerWalletLedgerEntries)
                .where((0, drizzle_orm_1.eq)(reseller_wallet_ledger_1.resellerWalletLedgerEntries.idempotencyKey, params.idempotencyKey))
                .limit(1);
            if (existingLedger) {
                if (existingLedger.resellerId !== params.resellerId || existingLedger.amount !== amount || existingLedger.entryType !== 'refund') {
                    throw new Error('Idempotency key reused with conflicting transaction parameters');
                }
                const [wallet] = await tx.select().from(reseller_wallets_1.resellerWallets).where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.resellerId, params.resellerId)).limit(1);
                return { wallet, ledgerEntry: existingLedger };
            }
            const [wallet] = await tx
                .select()
                .from(reseller_wallets_1.resellerWallets)
                .where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.resellerId, params.resellerId))
                .for('update')
                .limit(1);
            if (!wallet)
                throw new Error('Reseller wallet not found');
            if (wallet.status !== 'active')
                throw new Error(`Wallet is ${wallet.status}`);
            const balanceBefore = wallet.balance;
            const balanceAfter = money_1.Money.add(balanceBefore, amount);
            const [updatedWallet] = await tx
                .update(reseller_wallets_1.resellerWallets)
                .set({ balance: balanceAfter, updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP` })
                .where((0, drizzle_orm_1.eq)(reseller_wallets_1.resellerWallets.id, wallet.id))
                .returning();
            const [ledgerEntry] = await tx
                .insert(reseller_wallet_ledger_1.resellerWalletLedgerEntries)
                .values({
                resellerWalletId: wallet.id,
                resellerId: params.resellerId,
                entryType: 'refund',
                amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter,
                referenceType: params.referenceType,
                referenceId: params.referenceId || null,
                idempotencyKey: params.idempotencyKey,
                description: params.description,
            })
                .returning();
            return { wallet: updatedWallet, ledgerEntry };
        };
        if (existingTx)
            return executeOperation(existingTx);
        return (0, client_1.withTransaction)(executeOperation);
    }
    async getLedger(resellerId) {
        const db = (0, client_1.getDb)();
        return db
            .select()
            .from(reseller_wallet_ledger_1.resellerWalletLedgerEntries)
            .where((0, drizzle_orm_1.eq)(reseller_wallet_ledger_1.resellerWalletLedgerEntries.resellerId, resellerId))
            .orderBy((0, drizzle_orm_1.desc)(reseller_wallet_ledger_1.resellerWalletLedgerEntries.createdAt));
    }
}
exports.ResellerWalletService = ResellerWalletService;
exports.resellerWalletService = new ResellerWalletService();
