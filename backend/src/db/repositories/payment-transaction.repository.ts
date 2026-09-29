import { eq, and, desc, count, sql } from 'drizzle-orm';
import { getDb, DbClient, DbTransaction } from '../client';
import {
  paymentTransactions,
  PaymentTransaction,
  NewPaymentTransaction,
} from '../schema/payment-transactions';

export class PaymentTransactionRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || getDb();
  }

  async create(data: NewPaymentTransaction, tx?: DbTransaction): Promise<PaymentTransaction> {
    const executor = tx || this.db;
    const result = await executor
      .insert(paymentTransactions)
      .values(data)
      .returning();

    return result[0];
  }

  async findById(id: string, tx?: DbTransaction): Promise<PaymentTransaction | null> {
    const executor = tx || this.db;
    const result = await executor
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Row-level lock FOR UPDATE inside transaction to prevent concurrent status updates.
   */
  async findByIdForUpdate(id: string, tx: DbTransaction): Promise<PaymentTransaction | null> {
    const result = await tx
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, id))
      .for('update')
      .limit(1);

    return result[0] || null;
  }

  async findByIdempotencyKey(key: string, tx?: DbTransaction): Promise<PaymentTransaction | null> {
    const executor = tx || this.db;
    const result = await executor
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.idempotencyKey, key))
      .limit(1);

    return result[0] || null;
  }

  async findByGatewayPaymentId(
    gateway: string,
    gatewayPaymentId: string,
    tx?: DbTransaction
  ): Promise<PaymentTransaction | null> {
    const executor = tx || this.db;
    const result = await executor
      .select()
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.gateway, gateway),
          eq(paymentTransactions.gatewayPaymentId, gatewayPaymentId)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async findByUserId(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const [rows, totalResult] = await Promise.all([
      this.db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.userId, userId))
        .orderBy(desc(paymentTransactions.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(paymentTransactions)
        .where(eq(paymentTransactions.userId, userId)),
    ]);

    return {
      transactions: rows,
      total: Number(totalResult[0]?.count || 0),
    };
  }

  async findAll(
    options: { limit?: number; offset?: number; status?: string; userId?: string } = {}
  ): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const conditions = [];
    if (options.status) {
      conditions.push(eq(paymentTransactions.status, options.status));
    }
    if (options.userId) {
      conditions.push(eq(paymentTransactions.userId, options.userId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      this.db
        .select()
        .from(paymentTransactions)
        .where(whereClause)
        .orderBy(desc(paymentTransactions.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(paymentTransactions)
        .where(whereClause),
    ]);

    return {
      transactions: rows,
      total: Number(totalResult[0]?.count || 0),
    };
  }

  async updateStatus(
    id: string,
    updates: {
      status: string;
      gatewayPaymentId?: string;
      gatewayOrderId?: string;
      failureCode?: string;
      failureReason?: string;
      completedAt?: Date;
      refundedAt?: Date;
      metadata?: string;
    },
    tx?: DbTransaction
  ): Promise<PaymentTransaction> {
    const executor = tx || this.db;
    const setPayload: any = {
      ...updates,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    const result = await executor
      .update(paymentTransactions)
      .set(setPayload)
      .where(eq(paymentTransactions.id, id))
      .returning();

    return result[0];
  }
}

export const paymentTransactionRepository = new PaymentTransactionRepository();
