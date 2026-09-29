import { eq } from 'drizzle-orm';
import { getDb, DbClient, DbTransaction } from '../client';
import { paymentRefunds, PaymentRefund, NewPaymentRefund } from '../schema/payment-refunds';

export class PaymentRefundRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || getDb();
  }

  async create(data: NewPaymentRefund, tx?: DbTransaction): Promise<PaymentRefund> {
    const executor = tx || this.db;
    const result = await executor
      .insert(paymentRefunds)
      .values(data)
      .returning();

    return result[0];
  }

  async findByPaymentTransactionId(
    paymentTransactionId: string,
    tx?: DbTransaction
  ): Promise<PaymentRefund[]> {
    const executor = tx || this.db;
    return executor
      .select()
      .from(paymentRefunds)
      .where(eq(paymentRefunds.paymentTransactionId, paymentTransactionId));
  }
}

export const paymentRefundRepository = new PaymentRefundRepository();
