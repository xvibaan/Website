import { withTransaction, DbTransaction } from '../../db/client';
import {
  PaymentTransactionRepository,
  paymentTransactionRepository,
  WebhookEventRepository,
  webhookEventRepository,
  PaymentRefundRepository,
  paymentRefundRepository,
} from '../../db/repositories';
import { PaymentTransaction } from '../../db/schema/payment-transactions';
import { WalletService, walletService } from '../../wallet/wallet.service';
import { Money } from '../../wallet/money';
import { PaymentGatewayHub, paymentGatewayHub } from './PaymentGatewayHub';
import { WebhookVerificationService, webhookVerificationService } from './WebhookVerificationService';
import {
  CreatePaymentParams,
  SafePaymentTransaction,
  ProcessWebhookResult,
  PaymentStatus,
  VerifyClientPaymentParams,
  VerifyClientPaymentResult,
} from '../payment.types';
import { settingsAdminService } from '../../admin/services/settings.service';
import { alertService } from '../../admin/services/alert.service';

export class PaymentTransactionService {
  private txRepo: PaymentTransactionRepository;
  private webhookEventRepo: WebhookEventRepository;
  private refundRepo: PaymentRefundRepository;
  private walletService: WalletService;
  private gatewayHub: PaymentGatewayHub;
  private webhookService: WebhookVerificationService;

  constructor(
    txRepo?: PaymentTransactionRepository,
    webhookEventRepo?: WebhookEventRepository,
    refundRepo?: PaymentRefundRepository,
    walletSvc?: WalletService,
    hub?: PaymentGatewayHub,
    webhookSvc?: WebhookVerificationService
  ) {
    this.txRepo = txRepo || paymentTransactionRepository;
    this.webhookEventRepo = webhookEventRepo || webhookEventRepository;
    this.refundRepo = refundRepo || paymentRefundRepository;
    this.walletService = walletSvc || walletService;
    this.gatewayHub = hub || paymentGatewayHub;
    this.webhookService = webhookSvc || webhookVerificationService;
  }

