import { DbClient, DbTransaction } from '../client';
import { PaymentRefund, NewPaymentRefund } from '../schema/payment-refunds';
export declare class PaymentRefundRepository {
    private db;
    constructor(db?: DbClient);
    create(data: NewPaymentRefund, tx?: DbTransaction): Promise<PaymentRefund>;
    findByPaymentTransactionId(paymentTransactionId: string, tx?: DbTransaction): Promise<PaymentRefund[]>;
}
export declare const paymentRefundRepository: PaymentRefundRepository;
