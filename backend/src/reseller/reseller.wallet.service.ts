import { eq, sql, desc } from 'drizzle-orm';
import { getDb, DbTransaction, withTransaction } from '../db/client';
import { resellerWallets, ResellerWallet } from '../db/schema/reseller-wallets';
import { resellerWalletLedgerEntries, ResellerWalletLedgerEntry } from '../db/schema/reseller-wallet-ledger';
import { Money } from '../wallet/money';

export class ResellerWalletService {
  async getOrCreateWallet(resellerId: string, tx?: DbTransaction): Promise<ResellerWallet> {
    const db = tx || getDb();
    
    const [existing] = await db.select().from(resellerWallets).where(eq(resellerWallets.resellerId, resellerId)).limit(1);
    if (existing) return existing;

    try {
      const [wallet] = await db.insert(resellerWallets).values({
        resellerId,
        balance: '0.00',
        currency: 'INR',
        status: 'active',
      }).returning();
      return wallet;
    } catch (err) {
      const [refetched] = await db.select().from(resellerWallets).where(eq(resellerWallets.resellerId, resellerId)).limit(1);
      if (refetched) return refetched;
      throw err;
    }
  }

  async creditWallet(
    params: {
      resellerId: string;
      amount: string;
      referenceType: string;
      referenceId?: string;
      idempotencyKey: string;
      description: string;
    },
    existingTx?: DbTransaction
  ): Promise<{ wallet: ResellerWallet; ledgerEntry: ResellerWalletLedgerEntry }> {
    const amount = Money.format(params.amount);
    if (!Money.isPositive(amount)) {
      throw new Error('Credit amount must be greater than zero');
    }

    const executeOperation = async (tx: DbTransaction) => {
      // Check idempotency inside transaction
      const [existingLedger] = await tx
        .select()
        .from(resellerWalletLedgerEntries)
        .where(eq(resellerWalletLedgerEntries.idempotencyKey, params.idempotencyKey))
        .limit(1);

      if (existingLedger) {
        if (existingLedger.resellerId !== params.resellerId || existingLedger.amount !== amount || existingLedger.entryType !== 'credit') {
          throw new Error('Idempotency key reused with conflicting transaction parameters');
        }
        const [wallet] = await tx.select().from(resellerWallets).where(eq(resellerWallets.resellerId, params.resellerId)).limit(1);
        return { wallet, ledgerEntry: existingLedger };
      }

      // Lock row
      let [wallet] = await tx
        .select()
        .from(resellerWallets)
        .where(eq(resellerWallets.resellerId, params.resellerId))
        .for('update')
        .limit(1);

      if (!wallet) {
        [wallet] = await tx.insert(resellerWallets).values({
          resellerId: params.resellerId,
          balance: '0.00',
          currency: 'INR',
        }).returning();
      }

      if (wallet.status !== 'active') {
        throw new Error(`Wallet is ${wallet.status}`);
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = Money.add(balanceBefore, amount);

      const [updatedWallet] = await tx
        .update(resellerWallets)
        .set({ balance: balanceAfter, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(resellerWallets.id, wallet.id))
        .returning();

      const [ledgerEntry] = await tx
        .insert(resellerWalletLedgerEntries)
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

    if (existingTx) return executeOperation(existingTx);
    return withTransaction(executeOperation);
  }

  async debitWallet(
    params: {
      resellerId: string;
      amount: string;
      referenceType: string;
      referenceId?: string;
      idempotencyKey: string;
      description: string;
    },
    existingTx?: DbTransaction
  ): Promise<{ wallet: ResellerWallet; ledgerEntry: ResellerWalletLedgerEntry }> {
    const amount = Money.format(params.amount);
    if (!Money.isPositive(amount)) {
      throw new Error('Debit amount must be greater than zero');
    }

    const executeOperation = async (tx: DbTransaction) => {
      const [existingLedger] = await tx
        .select()
        .from(resellerWalletLedgerEntries)
        .where(eq(resellerWalletLedgerEntries.idempotencyKey, params.idempotencyKey))
        .limit(1);

      if (existingLedger) {
        if (existingLedger.resellerId !== params.resellerId || existingLedger.amount !== amount || existingLedger.entryType !== 'debit') {
          throw new Error('Idempotency key reused with conflicting transaction parameters');
        }
        const [wallet] = await tx.select().from(resellerWallets).where(eq(resellerWallets.resellerId, params.resellerId)).limit(1);
        return { wallet, ledgerEntry: existingLedger };
      }

      const [wallet] = await tx
        .select()
        .from(resellerWallets)
        .where(eq(resellerWallets.resellerId, params.resellerId))
        .for('update')
        .limit(1);

      if (!wallet) throw new Error('Reseller wallet not found');
      if (wallet.status !== 'active') throw new Error(`Wallet is ${wallet.status}`);

      if (!Money.isGreaterThanOrEqual(wallet.balance, amount)) {
        throw new Error(`Insufficient wallet funds. Current balance: ${wallet.balance}, Requested debit: ${amount}`);
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = Money.subtract(balanceBefore, amount);

      const [updatedWallet] = await tx
        .update(resellerWallets)
        .set({ balance: balanceAfter, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(resellerWallets.id, wallet.id))
        .returning();

      const [ledgerEntry] = await tx
        .insert(resellerWalletLedgerEntries)
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

    if (existingTx) return executeOperation(existingTx);
    return withTransaction(executeOperation);
  }
  
  async refundWallet(
    params: {
      resellerId: string;
      amount: string;
      referenceType: string;
      referenceId?: string;
      idempotencyKey: string;
      description: string;
    },
    existingTx?: DbTransaction
  ): Promise<{ wallet: ResellerWallet; ledgerEntry: ResellerWalletLedgerEntry }> {
    const amount = Money.format(params.amount);
    if (!Money.isPositive(amount)) {
      throw new Error('Refund amount must be greater than zero');
    }

    const executeOperation = async (tx: DbTransaction) => {
      const [existingLedger] = await tx
        .select()
        .from(resellerWalletLedgerEntries)
        .where(eq(resellerWalletLedgerEntries.idempotencyKey, params.idempotencyKey))
        .limit(1);

      if (existingLedger) {
        if (existingLedger.resellerId !== params.resellerId || existingLedger.amount !== amount || existingLedger.entryType !== 'refund') {
          throw new Error('Idempotency key reused with conflicting transaction parameters');
        }
        const [wallet] = await tx.select().from(resellerWallets).where(eq(resellerWallets.resellerId, params.resellerId)).limit(1);
        return { wallet, ledgerEntry: existingLedger };
      }

      const [wallet] = await tx
        .select()
        .from(resellerWallets)
        .where(eq(resellerWallets.resellerId, params.resellerId))
        .for('update')
        .limit(1);

      if (!wallet) throw new Error('Reseller wallet not found');
      if (wallet.status !== 'active') throw new Error(`Wallet is ${wallet.status}`);

      const balanceBefore = wallet.balance;
      const balanceAfter = Money.add(balanceBefore, amount);

      const [updatedWallet] = await tx
        .update(resellerWallets)
        .set({ balance: balanceAfter, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(resellerWallets.id, wallet.id))
        .returning();

      const [ledgerEntry] = await tx
        .insert(resellerWalletLedgerEntries)
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

    if (existingTx) return executeOperation(existingTx);
    return withTransaction(executeOperation);
  }

  async getLedger(resellerId: string) {
    const db = getDb();
    return db
      .select()
      .from(resellerWalletLedgerEntries)
      .where(eq(resellerWalletLedgerEntries.resellerId, resellerId))
      .orderBy(desc(resellerWalletLedgerEntries.createdAt));
  }
}

export const resellerWalletService = new ResellerWalletService();
