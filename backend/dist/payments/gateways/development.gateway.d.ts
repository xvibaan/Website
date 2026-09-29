import { IPaymentGateway, CreateGatewayPaymentParams, VerifyPaymentResult, RefundGatewayPaymentParams, RefundGatewayPaymentResult } from '../interfaces/IPaymentGateway';
import { PaymentIntentResult, WebhookVerificationResult } from '../payment.types';
/**
 * DEVELOPMENT/TEST ONLY — NOT FOR PRODUCTION USE
 *
 * This adapter provides a fully functional, cryptographically verified
 * reference implementation of IPaymentGateway for development, test, and
 * staging verification when production gateway credentials (e.g. Razorpay/Stripe)
 * are not configured.
 *
 * It uses HMAC-SHA256 over the exact raw body bytes to enforce strict
 * webhook signature verification and timestamp replay protection.
 */
export declare class DevelopmentPaymentGateway implements IPaymentGateway {
    readonly gatewayId = "dev-gateway";
    private secret;
    constructor(secret?: string);
    private assertNonProduction;
    /**
     * Creates a mock/test payment intent.
     */
    createPayment(params: CreateGatewayPaymentParams): Promise<PaymentIntentResult>;
    /**
     * Cryptographically verifies incoming webhook payload.
     * Expects 'x-webhook-signature' or 'x-signature' containing HMAC-SHA256 hex digest.
     * Optional 'x-webhook-timestamp' for replay protection (5 minute window).
     */
    verifyWebhook(request: {
        headers: Record<string, string | string[] | undefined>;
        rawBody: Buffer | string;
    }): Promise<WebhookVerificationResult>;
    /**
     * Direct verification/query for background reconciliation.
     */
    verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult>;
    /**
     * Development refund implementation.
     */
    refundPayment(params: RefundGatewayPaymentParams): Promise<RefundGatewayPaymentResult>;
    /**
     * Helper to sign a payload (for unit testing and verification).
     */
    signPayload(rawBody: string, timestamp?: number): {
        signature: string;
        timestamp?: string;
    };
}
