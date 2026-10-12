import {
  PaymentIntentResult,
  WebhookVerificationResult,
} from '../payment.types';

export interface CreateGatewayPaymentParams {
  transactionId: string;
  amount: string; // 2-decimal string format
  currency: string;
  userId: string;
  purpose: string;
  metadata?: Record<string, any>;
}

export interface VerifyPaymentResult {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amount: string;
  currency: string;
}

export interface RefundGatewayPaymentParams {
  gatewayPaymentId: string;
  amount: string;
  currency: string;
  reason?: string;
}

export interface RefundGatewayPaymentResult {
  gatewayRefundId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface FetchPaymentDetailsResult {
  id: string;
  orderId: string;
  status: string;
  amount: string;
  currency: string;
  captured: boolean;
}

/**
 * Universal Payment Gateway Interface.
 *
 * Ensures all gateways (Razorpay, Stripe, Mock/Development, etc.)
 * conform to a normalized contract so wallet, auth, and marketplace core
 * remain completely agnostic of gateway-specific fields and data models.
 */
export interface IPaymentGateway {
  readonly gatewayId: string;

  /**
   * Initializes or registers a payment with the upstream gateway.
   */
  createPayment(params: CreateGatewayPaymentParams): Promise<PaymentIntentResult>;

  /**
   * Cryptographically verifies an incoming webhook payload using raw bytes and signatures.
   */
  verifyWebhook(request: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: Buffer | string;
  }): Promise<WebhookVerificationResult>;

  /**
   * Directly queries gateway API for transaction status (for reconciliation).
   */
  verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult>;

  /**
   * Verifies standard checkout payment callback signature using HMAC-SHA256.
   */
  verifyPaymentSignature?(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<boolean>;

  /**
   * Fetches authoritative payment details directly from gateway API.
   */
  fetchPaymentDetails?(paymentId: string): Promise<FetchPaymentDetailsResult>;

  /**
   * Optional refund capability.
   */
  refundPayment?(params: RefundGatewayPaymentParams): Promise<RefundGatewayPaymentResult>;
}
