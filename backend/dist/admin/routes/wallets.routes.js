"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletAdminRoutes = void 0;
const wallet_service_1 = require("../../wallet/wallet.service");
const repositories_1 = require("../../db/repositories");
const wallet_validation_1 = require("../../wallet/wallet.validation");
const admin_validation_1 = require("../validation/admin.validation");
const client_1 = require("../../db/client");
const wallets_1 = require("../../db/schema/wallets");
const users_1 = require("../../db/schema/users");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../services/audit.service");
const walletAdminRoutes = async (app) => {
    /**
     * GET /api/v1/admin/wallets
     * Lists central wallets with user details and balances.
     */
    app.get('/', async (request, reply) => {
        const parseResult = admin_validation_1.paginationQuerySchema.safeParse(request.query);
        const page = parseResult.success ? parseResult.data.page : 1;
        const limit = parseResult.success ? parseResult.data.limit : 20;
        const offset = (page - 1) * limit;
        const db = (0, client_1.getDb)();
        const [totalRes] = await db.select({ count: (0, drizzle_orm_1.count)() }).from(wallets_1.wallets);
        const total = Number(totalRes?.count || 0);
        const rows = await db
            .select({
            wallet: wallets_1.wallets,
            userEmail: users_1.users.email,
            userRole: users_1.users.role,
            userActive: users_1.users.isActive,
        })
            .from(wallets_1.wallets)
            .leftJoin(users_1.users, (0, drizzle_orm_1.eq)(wallets_1.wallets.userId, users_1.users.id))
            .orderBy((0, drizzle_orm_1.desc)(wallets_1.wallets.updatedAt))
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
        const { userId } = request.params;
        const wallet = await repositories_1.walletRepository.findByUserId(userId);
        if (!wallet) {
            return reply.status(404).send({
                statusCode: 404,
                error: 'NotFound',
                message: `Wallet for user '${userId}' not found`,
            });
        }
        const ledger = await wallet_service_1.walletService.getLedger(userId, 1, 50);
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
    const handleAdjustment = async (request, reply) => {
        const body = { ...request.body };
        if (request.params?.userId && !body.userId) {
            body.userId = request.params.userId;
        }
        const parseResult = wallet_validation_1.adminAdjustSchema.safeParse(body);
        if (!parseResult.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Invalid wallet adjustment input',
                issues: parseResult.error.flatten().fieldErrors,
            });
        }
        const { userId, amount, direction, reason, idempotencyKey, currency } = parseResult.data;
        const result = await wallet_service_1.walletService.adjustWallet({
            userId,
            amount,
            direction,
            reason,
            currency,
            idempotencyKey,
            adminUserId: request.user.userId,
        });
        await audit_service_1.auditService.record({
            adminUserId: request.user.userId,
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
        const { userId } = request.params;
        const result = await wallet_service_1.walletService.reconcileWallet(userId);
        return reply.status(200).send({
            success: true,
            reconciliation: result,
        });
    });
};
exports.walletAdminRoutes = walletAdminRoutes;
