import { FastifyPluginAsync } from 'fastify';
import { walletService } from '../../wallet/wallet.service';
import { walletRepository } from '../../db/repositories';
import { adminAdjustSchema } from '../../wallet/wallet.validation';
import { paginationQuerySchema } from '../validation/admin.validation';
import { getDb } from '../../db/client';
import { wallets } from '../../db/schema/wallets';
import { users } from '../../db/schema/users';
import { desc, count, eq } from 'drizzle-orm';
import { auditService } from '../services/audit.service';

export const walletAdminRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/admin/wallets
   * Lists central wallets with user details and balances.
   */
  app.get('/', async (request, reply) => {
    const parseResult = paginationQuerySchema.safeParse(request.query);
    const page = parseResult.success ? parseResult.data.page : 1;
    const limit = parseResult.success ? parseResult.data.limit : 20;
    const offset = (page - 1) * limit;

    const db = getDb();
    const [totalRes] = await db.select({ count: count() }).from(wallets);
    const total = Number(totalRes?.count || 0);

    const rows = await db
      .select({
        wallet: wallets,
        userEmail: users.email,
        userRole: users.role,
        userActive: users.isActive,
      })
      .from(wallets)
      .leftJoin(users, eq(wallets.userId, users.id))
      .orderBy(desc(wallets.updatedAt))
      .limit(limit)
      .offset(offset);

    const list = rows.map((r) => ({
      id: r.wallet.id,
      userId: r.wallet.userId,
      userEmail: r.userEmail,
      userRole: r.userRole,
      userActive: r.userActive,
      balance: r.wallet.balance,
      currency: r.wallet.currency,
      status: r.wallet.status,
      createdAt: r.wallet.createdAt,
      updatedAt: r.wallet.updatedAt,
    }));

    return reply.status(200).send({
      success: true,
      wallets: list,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  });

  /**
   * GET /api/v1/admin/wallets/:userId
   * Retrieves single user central wallet + recent immutable ledger transactions.
   */
  app.get('/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NotFound',
        message: `Wallet for user '${userId}' not found`,
      });
    }

    const ledger = await walletService.getLedger(userId, 1, 50);

    return reply.status(200).send({
      success: true,
      wallet,
      ledger: ledger.entries,
      totalLedgerEntries: ledger.pagination.total,
    });
  });

  /**
   * POST /api/v1/admin/wallets/adjust AND POST /api/v1/admin/wallets/:userId/adjust
   * Administrative transactional adjustment (credit or debit) creating immutable ledger entry.
   */
  const handleAdjustment = async (request: any, reply: any) => {
    const body = { ...request.body };
    if (request.params?.userId && !body.userId) {
      body.userId = request.params.userId;
    }

    const parseResult = adminAdjustSchema.safeParse(body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid wallet adjustment input',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const { userId, amount, direction, reason, idempotencyKey, currency } = parseResult.data;

    const result = await walletService.adjustWallet({
      userId,
      amount,
      direction,
      reason,
      currency,
      idempotencyKey,
      adminUserId: request.user!.userId,
    });

    await auditService.record({
      adminUserId: request.user!.userId,
      action: 'WALLET_ADMIN_ADJUSTMENT',
      entityType: 'WALLET',
      entityId: result.wallet.id,
      details: {
        userId,
        amount,
        direction,
        reason,
        balanceBefore: result.ledgerEntry.balanceBefore,
        balanceAfter: result.ledgerEntry.balanceAfter,
      },
    });

    return reply.status(200).send({
      success: true,
      wallet: result.wallet,
      ledgerEntry: result.ledgerEntry,
    });
  };

  app.post('/adjust', handleAdjustment);
  app.post('/:userId/adjust', handleAdjustment);

  /**
   * GET /api/v1/admin/wallets/:userId/reconcile
   * Reconciles cached wallet balance against ledger-derived sum.
   */
  app.get('/:userId/reconcile', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const result = await walletService.reconcileWallet(userId);
    return reply.status(200).send({
      success: true,
      reconciliation: result,
    });
  });
};
