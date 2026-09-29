"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentTransactionRepository = exports.PaymentTransactionRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const payment_transactions_1 = require("../schema/payment-transactions");
class PaymentTransactionRepository {
    db;
    constructor(db) {
        this.db = db || (0, client_1.getDb)();
    }
    async create(data, tx) {
        const executor = tx || this.db;
        const result = await executor
            .insert(payment_transactions_1.paymentTransactions)
            .values(data)
            .returning();
        return result[0];
    }
    async findById(id, tx) {
        const executor = tx || this.db;
        const result = await executor
            .select()
            .from(payment_transactions_1.paymentTransactions)
            .where((0, drizzle_orm_1.eq)(payment_transactions_1.paymentTransactions.id, id))
            .limit(1);
        return result[0] || null;
    }
    /**
     * Row-level lock FOR UPDATE inside transaction to prevent concurrent status updates.
     */
    async findByIdForUpdate(id, tx) {
        const result = await tx
            .select()
            .from(payment_transactions_1.paymentTransactions)
            .where((0, drizzle_orm_1.eq)(payment_transactions_1.paymentTransactions.id, id))
            .for('update')
            .limit(1);
        return result[0] || null;
    }
    async findByIdempotencyKey(key, tx) {
        const executor = tx || this.db;
        const result = await executor
            .select()
            .from(payment_transactions_1.paymentTransactions)
            .where((0, drizzle_orm_1.eq)(payment_transactions_1.paymentTransactions.idempotencyKey, key))
            .limit(1);
        return result[0] || null;
    }
    async findByGatewayPaymentId(gateway, gatewayPaymentId, tx) {
        const executor = tx || this.db;
        const result = await executor
            .select()
            .from(payment_transactions_1.paymentTransactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payment_transactions_1.paymentTransactions.gateway, gateway), (0, drizzle_orm_1.eq)(payment_transactions_1.paymentTransactions.gatewayPaymentId, gatewayPaymentId)))
            .limit(1);
        return result[0] || null;
    }
    async findByUserId(userId, options = {}) {
        const limit = options.limit || 20;
        const offset = options.offset || 0;
        const [rows, totalResult] = await Promise.all([
            this.db
                .select()
                .from(payment_transactions_1.paymentTransactions)
                .where((0, drizzle_orm_1.eq)(payment_transactions_1.paymentTransactions.userId, userId))
                .orderBy((0, drizzle_orm_1.desc)(payment_transactions_1.paymentTransactions.createdAt))
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(payment_transactions_1.paymentTransactions)
                .where((0, drizzle_orm_1.eq)(payment_transactions_1.paymentTransactions.userId, userId)),
        ]);
        return {
            transactions: rows,
            total: Number(totalResult[0]?.count || 0),
        };
    }
    async findAll(options = {}) {
        const limit = options.limit || 20;
        const offset = options.offset || 0;
        const conditions = [];
        if (options.status) {
            conditions.push((0, drizzle_orm_1.eq)(payment_transactions_1.paymentTransactions.status, options.status));
        }
        if (options.userId) {
            conditions.push((0, drizzle_orm_1.eq)(payment_transactions_1.paymentTransactions.userId, options.userId));
        }
        const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const [rows, totalResult] = await Promise.all([
            this.db
                .select()
                .from(payment_transactions_1.paymentTransactions)
                .where(whereClause)
                .orderBy((0, drizzle_orm_1.desc)(payment_transactions_1.paymentTransactions.createdAt))
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(payment_transactions_1.paymentTransactions)
                .where(whereClause),
        ]);
        return {
            transactions: rows,
            total: Number(totalResult[0]?.count || 0),
        };
    }
    async updateStatus(id, updates, tx) {
        const executor = tx || this.db;
        const setPayload = {
            ...updates,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`,
        };
        const result = await executor
            .update(payment_transactions_1.paymentTransactions)
            .set(setPayload)
            .where((0, drizzle_orm_1.eq)(payment_transactions_1.paymentTransactions.id, id))
            .returning();
        return result[0];
    }
}
exports.PaymentTransactionRepository = PaymentTransactionRepository;
exports.paymentTransactionRepository = new PaymentTransactionRepository();
