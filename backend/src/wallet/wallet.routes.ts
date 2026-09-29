import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { walletService } from './wallet.service';
import { ledgerQuerySchema } from './wallet.validation';
import { authenticate } from '../auth/auth.middleware';
import { walletLedgerRepository, paymentTransactionRepository } from '../db/repositories';

export const walletRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // All customer wallet endpoints require active authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/wallet
   * Returns current authenticated customer's central marketplace wallet.
   * Uses server-side request.user.userId to enforce IDOR protection.
   */
  app.get('/', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const wallet = await walletService.getOrCreateWallet(request.user.userId);
    return reply.status(200).send({
      wallet: walletService.toSafeWallet(wallet),
    });
  });

  /**
   * GET /api/v1/wallet/ledger
   * Returns paginated immutable ledger history for the authenticated customer.
   */
  app.get('/ledger', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const queryResult = ledgerQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid pagination query parameters',
        issues: queryResult.error.flatten().fieldErrors,
      });
    }

    const { page, limit } = queryResult.data;
    const result = await walletService.getLedger(request.user.userId, page, limit);

    return reply.status(200).send(result);
  });

  /**
   * GET /api/v1/wallet/transactions
   * Returns a flattened array of transactions for the frontend WalletTransactionTable.
   * Merges immutable ledger entries (completed) with pending/failed payment transactions.
   */
  app.get('/transactions', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userId = request.user.userId;
    const wallet = await walletService.getOrCreateWallet(userId);

    // Fetch both datasets concurrently
    const [ledgerEntries, paymentTxnsResult] = await Promise.all([
      walletLedgerRepository.findAllByWalletId(wallet.id),
      paymentTransactionRepository.findByUserId(userId, { limit: 1000 })
    ]);

    const mappedTransactions: any[] = [];

    // Map ledger entries (always COMPLETED, authoritative source of truth for balance movements)
    for (const entry of ledgerEntries) {
      let type = 'ADJUSTMENT';
      if (entry.entryType === 'credit') {
        type = entry.referenceType === 'refund' ? 'REFUND' : 'DEPOSIT';
      } else if (entry.entryType === 'debit') {
        type = entry.referenceType === 'order' ? 'PURCHASE' : 'DEBIT';
      } else if (entry.entryType === 'refund') {
        type = 'REFUND';
      }

      const amountVal = parseFloat(entry.amount as string);
      // For debits (PURCHASE), frontend expects negative amount so it calculates correctly
      const finalAmount = (entry.entryType === 'debit' || type === 'PURCHASE' || type === 'DEBIT') 
        ? -amountVal 
        : amountVal;

      let orderId: number | null = null;
      if (entry.referenceType === 'order' && entry.referenceId) {
        orderId = parseInt(entry.referenceId, 10);
        if (isNaN(orderId)) orderId = null;
      }

      mappedTransactions.push({
        id: entry.id,
        reference: entry.referenceId || `LEDGER-${entry.id.substring(0, 8)}`,
        user_id: entry.userId,
        type,
        amount: finalAmount,
        balance_after: parseFloat(entry.balanceAfter as string),
        status: 'COMPLETED', // Ledger entries are inherently completed
        channel: 'WALLET_VAULT',
        description: entry.description,
        order_id: orderId,
        created_at: entry.createdAt.toISOString(),
      });
    }

    // Map only non-completed payment transactions (pending, failed, cancelled)
    // Completed ones are already represented in the ledger
    for (const p of paymentTxnsResult.transactions) {
      if (p.status.toUpperCase() === 'COMPLETED') continue;

      const amountVal = parseFloat(p.amount as string);

      mappedTransactions.push({
        id: p.id,
        reference: p.gatewayPaymentId || `PAY-${p.id.substring(0, 8)}`,
        user_id: p.userId,
        type: 'DEPOSIT', // Payment transactions in this system are wallet recharges
        amount: amountVal,
        balance_after: parseFloat(wallet.balance as string), // Balance hasn't updated yet
        status: p.status.toUpperCase(),
        channel: p.gateway,
        description: `Wallet recharge via ${p.gateway}`,
        order_id: null,
        created_at: p.createdAt.toISOString(),
      });
    }

    // Sort newest first
    mappedTransactions.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return reply.status(200).send(mappedTransactions);
  });
};
