import crypto from 'crypto';
import {
  IPaymentGateway,
  CreateGatewayPaymentParams,
  VerifyPaymentResult,
  RefundGatewayPaymentParams,
  RefundGatewayPaymentResult,
} from '../interfaces/IPaymentGateway';
import {
  PaymentIntentResult,
  WebhookVerificationResult,
  NormalizedWebhookEvent,
} from '../payment.types';

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
export class DevelopmentPaymentGateway implements IPaymentGateway {
  readonly gatewayId = 'dev-gateway';
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || 'dev-webhook-secret-placeholder';
  }

  private assertNonProduction(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Critical Security Violation: DevelopmentPaymentGateway cannot be used in production environment.'
      );
    }
  }

  /**
   * Creates a mock/test payment intent.
   */
  async createPayment(params: CreateGatewayPaymentParams): Promise<PaymentIntentResult> {
    this.assertNonProduction();
    const gatewayPaymentId = `dev_pay_${params.transactionId.replace(/-/g, '').slice(0, 16)}`;
    const gatewayOrderId = `dev_ord_${Date.now()}`;

    return {
      gatewayPaymentId,
      gatewayOrderId,
      checkoutUrl: `https://checkout.example-gateway.test/pay/${gatewayPaymentId}`,
      clientSecret: `dev_sec_${crypto.randomBytes(16).toString('hex')}`,
      metadata: {
        env: 'development-test-adapter',
        testNote: 'DEVELOPMENT/TEST ONLY - NOT A REAL PAYMENT',
      },
    };
  }

  /**
   * Cryptographically verifies incoming webhook payload.
   * Expects 'x-webhook-signature' or 'x-signature' containing HMAC-SHA256 hex digest.
   * Optional 'x-webhook-timestamp' for replay protection (5 minute window).
   */
  async verifyWebhook(request: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: Buffer | string;
  }): Promise<WebhookVerificationResult> {
    this.assertNonProduction();
    const rawBuffer = Buffer.isBuffer(request.rawBody)
      ? request.rawBody
      : Buffer.from(request.rawBody || '', 'utf8');

    if (rawBuffer.length === 0) {
      return { isValid: false, error: 'Empty raw webhook body' };
    }

    const signatureHeader =
      request.headers['x-webhook-signature'] ||
      request.headers['x-signature'] ||
      request.headers['x-dev-signature'];

    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    if (!signature) {
      return { isValid: false, error: 'Missing required webhook signature header (x-webhook-signature)' };
    }

    // Optional replay protection if timestamp provided
    const timestampHeader =
      request.headers['x-webhook-timestamp'] || request.headers['x-timestamp'];
    const timestampStr = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;
    if (timestampStr) {
      const eventTimestamp = Number(timestampStr);
      const now = Math.floor(Date.now() / 1000);
      // Reject if older than 5 minutes (300s) or in future > 60s
      if (isNaN(eventTimestamp) || now - eventTimestamp > 300 || eventTimestamp - now > 60) {
        return { isValid: false, error: 'Webhook event timestamp outside acceptable replay window' };
      }
    }

    // Compute HMAC-SHA256 signature
    let expectedSignature: string;
    if (timestampStr) {
      // If timestamp provided, sign timestamp.rawBody
      expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(`${timestampStr}.${rawBuffer.toString('utf8')}`)
        .digest('hex');
    } else {
      expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(rawBuffer)
        .digest('hex');
    }

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length) {
      return { isValid: false, error: 'Invalid webhook signature length' };
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { isValid: false, error: 'Cryptographic signature mismatch' };
    }

    // Parse verified payload
    try {
      const payload = JSON.parse(rawBuffer.toString('utf8'));
      if (!payload.event || !payload.data) {
        return { isValid: false, error: 'Malformed webhook payload structure' };
      }

      const normalizedEvent: NormalizedWebhookEvent = {
        gatewayEventId: payload.event_id || payload.id || `evt_${Date.now()}`,
        eventType: payload.event,
        gatewayPaymentId: payload.data.payment_id || payload.data.id,
        amount: payload.data.amount,
        currency: payload.data.currency || 'INR',
        rawPayload: payload,
      };

      return {
        isValid: true,
        event: normalizedEvent,
      };
    } catch (parseError: any) {
      return { isValid: false, error: 'Failed to parse verified webhook JSON body' };
    }
  }

  /**
   * Direct verification/query for background reconciliation.
   */
  async verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult> {
    // In dev adapter, payments are assumed successful for status check
    return {
      status: 'SUCCESS',
      amount: '0.00',
      currency: 'INR',
    };
  }

  /**
   * Development refund implementation.
   */
  async refundPayment(params: RefundGatewayPaymentParams): Promise<RefundGatewayPaymentResult> {
    return {
      gatewayRefundId: `dev_rfnd_${Date.now()}`,
      status: 'SUCCESS',
    };
  }

  /**
   * Helper to sign a payload (for unit testing and verification).
   */
  signPayload(rawBody: string, timestamp?: number): { signature: string; timestamp?: string } {
    if (timestamp !== undefined) {
      const signature = crypto
        .createHmac('sha256', this.secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');
      return { signature, timestamp: timestamp.toString() };
    }

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(Buffer.from(rawBody, 'utf8'))
      .digest('hex');
    return { signature };
  }
}
