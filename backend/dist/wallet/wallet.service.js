"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = exports.WalletService = void 0;
const client_1 = require("../db/client");
const repositories_1 = require("../db/repositories");
const money_1 = require("./money");
const alert_service_1 = require("../admin/services/alert.service");
class WalletService {
    walletRepo;
    ledgerRepo;
    constructor(walletRepo, ledgerRepo) {
        this.walletRepo = walletRepo || repositories_1.walletRepository;
        this.ledgerRepo = ledgerRepo || repositories_1.walletLedgerRepository;
    }
    /**
     * Resolves or atomically initializes a customer's central marketplace wallet.
     * Guarantees 1 Customer = 1 Central Wallet.
     */
    async getOrCreateWallet(userId, tx) {
        const existing = await this.walletRepo.findByUserId(userId, tx);
        if (existing) {
            return existing;
        }
        try {
            return await this.walletRepo.create({
                userId,
                balance: '0.00',
                currency: 'INR',
                status: 'active',
            }, tx);
        }
        catch (err) {
            // In case of race condition on unique(user_id), re-fetch existing wallet
            const refetched = await this.walletRepo.findByUserId(userId, tx);
            if (refetched) {
                return refetched;
            }
            throw err;
        }
    }
    /**
     * Credits a customer wallet atomically and records an immutable ledger entry.
     * Can participate in an existing transaction if provided.
     */
    async creditWallet(params, existingTx) {
        const amount = money_1.Money.format(params.amount);
        if (!money_1.Money.isPositive(amount)) {
            const err = new Error('Credit amount must be greater than zero');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        // Check idempotency before acquiring row lock
        if (params.idempotencyKey) {
            const existing = await this.ledgerRepo.findByIdempotencyKey(params.idempotencyKey);
            if (existing) {
                if (existing.userId !== params.userId ||
                    existing.amount !== amount ||
                    existing.entryType !== 'credit') {
                    alert_service_1.alertService.raiseAlert({
                        type: 'WALLET_MISMATCH',
                        severity: 'HIGH',
                        message: `Conflicting duplicate credit attempt for idempotency key ${params.idempotencyKey}`,
                        details: { userId: params.userId, amount, entryType: 'credit', existingTxId: existing.id },
                    }).catch(console.error);
                    const err = new Error('Idempotency key reused with conflicting transaction parameters');
                    err.statusCode = 409;
                    err.name = 'Conflict';
                    throw err;
                }
                const wallet = await this.getOrCreateWallet(params.userId, existingTx);
                return {
                    wallet: this.toSafeWallet(wallet),
                    ledgerEntry: this.toSafeLedgerEntry(existing),
                };
            }
        }
        const executeOperation = async (tx) => {
            // Lock wallet row FOR UPDATE to serialize operations
            let wallet = await this.walletRepo.findByUserIdForUpdate(params.userId, tx);
            if (!wallet) {
                wallet = await this.walletRepo.create({
                    userId: params.userId,
                    balance: '0.00',
                    currency: params.currency || 'INR',
                    status: 'active',
                }, tx);
            }
            if (wallet.status !== 'active') {
                const err = new Error(`Wallet is ${wallet.status}; credits are not permitted`);
                err.statusCode = 403;
                err.name = 'Forbidden';
                throw err;
            }
            const balanceBefore = wallet.balance;
            const balanceAfter = money_1.Money.add(balanceBefore, amount);
            const updatedWallet = await this.walletRepo.updateBalance(wallet.id, balanceAfter, tx);
            const ledgerEntry = await this.ledgerRepo.create({
                walletId: wallet.id,
                userId: params.userId,
                entryType: 'credit',
                amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter,
                referenceType: params.referenceType,
                referenceId: params.referenceId || null,
                idempotencyKey: params.idempotencyKey || null,
                description: params.description,
                createdBy: params.createdBy || null,
                metadata: params.metadata || null,
            }, tx);
            return {
                wallet: this.toSafeWallet(updatedWallet),
                ledgerEntry: this.toSafeLedgerEntry(ledgerEntry),
            };
        };
        if (existingTx) {
            return executeOperation(existingTx);
        }
        return (0, client_1.withTransaction)(executeOperation);
    }
    /**
     * Debits a customer wallet atomically with negative-balance and concurrency protection.
     */
    async debitWallet(params, existingTx) {
        const amount = money_1.Money.format(params.amount);
        if (!money_1.Money.isPositive(amount)) {
            const err = new Error('Debit amount must be greater than zero');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        // Check idempotency before acquiring lock
        if (params.idempotencyKey) {
            const existing = await this.ledgerRepo.findByIdempotencyKey(params.idempotencyKey);
            if (existing) {
                if (existing.userId !== params.userId ||
                    existing.amount !== amount ||
                    existing.entryType !== 'debit') {
                    alert_service_1.alertService.raiseAlert({
                        type: 'WALLET_MISMATCH',
                        severity: 'HIGH',
                        message: `Conflicting duplicate debit attempt for idempotency key ${params.idempotencyKey}`,
                        details: { userId: params.userId, amount, entryType: 'debit', existingTxId: existing.id },
                    }).catch(console.error);
                    const err = new Error('Idempotency key reused with conflicting transaction parameters');
                    err.statusCode = 409;
                    err.name = 'Conflict';
                    throw err;
                }
                const wallet = await this.getOrCreateWallet(params.userId);
                return {
                    wallet: this.toSafeWallet(wallet),
                    ledgerEntry: this.toSafeLedgerEntry(existing),
                };
            }
        }
        const executeOperation = async (tx) => {
            // Row lock FOR UPDATE guarantees serial execution
            const wallet = await this.walletRepo.findByUserIdForUpdate(params.userId, tx);
            if (!wallet) {
                const err = new Error('Wallet not found');
                err.statusCode = 404;
                err.name = 'NotFound';
                throw err;
            }
            if (wallet.status !== 'active') {
                const err = new Error(`Wallet is ${wallet.status}; debits are not permitted`);
                err.statusCode = 403;
                err.name = 'Forbidden';
                throw err;
            }
            // Check sufficient funds strictly
            if (!money_1.Money.isGreaterThanOrEqual(wallet.balance, amount)) {
                alert_service_1.alertService.raiseAlert({
                    type: 'WALLET_MISMATCH',
                    severity: 'HIGH',
                    message: `Negative balance attempt: Wallet ${wallet.id} has ${wallet.balance}, requested debit ${amount}`,
                    details: { userId: params.userId, walletId: wallet.id, balance: wallet.balance, amount, referenceId: params.referenceId },
                }).catch(console.error);
                const err = new Error(`Insufficient wallet funds. Current balance: ${wallet.balance}, Requested debit: ${amount}`);
                err.statusCode = 422;
                err.name = 'UnprocessableEntity';
                throw err;
            }
            const balanceBefore = wallet.balance;
            const balanceAfter = money_1.Money.subtract(balanceBefore, amount);
            const updatedWallet = await this.walletRepo.updateBalance(wallet.id, balanceAfter, tx);
            const ledgerEntry = await this.ledgerRepo.create({
                walletId: wallet.id,
                userId: params.userId,
                entryType: 'debit',
                amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter,
                referenceType: params.referenceType,
                referenceId: params.referenceId || null,
                idempotencyKey: params.idempotencyKey || null,
                description: params.description,
                createdBy: params.createdBy || null,
                metadata: params.metadata || null,
            }, tx);
            return {
                wallet: this.toSafeWallet(updatedWallet),
                ledgerEntry: this.toSafeLedgerEntry(ledgerEntry),
            };
        };
        if (existingTx) {
            return executeOperation(existingTx);
        }
        return (0, client_1.withTransaction)(executeOperation);
    }
    /**
     * Issues a wallet refund, restoring funds and writing an immutable refund ledger entry.
     */
    async refundWallet(params) {
        const amount = money_1.Money.format(params.amount);
        if (!money_1.Money.isPositive(amount)) {
            const err = new Error('Refund amount must be greater than zero');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        if (params.idempotencyKey) {
            const existing = await this.ledgerRepo.findByIdempotencyKey(params.idempotencyKey);
            if (existing) {
                if (existing.userId !== params.userId ||
                    existing.amount !== amount ||
                    existing.entryType !== 'refund') {
                    alert_service_1.alertService.raiseAlert({
                        type: 'WALLET_MISMATCH',
                        severity: 'HIGH',
                        message: `Conflicting duplicate refund attempt for idempotency key ${params.idempotencyKey}`,
                        details: { userId: params.userId, amount, entryType: 'refund', existingTxId: existing.id },
                    }).catch(console.error);
                    const err = new Error('Idempotency key reused with conflicting transaction parameters');
                    err.statusCode = 409;
                    err.name = 'Conflict';
                    throw err;
                }
                const wallet = await this.getOrCreateWallet(params.userId);
                return {
                    wallet: this.toSafeWallet(wallet),
                    ledgerEntry: this.toSafeLedgerEntry(existing),
                };
            }
        }
        return (0, client_1.withTransaction)(async (tx) => {
            const wallet = await this.walletRepo.findByUserIdForUpdate(params.userId, tx);
            if (!wallet) {
                const err = new Error('Wallet not found for refund');
                err.statusCode = 404;
                err.name = 'NotFound';
                throw err;
            }
            const balanceBefore = wallet.balance;
            const balanceAfter = money_1.Money.add(balanceBefore, amount);
            const updatedWallet = await this.walletRepo.updateBalance(wallet.id, balanceAfter, tx);
            const ledgerEntry = await this.ledgerRepo.create({
                walletId: wallet.id,
                userId: params.userId,
                entryType: 'refund',
                amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter,
                referenceType: params.referenceType,
                referenceId: params.referenceId || null,
                idempotencyKey: params.idempotencyKey || null,
                description: params.description,
                createdBy: params.createdBy || null,
                metadata: params.metadata || null,
            }, tx);
            return {
                wallet: this.toSafeWallet(updatedWallet),
                ledgerEntry: this.toSafeLedgerEntry(ledgerEntry),
            };
        });
    }
    /**
     * Executes a manual administrative adjustment (credit or debit) with mandatory reason.
     */
    async adjustWallet(params) {
        const amount = money_1.Money.format(params.amount);
        if (!money_1.Money.isPositive(amount)) {
            const err = new Error('Adjustment amount must be greater than zero');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        if (params.idempotencyKey) {
            const existing = await this.ledgerRepo.findByIdempotencyKey(params.idempotencyKey);
            if (existing) {
                if (existing.userId !== params.userId ||
                    existing.amount !== amount ||
                    existing.entryType !== 'adjustment') {
                    const err = new Error('Idempotency key reused with conflicting parameters');
                    err.statusCode = 409;
                    err.name = 'Conflict';
                    throw err;
                }
                const wallet = await this.getOrCreateWallet(params.userId);
                return {
                    wallet: this.toSafeWallet(wallet),
                    ledgerEntry: this.toSafeLedgerEntry(existing),
                };
            }
        }
        return (0, client_1.withTransaction)(async (tx) => {
            let wallet = await this.walletRepo.findByUserIdForUpdate(params.userId, tx);
            if (!wallet) {
                wallet = await this.walletRepo.create({
                    userId: params.userId,
                    balance: '0.00',
                    currency: params.currency || 'INR',
                    status: 'active',
                }, tx);
            }
            const balanceBefore = wallet.balance;
            let balanceAfter;
            if (params.direction === 'credit') {
                balanceAfter = money_1.Money.add(balanceBefore, amount);
            }
            else {
                if (!money_1.Money.isGreaterThanOrEqual(balanceBefore, amount)) {
                    const err = new Error(`Cannot adjust debit: insufficient funds (Balance: ${balanceBefore}, Requested debit: ${amount})`);
                    err.statusCode = 422;
                    err.name = 'UnprocessableEntity';
                    throw err;
                }
                balanceAfter = money_1.Money.subtract(balanceBefore, amount);
            }
            const updatedWallet = await this.walletRepo.updateBalance(wallet.id, balanceAfter, tx);
            const ledgerEntry = await this.ledgerRepo.create({
                walletId: wallet.id,
                userId: params.userId,
                entryType: 'adjustment',
                amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter,
                referenceType: 'adjustment',
                referenceId: null,
                idempotencyKey: params.idempotencyKey || null,
                description: `Admin adjustment (${params.direction}): ${params.reason}`,
                createdBy: params.adminUserId,
                metadata: params.metadata || null,
            }, tx);
            return {
                wallet: this.toSafeWallet(updatedWallet),
                ledgerEntry: this.toSafeLedgerEntry(ledgerEntry),
            };
        });
    }
    /**
     * Reconciles cached wallet balance against the sum of all immutable ledger entries.
     * If a discrepancy is found, it is reported without modifying ledger history.
     */
    async reconcileWallet(userId) {
        const wallet = await this.walletRepo.findByUserId(userId);
        if (!wallet) {
            const err = new Error('Wallet not found for reconciliation');
            err.statusCode = 404;
            err.name = 'NotFound';
            throw err;
        }
        const entries = await this.ledgerRepo.findAllByWalletId(wallet.id);
        let creditsSubunits = 0n;
        let debitsSubunits = 0n;
        for (const entry of entries) {
            const amountSubunits = money_1.Money.toSubunits(entry.amount);
            if (entry.entryType === 'credit' || entry.entryType === 'refund') {
                creditsSubunits += amountSubunits;
            }
            else if (entry.entryType === 'debit') {
                debitsSubunits += amountSubunits;
            }
            else if (entry.entryType === 'adjustment') {
                // Look at balance change
                const before = money_1.Money.toSubunits(entry.balanceBefore);
                const after = money_1.Money.toSubunits(entry.balanceAfter);
                if (after >= before) {
                    creditsSubunits += (after - before);
                }
                else {
                    debitsSubunits += (before - after);
                }
            }
            else if (entry.entryType === 'reversal') {
                const before = money_1.Money.toSubunits(entry.balanceBefore);
                const after = money_1.Money.toSubunits(entry.balanceAfter);
                if (after >= before) {
                    creditsSubunits += (after - before);
                }
                else {
                    debitsSubunits += (before - after);
                }
            }
        }
        const calculatedSubunits = creditsSubunits >= debitsSubunits
            ? creditsSubunits - debitsSubunits
            : 0n;
        const calculatedBalance = money_1.Money.fromSubunits(calculatedSubunits);
        const cachedBalance = money_1.Money.format(wallet.balance);
        const isMatched = calculatedBalance === cachedBalance;
        const diffSubunits = calculatedSubunits >= money_1.Money.toSubunits(cachedBalance)
            ? calculatedSubunits - money_1.Money.toSubunits(cachedBalance)
            : money_1.Money.toSubunits(cachedBalance) - calculatedSubunits;
        if (!isMatched) {
            alert_service_1.alertService.raiseAlert({
                type: 'WALLET_MISMATCH',
                severity: 'CRITICAL',
                message: `Wallet reconciliation mismatch for user ${userId}: Ledger is ${calculatedBalance}, Wallet is ${cachedBalance}`,
                details: { userId, walletId: wallet.id, cachedBalance, calculatedBalance, difference: money_1.Money.fromSubunits(diffSubunits) },
            }).catch(console.error);
        }
        return {
            walletId: wallet.id,
            cachedBalance,
            ledgerCalculatedBalance: calculatedBalance,
            isMatched,
            difference: money_1.Money.fromSubunits(diffSubunits),
            totalCredits: money_1.Money.fromSubunits(creditsSubunits),
            totalDebits: money_1.Money.fromSubunits(debitsSubunits),
            entryCount: entries.length,
        };
    }
    /**
     * Retrieves paginated ledger history for a customer's wallet.
     */
    async getLedger(userId, page = 1, limit = 20) {
        const wallet = await this.getOrCreateWallet(userId);
        const offset = (page - 1) * limit;
        const { entries, total } = await this.ledgerRepo.findByWalletId(wallet.id, {
            limit,
            offset,
        });
        const totalPages = Math.ceil(total / limit) || 1;
        return {
            entries: entries.map((e) => this.toSafeLedgerEntry(e)),
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
    toSafeWallet(w) {
        return {
            id: w.id,
            userId: w.userId,
            balance: w.balance,
            currency: w.currency,
            status: w.status,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
        };
    }
    toSafeLedgerEntry(e) {
        return {
            id: e.id,
            walletId: e.walletId,
            entryType: e.entryType,
            amount: e.amount,
            currency: e.currency,
            balanceBefore: e.balanceBefore,
            balanceAfter: e.balanceAfter,
            referenceType: e.referenceType,
            referenceId: e.referenceId,
            description: e.description,
            createdAt: e.createdAt,
        };
    }
}
exports.WalletService = WalletService;
exports.walletService = new WalletService();
