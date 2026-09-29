export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type PaymentPurpose = 'WALLET_RECHARGE';
export interface CreatePaymentParams {
    userId: string;
    amount: string;
    currency?: string;
    purpose?: PaymentPurpose;
    gateway?: string;
    idempotencyKey?: string;
    metadata?: Record<string, any>;
}
export interface SafePaymentTransaction {
    id: string;
    userId: string;
    walletId: string | null;
    gateway: string;
    gatewayPaymentId: string | null;
    gatewayOrderId: string | null;
    amount: string;
    currency: string;
    status: PaymentStatus;
    purpose: string;
    failureCode: string | null;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    refundedAt: Date | null;
}
export interface PaymentIntentResult {
    gatewayPaymentId: string;
    gatewayOrderId?: string;
    checkoutUrl?: string;
    clientSecret?: string;
    metadata?: Record<string, any>;
}
export interface NormalizedWebhookEvent {
    gatewayEventId: string;
    eventType: 'payment.succeeded' | 'payment.failed' | 'payment.cancelled' | 'refund.succeeded';
    gatewayPaymentId: string;
    amount: string;
    currency: string;
    rawPayload?: any;
}
export interface WebhookVerificationResult {
    isValid: boolean;
    error?: string;
    event?: NormalizedWebhookEvent;
}
export interface ProcessWebhookResult {
    success: boolean;
    duplicate?: boolean;
    status: 'PROCESSED' | 'IGNORED' | 'FAILED';
    message: string;
    paymentTransactionId?: string;
}
