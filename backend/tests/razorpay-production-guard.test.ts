import assert from 'node:assert/strict';
import { RazorpayPaymentGateway } from '../src/payments/gateways/razorpay.gateway';

async function main() {
  const original = {
    NODE_ENV: process.env.NODE_ENV,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  };

  try {
    process.env.NODE_ENV = 'production';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_guard_unit';
    process.env.RAZORPAY_KEY_SECRET = 'unit_test_secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'unit_test_webhook_secret';

    const gateway = new RazorpayPaymentGateway();

    const operations: Array<[string, () => Promise<unknown>]> = [
      ['createPayment', () => gateway.createPayment({
        transactionId: 'test-transaction',
        amount: '1.00',
        currency: 'INR',
        userId: 'test-user',
        purpose: 'wallet_recharge',
      })],
      ['verifyWebhook', () => gateway.verifyWebhook({
        headers: {},
        rawBody: Buffer.from('{}'),
      })],
      ['verifyPayment', () => gateway.verifyPayment('order_test_guard')],
      ['verifyPaymentSignature', () => gateway.verifyPaymentSignature({
        orderId: 'order_test_guard',
        paymentId: 'pay_test_guard',
        signature: 'test_signature',
      })],
      ['fetchPaymentDetails', () => gateway.fetchPaymentDetails('pay_test_guard')],
      ['refundPayment', () => gateway.refundPayment({
        gatewayPaymentId: 'order_test_guard',
        amount: '1.00',
        currency: 'INR',
      })],
    ];

    for (const [name, operation] of operations) {
      await assert.rejects(
        operation(),
        (error: unknown) => {
          const e = error as { statusCode?: number; name?: string };
          return e.statusCode === 503 && e.name === 'ServiceUnavailable';
        },
        `${name} must fail closed in production with a Test Mode key`,
      );

      console.log(`[PASS] ${name} blocked with HTTP 503`);
    }

    console.log(`ALL GUARD TESTS PASSED: ${operations.length}`);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
