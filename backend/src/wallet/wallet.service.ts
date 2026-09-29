import { withTransaction, DbTransaction } from '../db/client';
import {
  WalletRepository,
  walletRepository,
  WalletLedgerRepository,
  walletLedgerRepository,
} from '../db/repositories';
import { Wallet } from '../db/schema/wallets';
import { WalletLedgerEntry } from '../db/schema/wallet-ledger';
import { Money } from './money';
import {
  SafeWallet,
  SafeLedgerEntry,
  CreditWalletParams,
  DebitWalletParams,
  RefundWalletParams,
  AdjustWalletParams,
  ReconciliationResult,
} from './wallet.types';
import { alertService } from '../admin/services/alert.service';

export class WalletService {
  private walletRepo: WalletRepository;
  private ledgerRepo: WalletLedgerRepository;

  constructor(
    walletRepo?: WalletRepository,
    ledgerRepo?: WalletLedgerRepository
  ) {
    this.walletRepo = walletRepo || walletRepository;
    this.ledgerRepo = ledgerRepo || walletLedgerRepository;
  }

  /**
   * Resolves or atomically initializes a customer's central marketplace wallet.
   * Guarantees 1 Customer = 1 Central Wallet.
   */
  async getOrCreateWallet(userId: string, tx?: DbTransaction): Promise<Wallet> {
    const existing = await this.walletRepo.findByUserId(userId, tx);
    if (existing) {
      return existing;
    }

    try {
      return await this.walletRepo.create(
        {
          userId,
          balance: '0.00',
          currency: 'INR',
          status: 'active',
        },
        tx
      );
    } catch (err: any) {
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
  async creditWallet(
    params: CreditWalletParams,
    existingTx?: DbTransaction
  ): Promise<{ wallet: SafeWallet; ledgerEntry: SafeLedgerEntry }> {
    const amount = Money.format(params.amount);
    if (!Money.isPositive(amount)) {
      const err: any = new Error('Credit amount must be greater than zero');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // Check idempotency before acquiring row lock
    if (params.idempotencyKey) {
      const existing = await this.ledgerRepo.findByIdempotencyKey(params.idempotencyKey);
      if (existing) {
        if (
          existing.userId !== params.userId ||
          existing.amount !== amount ||
          existing.entryType !== 'credit'
        ) {
          alertService.raiseAlert({
            type: 'WALLET_MISMATCH',
            severity: 'HIGH',
            message: `Conflicting duplicate credit attempt for idempotency key ${params.idempotencyKey}`,
            details: { userId: params.userId, amount, entryType: 'credit', existingTxId: existing.id },
          }).catch(console.error);

          const err: any = new Error('Idempotency key reused with conflicting transaction parameters');
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

    const executeOperation = async (tx: DbTransaction) => {
      // Lock wallet row FOR UPDATE to serialize operations
      let wallet = await this.walletRepo.findByUserIdForUpdate(params.userId, tx);
      if (!wallet) {
        wallet = await this.walletRepo.create(
          {
            userId: params.userId,
            balance: '0.00',
            currency: params.currency || 'INR',
            status: 'active',
          },
          tx
        );
      }

      if (wallet.status !== 'active') {
        const err: any = new Error(`Wallet is ${wallet.status}; credits are not permitted`);
        err.statusCode = 403;
        err.name = 'Forbidden';
        throw err;
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = Money.add(balanceBefore, amount);

      const updatedWallet = await this.walletRepo.updateBalance(wallet.id, balanceAfter, tx);

      const ledgerEntry = await this.ledgerRepo.create(
        {
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
        },
        tx
      );

      return {
        wallet: this.toSafeWallet(updatedWallet),
        ledgerEntry: this.toSafeLedgerEntry(ledgerEntry),
      };
    };

    if (existingTx) {
      return executeOperation(existingTx);
    }

    return withTransaction(executeOperation);
  }

  /**
   * Debits a customer wallet atomically with negative-balance and concurrency protection.
   */
  async debitWallet(
    params: DebitWalletParams,
    existingTx?: DbTransaction
  ): Promise<{ wallet: SafeWallet; ledgerEntry: SafeLedgerEntry }> {
    const amount = Money.format(params.amount);
    if (!Money.isPositive(amount)) {
      const err: any = new Error('Debit amount must be greater than zero');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // Check idempotency before acquiring lock
    if (params.idempotencyKey) {
      const existing = await this.ledgerRepo.findByIdempotencyKey(params.idempotencyKey);
      if (existing) {
        if (
          existing.userId !== params.userId ||
          existing.amount !== amount ||
          existing.entryType !== 'debit'
        ) {
          alertService.raiseAlert({
            type: 'WALLET_MISMATCH',
            severity: 'HIGH',
            message: `Conflicting duplicate debit attempt for idempotency key ${params.idempotencyKey}`,
            details: { userId: params.userId, amount, entryType: 'debit', existingTxId: existing.id },
          }).catch(console.error);

          const err: any = new Error('Idempotency key reused with conflicting transaction parameters');
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

    const executeOperation = async (tx: DbTransaction) => {
      // Row lock FOR UPDATE guarantees serial execution
      const wallet = await this.walletRepo.findByUserIdForUpdate(params.userId, tx);
      if (!wallet) {
        const err: any = new Error('Wallet not found');
        err.statusCode = 404;
        err.name = 'NotFound';
        throw err;
      }

      if (wallet.status !== 'active') {
        const err: any = new Error(`Wallet is ${wallet.status}; debits are not permitted`);
        err.statusCode = 403;
        err.name = 'Forbidden';
        throw err;
      }

      // Check sufficient funds strictly
      if (!Money.isGreaterThanOrEqual(wallet.balance, amount)) {
        alertService.raiseAlert({
          type: 'WALLET_MISMATCH',
          severity: 'HIGH',
          message: `Negative balance attempt: Wallet ${wallet.id} has ${wallet.balance}, requested debit ${amount}`,
          details: { userId: params.userId, walletId: wallet.id, balance: wallet.balance, amount, referenceId: params.referenceId },
        }).catch(console.error);

        const err: any = new Error(
          `Insufficient wallet funds. Current balance: ${wallet.balance}, Requested debit: ${amount}`
        );
        err.statusCode = 422;
        err.name = 'UnprocessableEntity';
        throw err;
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = Money.subtract(balanceBefore, amount);

      const updatedWallet = await this.walletRepo.updateBalance(wallet.id, balanceAfter, tx);

      const ledgerEntry = await this.ledgerRepo.create(
        {
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
        },
        tx
      );

      return {
        wallet: this.toSafeWallet(updatedWallet),
        ledgerEntry: this.toSafeLedgerEntry(ledgerEntry),
      };
    };

    if (existingTx) {
      return executeOperation(existingTx);
    }

    return withTransaction(executeOperation);
  }

  /**
   * Issues a wallet refund, restoring funds and writing an immutable refund ledger entry.
   */
  async refundWallet(
    params: RefundWalletParams
  ): Promise<{ wallet: SafeWallet; ledgerEntry: SafeLedgerEntry }> {
    const amount = Money.format(params.amount);
    if (!Money.isPositive(amount)) {
      const err: any = new Error('Refund amount must be greater than zero');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    if (params.idempotencyKey) {
      const existing = await this.ledgerRepo.findByIdempotencyKey(params.idempotencyKey);
      if (existing) {
        if (
          existing.userId !== params.userId ||
          existing.amount !== amount ||
          existing.entryType !== 'refund'
        ) {
          alertService.raiseAlert({
            type: 'WALLET_MISMATCH',
            severity: 'HIGH',
            message: `Conflicting duplicate refund attempt for idempotency key ${params.idempotencyKey}`,
            details: { userId: params.userId, amount, entryType: 'refund', existingTxId: existing.id },
          }).catch(console.error);

          const err: any = new Error('Idempotency key reused with conflicting transaction parameters');
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

    return withTransaction(async (tx) => {
      const wallet = await this.walletRepo.findByUserIdForUpdate(params.userId, tx);
      if (!wallet) {
        const err: any = new Error('Wallet not found for refund');
        err.statusCode = 404;
        err.name = 'NotFound';
        throw err;
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = Money.add(balanceBefore, amount);

      const updatedWallet = await this.walletRepo.updateBalance(wallet.id, balanceAfter, tx);

      const ledgerEntry = await this.ledgerRepo.create(
        {
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
        },
        tx
      );

      return {
        wallet: this.toSafeWallet(updatedWallet),
        ledgerEntry: this.toSafeLedgerEntry(ledgerEntry),
      };
    });
  }

  /**
   * Executes a manual administrative adjustment (credit or debit) with mandatory reason.
   */
  async adjustWallet(
    params: AdjustWalletParams
  ): Promise<{ wallet: SafeWallet; ledgerEntry: SafeLedgerEntry }> {
    const amount = Money.format(params.amount);
    if (!Money.isPositive(amount)) {
      const err: any = new Error('Adjustment amount must be greater than zero');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    if (params.idempotencyKey) {
      const existing = await this.ledgerRepo.findByIdempotencyKey(params.idempotencyKey);
      if (existing) {
        if (
          existing.userId !== params.userId ||
          existing.amount !== amount ||
          existing.entryType !== 'adjustment'
        ) {
          const err: any = new Error('Idempotency key reused with conflicting parameters');
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

    return withTransaction(async (tx) => {
      let wallet = await this.walletRepo.findByUserIdForUpdate(params.userId, tx);
      if (!wallet) {
        wallet = await this.walletRepo.create(
          {
            userId: params.userId,
            balance: '0.00',
            currency: params.currency || 'INR',
            status: 'active',
          },
          tx
        );
      }

      const balanceBefore = wallet.balance;
      let balanceAfter: string;

      if (params.direction === 'credit') {
        balanceAfter = Money.add(balanceBefore, amount);
      } else {
        if (!Money.isGreaterThanOrEqual(balanceBefore, amount)) {
          const err: any = new Error(
            `Cannot adjust debit: insufficient funds (Balance: ${balanceBefore}, Requested debit: ${amount})`
          );
          err.statusCode = 422;
          err.name = 'UnprocessableEntity';
          throw err;
        }
        balanceAfter = Money.subtract(balanceBefore, amount);
      }

      const updatedWallet = await this.walletRepo.updateBalance(wallet.id, balanceAfter, tx);

      const ledgerEntry = await this.ledgerRepo.create(
        {
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
        },
        tx
      );

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
  async reconcileWallet(userId: string): Promise<ReconciliationResult> {
    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) {
      const err: any = new Error('Wallet not found for reconciliation');
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    const entries = await this.ledgerRepo.findAllByWalletId(wallet.id);

    let creditsSubunits = 0n;
    let debitsSubunits = 0n;

    for (const entry of entries) {
      const amountSubunits = Money.toSubunits(entry.amount);

      if (entry.entryType === 'credit' || entry.entryType === 'refund') {
        creditsSubunits += amountSubunits;
      } else if (entry.entryType === 'debit') {
        debitsSubunits += amountSubunits;
      } else if (entry.entryType === 'adjustment') {
        // Look at balance change
        const before = Money.toSubunits(entry.balanceBefore);
        const after = Money.toSubunits(entry.balanceAfter);
        if (after >= before) {
          creditsSubunits += (after - before);
        } else {
          debitsSubunits += (before - after);
        }
      } else if (entry.entryType === 'reversal') {
        const before = Money.toSubunits(entry.balanceBefore);
        const after = Money.toSubunits(entry.balanceAfter);
        if (after >= before) {
          creditsSubunits += (after - before);
        } else {
          debitsSubunits += (before - after);
        }
      }
    }

    const calculatedSubunits = creditsSubunits >= debitsSubunits
      ? creditsSubunits - debitsSubunits
      : 0n;

    const calculatedBalance = Money.fromSubunits(calculatedSubunits);
    const cachedBalance = Money.format(wallet.balance);

    const isMatched = calculatedBalance === cachedBalance;
    const diffSubunits = calculatedSubunits >= Money.toSubunits(cachedBalance)
      ? calculatedSubunits - Money.toSubunits(cachedBalance)
      : Money.toSubunits(cachedBalance) - calculatedSubunits;

    if (!isMatched) {
      alertService.raiseAlert({
        type: 'WALLET_MISMATCH',
        severity: 'CRITICAL',
        message: `Wallet reconciliation mismatch for user ${userId}: Ledger is ${calculatedBalance}, Wallet is ${cachedBalance}`,
        details: { userId, walletId: wallet.id, cachedBalance, calculatedBalance, difference: Money.fromSubunits(diffSubunits) },
      }).catch(console.error);
    }

    return {
      walletId: wallet.id,
      cachedBalance,
      ledgerCalculatedBalance: calculatedBalance,
      isMatched,
      difference: Money.fromSubunits(diffSubunits),
      totalCredits: Money.fromSubunits(creditsSubunits),
      totalDebits: Money.fromSubunits(debitsSubunits),
      entryCount: entries.length,
    };
  }

  /**
   * Retrieves paginated ledger history for a customer's wallet.
   */
  async getLedger(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    entries: SafeLedgerEntry[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
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

  toSafeWallet(w: Wallet): SafeWallet {
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

  toSafeLedgerEntry(e: WalletLedgerEntry): SafeLedgerEntry {
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

export const walletService = new WalletService();
