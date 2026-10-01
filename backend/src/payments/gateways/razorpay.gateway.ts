import crypto from 'crypto';
import Razorpay from 'razorpay';
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

export class RazorpayPaymentGateway implements IPaymentGateway {
  readonly gatewayId = 'razorpay';
  private razorpay: Razorpay;
  private webhookSecret: string;

  constructor() {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!key_id || !key_secret || !webhookSecret) {
      throw new Error('CRITICAL CONFIGURATION ERROR: Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET) are missing.');
    }

    this.razorpay = new Razorpay({
      key_id,
      key_secret,
    });
    this.webhookSecret = webhookSecret;
  }

  async createPayment(params: CreateGatewayPaymentParams): Promise<PaymentIntentResult> {
    if (params.currency === 'USDT') {
      throw new Error('Currency USDT is not supported by Razorpay checkout flow.');
    }

    // Razorpay expects amount in subunits (paise)
    // params.amount is a string formatted as a standard 2-decimal money string, e.g., "10.00"
    const amountInPaise = Math.round(parseFloat(params.amount) * 100);

    const orderOptions = {
      amount: amountInPaise,
      currency: params.currency, // e.g. "INR"
      receipt: params.transactionId,
      notes: {
        userId: params.userId,
        purpose: params.purpose,
        ...params.metadata,
      }
    };

    try {
      const order = await this.razorpay.orders.create(orderOptions);

      return {
        gatewayPaymentId: order.id, // we store razorpay order id as gatewayPaymentId/orderId
        gatewayOrderId: order.id,
        checkoutUrl: undefined, // Client handles checkout with SDK
        clientSecret: undefined, // Client handles via key_id and order_id
        metadata: {
          razorpay_order_id: order.id
        },
      };
    } catch (error: any) {
      console.error('Razorpay SDK Error:', error);
      const msg = error?.error?.description || error.message || JSON.stringify(error);
      throw new Error(`Razorpay create payment failed: ${msg}`);
    }
  }

  async verifyWebhook(request: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: Buffer | string;
  }): Promise<WebhookVerificationResult> {
    const rawBuffer = Buffer.isBuffer(request.rawBody)
      ? request.rawBody
      : Buffer.from(request.rawBody || '', 'utf8');

    if (rawBuffer.length === 0) {
      return { isValid: false, error: 'Empty raw webhook body' };
    }

    const signatureHeader = request.headers['x-razorpay-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    if (!signature) {
      return { isValid: false, error: 'Missing required webhook signature header (x-razorpay-signature)' };
    }

    // Compute HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBuffer)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { isValid: false, error: 'Cryptographic signature mismatch' };
    }

    // Parse verified payload
    try {
      const payload = JSON.parse(rawBuffer.toString('utf8'));
      
      let amountString = '0.00';
      if (payload.payload?.payment?.entity?.amount) {
        amountString = (payload.payload.payment.entity.amount / 100).toFixed(2);
      }
      
      const currency = payload.payload?.payment?.entity?.currency || 'INR';

      // Ensure we extract the gatewayPaymentId safely. Razorpay webhook for order.paid gives us the order_id in payment entity.
      const orderId = payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id;

      if (!orderId) {
        return { isValid: false, error: 'No order_id found in webhook payload' };
      }

      const normalizedEvent: NormalizedWebhookEvent = {
        gatewayEventId: payload.id || `evt_${Date.now()}`,
        eventType: payload.event,
        gatewayPaymentId: orderId, // Our database tracks gateway_payment_id as the razorpay order_id created during createPayment
        amount: amountString,
        currency: currency,
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

  async verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult> {
    try {
      const order = await this.razorpay.orders.fetch(gatewayPaymentId);
      
      let status: VerifyPaymentResult['status'] = 'PENDING';
      if (order.status === 'paid') {
        status = 'SUCCESS';
      } else if (order.status === 'created' || order.status === 'attempted') {
        status = 'PENDING';
      }

      return {
        status,
        amount: (Number(order.amount) / 100).toFixed(2),
        currency: order.currency || 'INR',
      };
    } catch (error: any) {
      throw new Error(`Razorpay verify payment failed: ${error.message || 'Unknown error'}`);
    }
  }

  async refundPayment(params: RefundGatewayPaymentParams): Promise<RefundGatewayPaymentResult> {
    const amountInPaise = Math.round(parseFloat(params.amount) * 100);
    try {
      // In razorpay, refunds are typically created against a specific payment_id, not order_id.
      // But gatewayPaymentId in our system currently holds the order_id.
      // Fetch the payments for this order first to refund them.
      const payments = await this.razorpay.orders.fetchPayments(params.gatewayPaymentId);
      const successfulPayment = payments.items.find(p => p.status === 'captured');
      
      if (!successfulPayment) {
        throw new Error('No captured payment found for this order to refund');
      }

      const refund = await this.razorpay.payments.refund(successfulPayment.id, {
        amount: amountInPaise,
        notes: {
          reason: params.reason || ''
        }
      });

      return {
        gatewayRefundId: refund.id,
        status: refund.status === 'processed' ? 'SUCCESS' : 'PENDING',
      };
    } catch (error: any) {
      throw new Error(`Razorpay refund failed: ${error.message || 'Unknown error'}`);
    }
  }
}
