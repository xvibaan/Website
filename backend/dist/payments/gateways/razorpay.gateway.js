"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayPaymentGateway = void 0;
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
class RazorpayPaymentGateway {
    gatewayId = 'razorpay';
    razorpay;
    webhookSecret;
    constructor() {
        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!key_id || !key_secret || !webhookSecret) {
            console.warn('Razorpay credentials missing. RazorpayPaymentGateway will fail on use if not configured.');
        }
        // We initialize it anyway so the hub can register it, but requests will fail if auth is bad
        this.razorpay = new razorpay_1.default({
            key_id: key_id || 'dummy_key',
            key_secret: key_secret || 'dummy_secret',
        });
        this.webhookSecret = webhookSecret || 'dummy_webhook_secret';
    }
    async createPayment(params) {
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
        }
        catch (error) {
            console.error('Razorpay SDK Error:', error);
            const msg = error?.error?.description || error.message || JSON.stringify(error);
            throw new Error(`Razorpay create payment failed: ${msg}`);
        }
    }
    async verifyWebhook(request) {
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
        const expectedSignature = crypto_1.default
            .createHmac('sha256', this.webhookSecret)
            .update(rawBuffer)
            .digest('hex');
        // Timing-safe comparison to prevent timing attacks
        const sigBuffer = Buffer.from(signature, 'utf8');
        const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
        if (sigBuffer.length !== expectedBuffer.length || !crypto_1.default.timingSafeEqual(sigBuffer, expectedBuffer)) {
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
            const normalizedEvent = {
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
        }
        catch (parseError) {
            return { isValid: false, error: 'Failed to parse verified webhook JSON body' };
        }
    }
    async verifyPayment(gatewayPaymentId) {
        try {
            const order = await this.razorpay.orders.fetch(gatewayPaymentId);
            let status = 'PENDING';
            if (order.status === 'paid') {
                status = 'SUCCESS';
            }
            else if (order.status === 'created' || order.status === 'attempted') {
                status = 'PENDING';
            }
            return {
                status,
                amount: (Number(order.amount) / 100).toFixed(2),
                currency: order.currency || 'INR',
            };
        }
        catch (error) {
            throw new Error(`Razorpay verify payment failed: ${error.message || 'Unknown error'}`);
        }
    }
    async refundPayment(params) {
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
        }
        catch (error) {
            throw new Error(`Razorpay refund failed: ${error.message || 'Unknown error'}`);
        }
    }
}
exports.RazorpayPaymentGateway = RazorpayPaymentGateway;
