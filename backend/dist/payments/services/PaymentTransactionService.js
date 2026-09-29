"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentTransactionService = exports.PaymentTransactionService = void 0;
const client_1 = require("../../db/client");
const repositories_1 = require("../../db/repositories");
const wallet_service_1 = require("../../wallet/wallet.service");
const money_1 = require("../../wallet/money");
const PaymentGatewayHub_1 = require("./PaymentGatewayHub");
const WebhookVerificationService_1 = require("./WebhookVerificationService");
const settings_service_1 = require("../../admin/services/settings.service");
const alert_service_1 = require("../../admin/services/alert.service");
class PaymentTransactionService {
    txRepo;
    webhookEventRepo;
    refundRepo;
    walletService;
    gatewayHub;
    webhookService;
    constructor(txRepo, webhookEventRepo, refundRepo, walletSvc, hub, webhookSvc) {
        this.txRepo = txRepo || repositories_1.paymentTransactionRepository;
        this.webhookEventRepo = webhookEventRepo || repositories_1.webhookEventRepository;
        this.refundRepo = refundRepo || repositories_1.paymentRefundRepository;
        this.walletService = walletSvc || wallet_service_1.walletService;
        this.gatewayHub = hub || PaymentGatewayHub_1.paymentGatewayHub;
        this.webhookService = webhookSvc || WebhookVerificationService_1.webhookVerificationService;
    }
    /**
     * Initializes a customer wallet recharge payment transaction.
     * Enforces server-side authoritative amount, idempotency, and central wallet association.
     */
    async createWalletRechargePayment(params) {
        const amount = money_1.Money.format(params.amount);
        if (!money_1.Money.isPositive(amount)) {
            const err = new Error('Recharge amount must be greater than zero');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        const currency = (params.currency || 'INR').toUpperCase();
        // Authoritative minimum deposit enforcement from platform settings
        const settingsKey = currency === 'USDT' ? 'min_deposit_usdt' : 'min_deposit_inr';
        const defaultMin = currency === 'USDT' ? '1' : '10';
        const minDepositStr = await settings_service_1.settingsAdminService.getSettingValue(settingsKey, defaultMin);
        const minDepositFormatted = money_1.Money.format(minDepositStr);
        if (!money_1.Money.isGreaterThanOrEqual(amount, minDepositFormatted)) {
            const currencySymbol = currency === 'USDT' ? '$' : '₹';
            const err = new Error(`Minimum deposit amount is ${currencySymbol}${minDepositFormatted} for ${currency}. You entered ${currencySymbol}${amount}.`);
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        const purpose = params.purpose || 'WALLET_RECHARGE';
        const gatewayId = params.gateway || this.gatewayHub.getDefaultGatewayId();
        // Verify gateway is supported
        const gateway = this.gatewayHub.getGateway(gatewayId);
        // Idempotency verification
        if (params.idempotencyKey) {
            const existing = await this.txRepo.findByIdempotencyKey(params.idempotencyKey);
            if (existing) {
                if (existing.userId !== params.userId ||
                    existing.amount !== amount ||
                    existing.currency !== currency ||
                    existing.purpose !== purpose) {
                    const err = new Error('Idempotency key reused with conflicting payment transaction parameters');
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
        }
        catch (gatewayErr) {
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
    async processWebhook(gatewayId, headers, rawBody) {
        // 1. Cryptographically verify webhook signature and obtain normalized event
        const event = await this.webhookService.verifyWebhook(gatewayId, headers, rawBody);
        // 2. Webhook Event Idempotency Check (Database uniqueness on gateway + gateway_event_id)
        const existingEvent = await this.webhookEventRepo.findByGatewayAndEventId(gatewayId, event.gatewayEventId);
        if (existingEvent) {
            alert_service_1.alertService.raiseAlert({
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
        const transaction = await this.txRepo.findByGatewayPaymentId(gatewayId, event.gatewayPaymentId);
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
            }
            catch (e) {
                // Ignore duplicate key race condition
            }
            const err = new Error(`Payment transaction not found for gateway reference: '${event.gatewayPaymentId}'`);
            err.statusCode = 404;
            err.name = 'NotFound';
            throw err;
        }
        // 4. Strict Amount Verification: Webhook amount MUST match stored transaction amount
        const normalizedEventAmount = money_1.Money.format(event.amount);
        const normalizedStoredAmount = money_1.Money.format(transaction.amount);
        if (normalizedEventAmount !== normalizedStoredAmount) {
            await this.webhookEventRepo.create({
                gateway: gatewayId,
                gatewayEventId: event.gatewayEventId,
                eventType: event.eventType,
                paymentReference: transaction.id,
                status: 'FAILED',
                error: `Amount mismatch. Expected: ${normalizedStoredAmount}, Received: ${normalizedEventAmount}`,
            });
            alert_service_1.alertService.raiseAlert({
                type: 'WEBHOOK_FAILURE',
                severity: 'HIGH',
                message: `Payment amount mismatch for transaction ${transaction.id}`,
                details: { expected: normalizedStoredAmount, received: normalizedEventAmount, gatewayId },
            }).catch(console.error);
            const err = new Error(`Payment amount mismatch. Expected: ${normalizedStoredAmount}, Webhook reported: ${normalizedEventAmount}. Wallet credit aborted.`);
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
            alert_service_1.alertService.raiseAlert({
                type: 'WEBHOOK_FAILURE',
                severity: 'HIGH',
                message: `Payment currency mismatch for transaction ${transaction.id}`,
                details: { expected: transaction.currency, received: event.currency, gatewayId },
            }).catch(console.error);
            const err = new Error(`Payment currency mismatch. Expected: ${transaction.currency}, Webhook reported: ${event.currency}. Wallet credit aborted.`);
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
            alert_service_1.alertService.raiseAlert({
                type: 'WEBHOOK_FAILURE',
                severity: 'HIGH',
                message: `Invalid payment state transition for transaction ${transaction.id}`,
                details: { currentStatus: transaction.status, attemptedTransition: 'SUCCESS', gatewayId },
            }).catch(console.error);
            const err = new Error('Cannot transition terminal FAILED payment to SUCCESS');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        // 7. ATOMIC EXECUTION: Update payment status and credit wallet inside ONE database transaction
        return (0, client_1.withTransaction)(async (tx) => {
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
            if (event.eventType === 'payment.succeeded') {
                // Mark payment transaction SUCCESS
                await this.txRepo.updateStatus(lockedTx.id, {
                    status: 'SUCCESS',
                    completedAt: new Date(),
                }, tx);
                // Atomically credit central customer wallet using existing Phase 4 wallet service
                await this.walletService.creditWallet({
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
                }, tx);
                // Record webhook event as PROCESSED in the same atomic transaction
                await this.webhookEventRepo.create({
                    gateway: gatewayId,
                    gatewayEventId: event.gatewayEventId,
                    eventType: event.eventType,
                    paymentReference: lockedTx.id,
                    status: 'PROCESSED',
                }, tx);
                return {
                    success: true,
                    status: 'PROCESSED',
                    message: 'Payment verified and central customer wallet credited atomically',
                    paymentTransactionId: lockedTx.id,
                };
            }
            else if (event.eventType === 'payment.failed') {
                await this.txRepo.updateStatus(lockedTx.id, {
                    status: 'FAILED',
                    failureReason: 'Payment gateway reported failed transaction',
                }, tx);
                await this.webhookEventRepo.create({
                    gateway: gatewayId,
                    gatewayEventId: event.gatewayEventId,
                    eventType: event.eventType,
                    paymentReference: lockedTx.id,
                    status: 'PROCESSED',
                }, tx);
                return {
                    success: true,
                    status: 'PROCESSED',
                    message: 'Payment marked as FAILED; no wallet credit applied',
                    paymentTransactionId: lockedTx.id,
                };
            }
            else {
                // Other events (e.g. cancelled)
                await this.txRepo.updateStatus(lockedTx.id, {
                    status: 'CANCELLED',
                    failureReason: `Payment event: ${event.eventType}`,
                }, tx);
                await this.webhookEventRepo.create({
                    gateway: gatewayId,
                    gatewayEventId: event.gatewayEventId,
                    eventType: event.eventType,
                    paymentReference: lockedTx.id,
                    status: 'PROCESSED',
                }, tx);
                return {
                    success: true,
                    status: 'PROCESSED',
                    message: `Payment marked as CANCELLED; no wallet credit applied`,
                    paymentTransactionId: lockedTx.id,
                };
            }
        });
    }
    /**
     * Retrieves single payment transaction for customer with IDOR protection.
     */
    async getPaymentById(paymentId, currentUserId) {
        const tx = await this.txRepo.findById(paymentId);
        if (!tx) {
            const err = new Error('Payment transaction not found');
            err.statusCode = 404;
            err.name = 'NotFound';
            throw err;
        }
        if (tx.userId !== currentUserId) {
            const err = new Error('Access denied: you do not have permission to view this payment');
            err.statusCode = 403;
            err.name = 'Forbidden';
            throw err;
        }
        return this.toSafePaymentTransaction(tx);
    }
    /**
     * Retrieves paginated payment history for an authenticated customer.
     */
    async getPaymentHistory(userId, page = 1, limit = 20) {
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
    async getAdminPayments(options) {
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
    async getAdminPaymentById(paymentId) {
        const tx = await this.txRepo.findById(paymentId);
        if (!tx) {
            const err = new Error('Payment transaction not found');
            err.statusCode = 404;
            err.name = 'NotFound';
            throw err;
        }
        return this.toSafePaymentTransaction(tx);
    }
    toSafePaymentTransaction(tx) {
        return {
            id: tx.id,
            userId: tx.userId,
            walletId: tx.walletId,
            gateway: tx.gateway,
            gatewayPaymentId: tx.gatewayPaymentId,
            gatewayOrderId: tx.gatewayOrderId,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
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
exports.PaymentTransactionService = PaymentTransactionService;
exports.paymentTransactionService = new PaymentTransactionService();
