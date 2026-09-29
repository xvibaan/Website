"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRefundRepository = exports.PaymentRefundRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const payment_refunds_1 = require("../schema/payment-refunds");
class PaymentRefundRepository {
    db;
    constructor(db) {
        this.db = db || (0, client_1.getDb)();
    }
    async create(data, tx) {
        const executor = tx || this.db;
        const result = await executor
            .insert(payment_refunds_1.paymentRefunds)
            .values(data)
            .returning();
        return result[0];
    }
    async findByPaymentTransactionId(paymentTransactionId, tx) {
        const executor = tx || this.db;
        return executor
            .select()
            .from(payment_refunds_1.paymentRefunds)
            .where((0, drizzle_orm_1.eq)(payment_refunds_1.paymentRefunds.paymentTransactionId, paymentTransactionId));
    }
}
exports.PaymentRefundRepository = PaymentRefundRepository;
exports.paymentRefundRepository = new PaymentRefundRepository();