  /**
   * Initializes a customer wallet recharge payment transaction.
   * Enforces server-side authoritative amount, idempotency, and central wallet association.
   */
  async createWalletRechargePayment(
    params: CreatePaymentParams
  ): Promise<{
    paymentTransaction: SafePaymentTransaction;
    checkoutUrl?: string;
    clientSecret?: string;
    gatewayOrderId?: string;
  }> {
    const amount = Money.format(params.amount);
    if (!Money.isPositive(amount)) {
      const err: any = new Error('Recharge amount must be greater than zero');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    const currency = (params.currency || 'INR').toUpperCase();

    // Authoritative minimum deposit enforcement from platform settings
    const settingsKey = currency === 'USDT' ? 'min_deposit_usdt' : 'min_deposit_inr';
    const defaultMin = currency === 'USDT' ? '1' : '10';
    const minDepositStr = await settingsAdminService.getSettingValue(settingsKey, defaultMin);
    const minDepositFormatted = Money.format(minDepositStr);

    if (!Money.isGreaterThanOrEqual(amount, minDepositFormatted)) {
      const currencySymbol = currency === 'USDT' ? '$' : '₹';
      const err: any = new Error(
        `Minimum deposit amount is ${currencySymbol}${minDepositFormatted} for ${currency}. You entered ${currencySymbol}${amount}.`
      );
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }
    const purpose = params.purpose || 'WALLET_RECHARGE';

    // Currency-Aware Payment Routing Guard
    let gatewayId = params.gateway;
    if (!gatewayId) {
      if (currency === 'INR') {
        gatewayId = 'razorpay';
      } else {
        const err: any = new Error(`Payment currency currently unavailable. No active production gateway exists for ${currency}.`);
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }
    }

    // Verify gateway is supported
    const gateway = this.gatewayHub.getGateway(gatewayId);

    // Idempotency verification
    if (params.idempotencyKey) {
      const existing = await this.txRepo.findByIdempotencyKey(params.idempotencyKey);
      if (existing) {
        if (
          existing.userId !== params.userId ||
          existing.amount !== amount ||
          existing.currency !== currency ||
          existing.purpose !== purpose
        ) {
          const err: any = new Error(
            'Idempotency key reused with conflicting payment transaction parameters'
          );
          err.statusCode = 409;
          err.name = 'Conflict';
          throw err;
        }

        return {
          paymentTransaction: this.toSafePaymentTransaction(existing),
          gatewayOrderId: existing.gatewayOrderId || undefined,
        };
      }
    }

    // Resolve customer's central marketplace wallet
    const wallet = await this.walletService.getOrCreateWallet(params.userId);

    // 1. Create server-authoritative payment transaction in PENDING status
    const createdTx = await this.txRepo.create({
      userId: params.userId,
      walletId: wallet.id,
      gateway: gateway.gatewayId,
      amount,
      currency,
      status: 'PENDING',
      purpose,
      idempotencyKey: params.idempotencyKey || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });

    // 2. Register payment with selected central gateway
    let intentResult;
    try {
      intentResult = await gateway.createPayment({
        transactionId: createdTx.id,
        amount,
        currency,
        userId: params.userId,
        purpose,
        metadata: params.metadata,
      });
    } catch (gatewayErr: any) {
      // Mark transaction failed if gateway registration fails
      await this.txRepo.updateStatus(createdTx.id, {
        status: 'FAILED',
        failureCode: 'GATEWAY_INITIALIZATION_ERROR',
        failureReason: gatewayErr.message || 'Payment gateway registration failed',
      });
      throw gatewayErr;
    }

    // 3. Update transaction with gateway references
    const updatedTx = await this.txRepo.updateStatus(createdTx.id, {
      status: 'PENDING',
      gatewayPaymentId: intentResult.gatewayPaymentId,
      gatewayOrderId: intentResult.gatewayOrderId,
    });

    return {
      paymentTransaction: this.toSafePaymentTransaction(updatedTx),
      checkoutUrl: intentResult.checkoutUrl,
      clientSecret: intentResult.clientSecret,
      gatewayOrderId: intentResult.gatewayOrderId,
    };
  }

  /**
   * Processes an incoming payment gateway webhook with cryptographic verification,
   * duplicate protection, amount validation, and atomic wallet crediting.
   */
  async processWebhook(
    gatewayId: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string
  ): Promise<ProcessWebhookResult> {
    // 1. Cryptographically verify webhook signature and obtain normalized event
    const event = await this.webhookService.verifyWebhook(gatewayId, headers, rawBody);

    // 2. Webhook Event Idempotency Check (Database uniqueness on gateway + gateway_event_id)
    const existingEvent = await this.webhookEventRepo.findByGatewayAndEventId(
      gatewayId,
      event.gatewayEventId
    );
    if (existingEvent) {
      alertService.raiseAlert({
        type: 'WEBHOOK_FAILURE',
        severity: 'MEDIUM',
        message: `Duplicate webhook event received for gateway ${gatewayId}`,
        details: { gatewayId, gatewayEventId: event.gatewayEventId },
      }).catch(console.error);

      return {
        success: true,
        duplicate: true,
        status: 'IGNORED',
        message: 'Duplicate webhook event ignored (already processed)',
        paymentTransactionId: existingEvent.paymentReference || undefined,
      };
    }

    // 3. Find associated payment transaction by gatewayPaymentId
    const transaction = await this.txRepo.findByGatewayPaymentId(
      gatewayId,
      event.gatewayPaymentId
    );

    if (!transaction) {
      // Record failed event for audit trail
      try {
        await this.webhookEventRepo.create({
          gateway: gatewayId,
          gatewayEventId: event.gatewayEventId,
          eventType: event.eventType,
          paymentReference: null,
          status: 'FAILED',
          error: `No payment transaction found for gateway payment id: ${event.gatewayPaymentId}`,
        });
      } catch (e) {
        // Ignore duplicate key race condition
      }

      const err: any = new Error(
        `Payment transaction not found for gateway reference: '${event.gatewayPaymentId}'`
      );
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    // 4. Strict Amount Verification: Webhook amount MUST match stored transaction amount
    const normalizedEventAmount = Money.format(event.amount);
    const normalizedStoredAmount = Money.format(transaction.amount);

    if (normalizedEventAmount !== normalizedStoredAmount) {
      await this.webhookEventRepo.create({
        gateway: gatewayId,
        gatewayEventId: event.gatewayEventId,
        eventType: event.eventType,
        paymentReference: transaction.id,
        status: 'FAILED',
        error: `Amount mismatch. Expected: ${normalizedStoredAmount}, Received: ${normalizedEventAmount}`,
      });

      alertService.raiseAlert({
        type: 'WEBHOOK_FAILURE',
        severity: 'HIGH',
        message: `Payment amount mismatch for transaction ${transaction.id}`,
        details: { expected: normalizedStoredAmount, received: normalizedEventAmount, gatewayId },
      }).catch(console.error);

      const err: any = new Error(
        `Payment amount mismatch. Expected: ${normalizedStoredAmount}, Webhook reported: ${normalizedEventAmount}. Wallet credit aborted.`
      );
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // 5. Currency Verification
    if (event.currency.toUpperCase() !== transaction.currency.toUpperCase()) {
      await this.webhookEventRepo.create({
        gateway: gatewayId,
        gatewayEventId: event.gatewayEventId,
        eventType: event.eventType,
        paymentReference: transaction.id,
        status: 'FAILED',
        error: `Currency mismatch. Expected: ${transaction.currency}, Received: ${event.currency}`,
      });

      alertService.raiseAlert({
        type: 'WEBHOOK_FAILURE',
        severity: 'HIGH',
        message: `Payment currency mismatch for transaction ${transaction.id}`,
        details: { expected: transaction.currency, received: event.currency, gatewayId },
      }).catch(console.error);

      const err: any = new Error(
        `Payment currency mismatch. Expected: ${transaction.currency}, Webhook reported: ${event.currency}. Wallet credit aborted.`
      );
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // 6. State Machine Verification: Disallow invalid transitions
    if (transaction.status === 'SUCCESS') {
      return {
        success: true,
        duplicate: true,
        status: 'IGNORED',
        message: 'Payment transaction is already in SUCCESS status; no duplicate wallet credit',
        paymentTransactionId: transaction.id,
      };
    }

    if (transaction.status === 'FAILED') {
      alertService.raiseAlert({
        type: 'WEBHOOK_FAILURE',
        severity: 'HIGH',
        message: `Invalid payment state transition for transaction ${transaction.id}`,
        details: { currentStatus: transaction.status, attemptedTransition: 'SUCCESS', gatewayId },
      }).catch(console.error);

      const err: any = new Error('Cannot transition terminal FAILED payment to SUCCESS');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // 7. ATOMIC EXECUTION: Update payment status and credit wallet inside ONE database transaction
    return withTransaction(async (tx: DbTransaction) => {
      // Row lock FOR UPDATE on payment transaction
      const lockedTx = await this.txRepo.findByIdForUpdate(transaction.id, tx);
      if (!lockedTx) {
        throw new Error('Transaction disappeared during lock acquisition');
      }

      if (lockedTx.status === 'SUCCESS') {
        return {
          success: true,
          duplicate: true,
          status: 'IGNORED',
          message: 'Payment transaction is already in SUCCESS status; no duplicate credit applied',
          paymentTransactionId: lockedTx.id,
        };
      }

      if (['payment.succeeded', 'payment.captured', 'order.paid'].includes(event.eventType)) {
        // Mark payment transaction SUCCESS
        await this.txRepo.updateStatus(
          lockedTx.id,
          {
            status: 'SUCCESS',
            completedAt: new Date(),
          },
          tx
        );

        // Atomically credit central customer wallet using existing Phase 4 wallet service
        await this.walletService.creditWallet(
          {
            userId: lockedTx.userId,
            amount: lockedTx.amount,
            currency: lockedTx.currency,
            referenceType: 'payment',
            referenceId: lockedTx.id,
            idempotencyKey: `pay_credit_${lockedTx.id}`,
            description: `Wallet recharge via ${lockedTx.gateway}`,
            metadata: JSON.stringify({
              gateway: lockedTx.gateway,
              gatewayPaymentId: lockedTx.gatewayPaymentId,
              gatewayEventId: event.gatewayEventId,
            }),
          },
          tx
        );

        // Record webhook event as PROCESSED in the same atomic transaction
        await this.webhookEventRepo.create(
          {
            gateway: gatewayId,
            gatewayEventId: event.gatewayEventId,
            eventType: event.eventType,
            paymentReference: lockedTx.id,
            status: 'PROCESSED',
          },
          tx
        );

        return {
          success: true,
          status: 'PROCESSED',
          message: 'Payment verified and central customer wallet credited atomically',
          paymentTransactionId: lockedTx.id,
        };
      } else if (['payment.failed'].includes(event.eventType)) {
        await this.txRepo.updateStatus(
          lockedTx.id,
          {
            status: 'FAILED',
            failureReason: 'Payment gateway reported failed transaction',
          },
          tx
        );

        await this.webhookEventRepo.create(
          {
            gateway: gatewayId,
            gatewayEventId: event.gatewayEventId,
            eventType: event.eventType,
            paymentReference: lockedTx.id,
            status: 'PROCESSED',
          },
          tx
        );

        return {
          success: true,
          status: 'PROCESSED',
          message: 'Payment marked as FAILED; no wallet credit applied',
          paymentTransactionId: lockedTx.id,
        };
      } else if (['payment.cancelled', 'order.cancelled'].includes(event.eventType)) {
        // Explicitly cancelled events
        await this.txRepo.updateStatus(
          lockedTx.id,
          {
            status: 'CANCELLED',
            failureReason: `Payment event: ${event.eventType}`,
          },
          tx
        );

        await this.webhookEventRepo.create(
          {
            gateway: gatewayId,
            gatewayEventId: event.gatewayEventId,
            eventType: event.eventType,
            paymentReference: lockedTx.id,
            status: 'PROCESSED',
          },
          tx
        );

        return {
          success: true,
          status: 'PROCESSED',
          message: `Payment marked as CANCELLED; no wallet credit applied`,
          paymentTransactionId: lockedTx.id,
        };
      } else {
        // Safely ignore unknown or intermediate events (e.g., payment.authorized)
        await this.webhookEventRepo.create(
          {
            gateway: gatewayId,
            gatewayEventId: event.gatewayEventId,
            eventType: event.eventType,
            paymentReference: lockedTx.id,
            status: 'IGNORED',
          },
          tx
        );

        return {
          success: true,
          status: 'IGNORED',
          message: `Payment event '${event.eventType}' ignored; no state change applied`,
          paymentTransactionId: lockedTx.id,
        };
      }
    });
  }

  /**
   * Cryptographically verifies Razorpay Standard Checkout completion via client callback.
   * Enforces customer ownership (IDOR protection), order association, HMAC-SHA256 signature,
   * authoritative captured status, amount and currency validation, row-level locking, and idempotency.
   */
  async verifyClientPayment(
    params: VerifyClientPaymentParams,
    currentUserId: string
  ): Promise<VerifyClientPaymentResult> {
    // 1. Fetch transaction
    const transaction = await this.txRepo.findById(params.paymentTransactionId);
    if (!transaction) {
      const err: any = new Error('Payment transaction not found');
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    // 2. Ownership enforcement (IDOR protection)
    if (transaction.userId !== currentUserId) {
      const err: any = new Error('Access denied: you do not have permission to verify this payment');
      err.statusCode = 403;
      err.name = 'Forbidden';
      throw err;
    }

    // 3. Fast check if already SUCCESS (e.g. webhook finished first)
    if (transaction.status === 'SUCCESS') {
      return {
        success: true,
        status: 'SUCCESS',
        message: 'Payment already verified and credited',
        paymentTransaction: this.toSafePaymentTransaction(transaction),
      };
    }

    // 4. Reject terminal invalid states
    if (transaction.status === 'FAILED' || transaction.status === 'CANCELLED') {
      const err: any = new Error(`Cannot verify payment in terminal ${transaction.status} status`);
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // 5. Require Razorpay order ID to match stored transaction
    if (transaction.gatewayOrderId && transaction.gatewayOrderId !== params.razorpay_order_id) {
      const err: any = new Error(
        `Razorpay order ID mismatch. Expected: '${transaction.gatewayOrderId}', Received: '${params.razorpay_order_id}'`
      );
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // 6. Resolve gateway
    const gateway = this.gatewayHub.getGateway(transaction.gateway);

    // 7. Verify Standard Checkout signature using HMAC-SHA256 with timing-safe comparison
    if (gateway.verifyPaymentSignature) {
      const isSignatureValid = await gateway.verifyPaymentSignature({
        orderId: params.razorpay_order_id,
        paymentId: params.razorpay_payment_id,
        signature: params.razorpay_signature,
      });

      if (!isSignatureValid) {
        alertService.raiseAlert({
          type: 'WEBHOOK_FAILURE',
          severity: 'HIGH',
          message: `Payment signature verification failed for transaction ${transaction.id}`,
          details: {
            paymentTransactionId: transaction.id,
            gatewayOrderId: params.razorpay_order_id,
            gatewayPaymentId: params.razorpay_payment_id,
          },
        }).catch(console.error);

        const err: any = new Error('Invalid payment signature');
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }
    }

    // 8. Authoritative gateway status, amount, currency & order verification
    if (gateway.fetchPaymentDetails) {
      const details = await gateway.fetchPaymentDetails(params.razorpay_payment_id);

      // Verify order association from authoritative gateway response
      if (details.orderId && transaction.gatewayOrderId && details.orderId !== transaction.gatewayOrderId) {
        const err: any = new Error('Authoritative gateway payment is not associated with this order');
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }

      // Verify captured status
      if (!details.captured || details.status !== 'captured') {
        const err: any = new Error(
          `Payment is not captured. Authoritative status: '${details.status}'`
        );
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }

      // Verify amount
      const normalizedDetailsAmount = Money.format(details.amount);
      const normalizedStoredAmount = Money.format(transaction.amount);
      if (normalizedDetailsAmount !== normalizedStoredAmount) {
        alertService.raiseAlert({
          type: 'WEBHOOK_FAILURE',
          severity: 'HIGH',
          message: `Payment amount mismatch during client verification for transaction ${transaction.id}`,
          details: { expected: normalizedStoredAmount, received: normalizedDetailsAmount },
        }).catch(console.error);

        const err: any = new Error(
          `Payment amount mismatch. Expected: ${normalizedStoredAmount}, Gateway reported: ${normalizedDetailsAmount}`
        );
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }

      // Verify currency
      if (details.currency.toUpperCase() !== transaction.currency.toUpperCase()) {
        const err: any = new Error(
          `Payment currency mismatch. Expected: ${transaction.currency}, Gateway reported: ${details.currency}`
        );
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }
    }

    // 9. Atomic Transaction with FOR UPDATE lock & Idempotency
    return withTransaction(async (dbTx: DbTransaction) => {
      const lockedTx = await this.txRepo.findByIdForUpdate(transaction.id, dbTx);
      if (!lockedTx) {
        throw new Error('Transaction disappeared during lock acquisition');
      }

      if (lockedTx.status === 'SUCCESS') {
        return {
          success: true,
          status: 'SUCCESS',
          message: 'Payment already verified and credited',
          paymentTransaction: this.toSafePaymentTransaction(lockedTx),
        };
      }

      // Update payment transaction to SUCCESS and record authoritative payment ID
      const updatedTx = await this.txRepo.updateStatus(
        lockedTx.id,
        {
          status: 'SUCCESS',
          gatewayPaymentId: params.razorpay_payment_id,
          completedAt: new Date(),
        },
        dbTx
      );

      // Atomically credit central customer wallet with idempotency key
      await this.walletService.creditWallet(
        {
          userId: lockedTx.userId,
          amount: lockedTx.amount,
          currency: lockedTx.currency,
          referenceType: 'payment',
          referenceId: lockedTx.id,
          idempotencyKey: `pay_credit_${lockedTx.id}`,
          description: `Wallet recharge via ${lockedTx.gateway}`,
          metadata: JSON.stringify({
            gateway: lockedTx.gateway,
            gatewayPaymentId: params.razorpay_payment_id,
            gatewayOrderId: params.razorpay_order_id,
            verificationChannel: 'client_verify',
          }),
        },
        dbTx
      );

      return {
        success: true,
        status: 'SUCCESS',
        message: 'Payment verified and wallet credited successfully',
        paymentTransaction: this.toSafePaymentTransaction(updatedTx),
      };
    });
  }

  /**
   * Retrieves single payment transaction for customer with IDOR protection.
   */
  async getPaymentById(paymentId: string, currentUserId: string): Promise<SafePaymentTransaction> {
    const tx = await this.txRepo.findById(paymentId);
    if (!tx) {
      const err: any = new Error('Payment transaction not found');
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    if (tx.userId !== currentUserId) {
      const err: any = new Error('Access denied: you do not have permission to view this payment');
      err.statusCode = 403;
      err.name = 'Forbidden';
      throw err;
    }

    return this.toSafePaymentTransaction(tx);
  }

  /**
   * Retrieves paginated payment history for an authenticated customer.
   */
  async getPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: SafePaymentTransaction[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const offset = (page - 1) * limit;
    const { transactions, total } = await this.txRepo.findByUserId(userId, {
      limit,
      offset,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      transactions: transactions.map((t) => this.toSafePaymentTransaction(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Administrative listing of payment transactions.
   */
  async getAdminPayments(options: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }): Promise<{
    transactions: SafePaymentTransaction[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const { transactions, total } = await this.txRepo.findAll({
      limit,
      offset,
      status: options.status,
      userId: options.userId,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      transactions: transactions.map((t) => this.toSafePaymentTransaction(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Administrative retrieval of single payment transaction.
   */
  async getAdminPaymentById(paymentId: string): Promise<SafePaymentTransaction> {
    const tx = await this.txRepo.findById(paymentId);
    if (!tx) {
      const err: any = new Error('Payment transaction not found');
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    return this.toSafePaymentTransaction(tx);
  }

  toSafePaymentTransaction(tx: PaymentTransaction): SafePaymentTransaction {
    return {
      id: tx.id,
      userId: tx.userId,
      walletId: tx.walletId,
      gateway: tx.gateway,
      gatewayPaymentId: tx.gatewayPaymentId,
      gatewayOrderId: tx.gatewayOrderId,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status as PaymentStatus,
      purpose: tx.purpose,
      failureCode: tx.failureCode,
      failureReason: tx.failureReason,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      completedAt: tx.completedAt,
      refundedAt: tx.refundedAt,
    };
  }
}

export const paymentTransactionService = new PaymentTransactionService();
