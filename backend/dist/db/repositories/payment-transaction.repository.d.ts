import { DbClient, DbTransaction } from '../client';
import { PaymentTransaction, NewPaymentTransaction } from '../schema/payment-transactions';
export declare class PaymentTransactionRepository {
    private db;
    constructor(db?: DbClient);
    create(data: NewPaymentTransaction, tx?: DbTransaction): Promise<PaymentTransaction>;
    findById(id: string, tx?: DbTransaction): Promise<PaymentTransaction | null>;
    /**
     * Row-level lock FOR UPDATE inside transaction to prevent concurrent status updates.
     */
    findByIdForUpdate(id: string, tx: DbTransaction): Promise<PaymentTransaction | null>;
    findByIdempotencyKey(key: string, tx?: DbTransaction): Promise<PaymentTransaction | null>;
    findByGatewayPaymentId(gateway: string, gatewayPaymentId: string, tx?: DbTransaction): Promise<PaymentTransaction | null>;
    findByUserId(userId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        transactions: PaymentTransaction[];
        total: number;
    }>;
    findAll(options?: {
        limit?: number;
        offset?: number;
        status?: string;
        userId?: string;
    }): Promise<{
        transactions: PaymentTransaction[];
        total: number;
    }>;
    updateStatus(id: string, updates: {
        status: string;
        gatewayPaymentId?: string;
        gatewayOrderId?: string;
        failureCode?: string;
        failureReason?: string;
        completedAt?: Date;
        refundedAt?: Date;
        metadata?: string;
    }, tx?: DbTransaction): Promise<PaymentTransaction>;
}
export declare const paymentTransactionRepository: PaymentTransactionRepository;
