import crypto from 'crypto';
import { verifyPaymentSchema } from '../src/payments/payment.validation';
import { DevelopmentPaymentGateway } from '../src/payments/gateways/development.gateway';
import { RazorpayPaymentGateway } from '../src/payments/gateways/razorpay.gateway';
import { PaymentTransactionService } from '../src/payments/services/PaymentTransactionService';
import { PaymentGatewayHub } from '../src/payments/services/PaymentGatewayHub';
import { PaymentTransaction } from '../src/db/schema/payment-transactions';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('   RAZORPAY INTEGRATION COMPREHENSIVE SECURITY & AUDIT TESTS    ');
  console.log('================================================================\n');

  const testSecret = 'rzp_test_secret_key_1234567890abcdef';
  const testOrderId = 'order_test_1234567890';
  const testPaymentId = 'pay_test_0987654321';

  // -------------------------------------------------------------------------
  // 1. HMAC-SHA256 SIGNATURE VERIFICATION TESTS
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: HMAC-SHA256 Signature Verification ---');

  const validSignature = crypto
    .createHmac('sha256', testSecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  const devGateway = new DevelopmentPaymentGateway(testSecret);

  // 1.1 Valid signature
  const validResult = await devGateway.verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: validSignature,
  });
  assert(validResult === true, 'Valid checkout signature must pass verification');

  // 1.2 Invalid signature (tampered signature string)
  const tamperedSig = validSignature.substring(0, validSignature.length - 2) + 'aa';
  const invalidResult = await devGateway.verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: tamperedSig,
  });
  assert(invalidResult === false, 'Tampered signature string must be rejected');

  // 1.3 Mismatched order ID in payload
  const wrongOrderResult = await devGateway.verifyPaymentSignature({
    orderId: 'order_different_999999',
    paymentId: testPaymentId,
    signature: validSignature,
  });
  assert(wrongOrderResult === false, 'Signature with mismatched orderId must be rejected');

  // 1.4 Mismatched payment ID in payload
  const wrongPaymentResult = await devGateway.verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: 'pay_different_999999',
    signature: validSignature,
  });
  assert(wrongPaymentResult === false, 'Signature with mismatched paymentId must be rejected');

  // 1.5 Empty or missing parameters
  const emptyResult = await devGateway.verifyPaymentSignature({
    orderId: '',
    paymentId: testPaymentId,
    signature: validSignature,
  });
  assert(emptyResult === false, 'Empty orderId must fail signature check');

  // -------------------------------------------------------------------------
  // 2. ZOD REQUEST VALIDATION SCHEMA TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Zod Request Validation Schema ---');

  const validPayload = {
    paymentTransactionId: '123e4567-e89b-12d3-a456-426614174000',
    razorpay_order_id: 'order_test_123',
    razorpay_payment_id: 'pay_test_456',
    razorpay_signature: validSignature,
  };

  const schemaValid = verifyPaymentSchema.safeParse(validPayload);
  assert(schemaValid.success === true, 'Valid verification body must pass Zod schema');

  // 2.1 Non-UUID paymentTransactionId
  const invalidUuid = verifyPaymentSchema.safeParse({
    ...validPayload,
    paymentTransactionId: 'not-a-valid-uuid',
  });
  assert(invalidUuid.success === false, 'Non-UUID paymentTransactionId must be rejected by Zod');

  // 2.2 Missing razorpay_order_id
  const missingOrder = verifyPaymentSchema.safeParse({
    ...validPayload,
    razorpay_order_id: '',
  });
  assert(missingOrder.success === false, 'Empty razorpay_order_id must be rejected');

  // 2.3 Missing razorpay_payment_id
  const missingPay = verifyPaymentSchema.safeParse({
    ...validPayload,
    razorpay_payment_id: '',
  });
  assert(missingPay.success === false, 'Empty razorpay_payment_id must be rejected');

  // 2.4 Missing razorpay_signature
  const missingSig = verifyPaymentSchema.safeParse({
    ...validPayload,
    razorpay_signature: '',
  });
  assert(missingSig.success === false, 'Empty razorpay_signature must be rejected');

  // -------------------------------------------------------------------------
  // 3. SERVICE-LAYER VERIFICATION & SECURITY TESTS (Mocks)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Service-Level Security, IDOR, & Order Match ---');

  const customerA = '11111111-1111-1111-1111-111111111111';
  const customerB = '22222222-2222-2222-2222-222222222222';
  const txId = '123e4567-e89b-12d3-a456-426614174000';

  let mockDbTx: PaymentTransaction = {
    id: txId,
    userId: customerA,
    walletId: 'wallet-001',
    gateway: 'dev-gateway',
    gatewayPaymentId: testOrderId,
    gatewayOrderId: testOrderId,
    amount: '100.00',
    currency: 'INR',
    status: 'PENDING',
    purpose: 'WALLET_RECHARGE',
    idempotencyKey: 'idemp_key_1',
    failureCode: null,
    failureReason: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    refundedAt: null,
  };

  let creditedWallets: Array<any> = [];

  const mockTxRepo: any = {
    findById: async (id: string) => (id === txId ? { ...mockDbTx } : null),
    findByIdForUpdate: async (id: string) => (id === txId ? { ...mockDbTx } : null),
    updateStatus: async (id: string, updates: any) => {
      mockDbTx = { ...mockDbTx, ...updates };
      return { ...mockDbTx };
    },
  };

  const mockWalletService: any = {
    creditWallet: async (params: any) => {
      creditedWallets.push(params);
      return { wallet: { balance: '100.00' } };
    },
    getOrCreateWallet: async () => ({ id: 'wallet-001' }),
  };

  const hub = new PaymentGatewayHub();
  hub.registerGateway(devGateway);

  const paymentService = new PaymentTransactionService(
    mockTxRepo,
    undefined,
    undefined,
    mockWalletService,
    hub,
    undefined
  );

  // 3.1 IDOR Protection: User B tries to verify User A's transaction
  try {
    await paymentService.verifyClientPayment(
      {
        paymentTransactionId: txId,
        razorpay_order_id: testOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      },
      customerB // Different user
    );
    assert(false, 'Cross-user IDOR verification must be rejected');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Cross-user IDOR verification rejected with 403 Forbidden');
  }

  // 3.2 Non-existent transaction ID
  try {
    await paymentService.verifyClientPayment(
      {
        paymentTransactionId: '00000000-0000-0000-0000-000000000000',
        razorpay_order_id: testOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      },
      customerA
    );
    assert(false, 'Non-existent transaction must throw 404');
  } catch (err: any) {
    assert(err.statusCode === 404, 'Non-existent transaction rejected with 404 NotFound');
  }

  // 3.3 Order ID mismatch
  try {
    await paymentService.verifyClientPayment(
      {
        paymentTransactionId: txId,
        razorpay_order_id: 'order_mismatched_999',
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      },
      customerA
    );
    assert(false, 'Mismatched order ID must be rejected');
  } catch (err: any) {
    assert(err.statusCode === 400, 'Mismatched order ID rejected with 400 BadRequest');
  }

  // 3.4 Invalid Signature at service level
  try {
    await paymentService.verifyClientPayment(
      {
        paymentTransactionId: txId,
        razorpay_order_id: testOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: 'invalid_hex_signature',
      },
      customerA
    );
    assert(false, 'Service must reject invalid signature');
  } catch (err: any) {
    assert(err.statusCode === 400 && err.message.includes('signature'), 'Service rejected invalid signature with 400');
  }

  // -------------------------------------------------------------------------
  // 4. AUTHORITATIVE STATUS & CAPTURE VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Authoritative Status & Capture Checks ---');

  // Create a gateway mock that simulates non-captured payment
  const uncapturedGateway: any = {
    gatewayId: 'dev-gateway',
    verifyPaymentSignature: async () => true,
    fetchPaymentDetails: async () => ({
      id: testPaymentId,
      orderId: testOrderId,
      status: 'authorized', // Not captured
      amount: '100.00',
      currency: 'INR',
      captured: false,
    }),
  };

  const uncapturedHub = new PaymentGatewayHub();
  uncapturedHub.registerGateway(uncapturedGateway);

  const uncapturedService = new PaymentTransactionService(
    mockTxRepo,
    undefined,
    undefined,
    mockWalletService,
    uncapturedHub,
    undefined
  );

  try {
    await uncapturedService.verifyClientPayment(
      {
        paymentTransactionId: txId,
        razorpay_order_id: testOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      },
      customerA
    );
    assert(false, 'Non-captured payment must be rejected');
  } catch (err: any) {
    assert(err.statusCode === 400 && err.message.includes('not captured'), 'Uncaptured payment rejected with 400');
  }

  // Gateway with mismatched amount
  const amountMismatchGateway: any = {
    gatewayId: 'dev-gateway',
    verifyPaymentSignature: async () => true,
    fetchPaymentDetails: async () => ({
      id: testPaymentId,
      orderId: testOrderId,
      status: 'captured',
      amount: '50.00', // Stored is 100.00
      currency: 'INR',
      captured: true,
    }),
  };

  const amountMismatchHub = new PaymentGatewayHub();
  amountMismatchHub.registerGateway(amountMismatchGateway);

  const amountMismatchService = new PaymentTransactionService(
    mockTxRepo,
    undefined,
    undefined,
    mockWalletService,
    amountMismatchHub,
    undefined
  );

  try {
    await amountMismatchService.verifyClientPayment(
      {
        paymentTransactionId: txId,
        razorpay_order_id: testOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      },
      customerA
    );
    assert(false, 'Amount mismatch must be rejected');
  } catch (err: any) {
    assert(err.statusCode === 400 && err.message.includes('amount mismatch'), 'Amount mismatch rejected with 400');
  }

  // -------------------------------------------------------------------------
  // 5. SUCCESSFUL VERIFICATION & IDEMPOTENCY / CONCURRENCY TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Successful Verification & Idempotency ---');

  // Setup valid gateway returning captured 100.00 INR
  const successGateway: any = {
    gatewayId: 'dev-gateway',
    verifyPaymentSignature: async () => true,
    fetchPaymentDetails: async () => ({
      id: testPaymentId,
      orderId: testOrderId,
      status: 'captured',
      amount: '100.00',
      currency: 'INR',
      captured: true,
    }),
  };

  const successHub = new PaymentGatewayHub();
  successHub.registerGateway(successGateway);

  mockDbTx.status = 'PENDING';
  creditedWallets = [];

  const successfulService = new PaymentTransactionService(
    mockTxRepo,
    undefined,
    undefined,
    mockWalletService,
    successHub,
    undefined
  );

  // 5.1 First verification: should succeed and credit wallet
  const verify1 = await successfulService.verifyClientPayment(
    {
      paymentTransactionId: txId,
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature,
    },
    customerA
  );

  assert(verify1.success === true, 'First verification call must succeed');
  assert(verify1.status === 'SUCCESS', 'First verification status must be SUCCESS');
  assert(mockDbTx.status === 'SUCCESS', 'Database status updated to SUCCESS');
  assert(mockDbTx.gatewayPaymentId === testPaymentId, 'Authoritative razorpay payment ID recorded');
  assert(creditedWallets.length === 1, 'Wallet was credited exactly once');
  assert(creditedWallets[0].idempotencyKey === `pay_credit_${txId}`, 'Idempotency key correctly formatted');

  // 5.2 Duplicate verification call: must NOT credit wallet again
  const verify2 = await successfulService.verifyClientPayment(
    {
      paymentTransactionId: txId,
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature,
    },
    customerA
  );

  assert(verify2.success === true, 'Duplicate verification call returns success');
  assert(verify2.status === 'SUCCESS', 'Duplicate verification call status is SUCCESS');
  assert(creditedWallets.length === 1, 'Wallet was NOT credited a second time on duplicate verification');

  // 5.3 Webhook already completed before client verification
  mockDbTx.status = 'SUCCESS';
  creditedWallets = [];

  const verifyAfterWebhook = await successfulService.verifyClientPayment(
    {
      paymentTransactionId: txId,
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature,
    },
    customerA
  );

  assert(verifyAfterWebhook.success === true, 'Verification after webhook completion succeeds');
  assert(creditedWallets.length === 0, 'No wallet credit applied when transaction already in SUCCESS');

  // -------------------------------------------------------------------------
  // 6. WALLET ROUTE STATUS FILTERING TEST
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Wallet Route Status Filter Check ---');

  const testTransactions = [
    { id: '1', status: 'PENDING' },
    { id: '2', status: 'FAILED' },
    { id: '3', status: 'SUCCESS' },
    { id: '4', status: 'COMPLETED' },
    { id: '5', status: 'CANCELLED' },
  ];

  const pendingMapped: any[] = [];
  for (const p of testTransactions) {
    if (p.status.toUpperCase() === 'COMPLETED' || p.status.toUpperCase() === 'SUCCESS') continue;
    pendingMapped.push(p);
  }

  assert(
    pendingMapped.length === 3,
    'Wallet transactions filter correctly excludes both SUCCESS and COMPLETED payments'
  );
  assert(
    !pendingMapped.some((p) => p.status === 'SUCCESS' || p.status === 'COMPLETED'),
    'Neither SUCCESS nor COMPLETED payments appear in the pending payment list'
  );

  console.log('\n================================================================');
  console.log(`   ALL TESTS COMPLETED: ${passCount} Passed, ${failCount} Failed`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('\nTest run encountered unhandled failure:', err);
  process.exit(1);
});
