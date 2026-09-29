import { PaymentTransactionRepository, WebhookEventRepository, PaymentRefundRepository } from '../../db/repositories';
import { PaymentTransaction } from '../../db/schema/payment-transactions';
import { WalletService } from '../../wallet/wallet.service';
import { PaymentGatewayHub } from './PaymentGatewayHub';
import { WebhookVerificationService } from './WebhookVerificationService';
import { CreatePaymentParams, SafePaymentTransaction, ProcessWebhookResult } from '../payment.types';
export declare class PaymentTransactionService {
    private txRepo;
    private webhookEventRepo;
    private refundRepo;
    private walletService;
    private gatewayHub;
    private webhookService;
    constructor(txRepo?: PaymentTransactionRepository, webhookEventRepo?: WebhookEventRepository, refundRepo?: PaymentRefundRepository, walletSvc?: WalletService, hub?: PaymentGatewayHub, webhookSvc?: WebhookVerificationService);
    /**
     * Initializes a customer wallet recharge payment transaction.
     * Enforces server-side authoritative amount, idempotency, and central wallet association.
     */
    createWalletRechargePayment(params: CreatePaymentParams): Promise<{
        paymentTransaction: SafePaymentTransaction;
        checkoutUrl?: string;
        clientSecret?: string;
        gatewayOrderId?: string;
    }>;
    /**
     * Processes an incoming payment gateway webhook with cryptographic verification,
     * duplicate protection, amount validation, and atomic wallet crediting.
     */
    processWebhook(gatewayId: string, headers: Record<string, string | string[] | undefined>, rawBody: Buffer | string): Promise<ProcessWebhookResult>;
    /**
     * Retrieves single payment transaction for customer with IDOR protection.
     */
    getPaymentById(paymentId: string, currentUserId: string): Promise<SafePaymentTransaction>;
    /**
     * Retrieves paginated payment history for an authenticated customer.
     */
    getPaymentHistory(userId: string, page?: number, limit?: number): Promise<{
        transactions: SafePaymentTransaction[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Administrative listing of payment transactions.
     */
    getAdminPayments(options: {
        page?: number;
        limit?: number;
        status?: string;
        userId?: string;
    }): Promise<{
        transactions: SafePaymentTransaction[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Administrative retrieval of single payment transaction.
     */
    getAdminPaymentById(paymentId: string): Promise<SafePaymentTransaction>;
    toSafePaymentTransaction(tx: PaymentTransaction): SafePaymentTransaction;
}
export declare const paymentTransactionService: PaymentTransactionService;
