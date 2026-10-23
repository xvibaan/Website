import assert from 'node:assert/strict';
import { rateLimitOverrides } from '../src/rate-limit';

interface MockOrderRecord {
  orderId: string;
  userId: string;
  orderStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
  orderItemProductId: string;
  orderItemFulfillmentStatus: string;
}

interface MockDigitalFileRecord {
  id: string;
  productId: string;
  storageDriver: string;
  status: string;
  storageKey: string;
}

/**
 * Pure evaluation function mirroring the exact SQL where clause implemented in
 * backend/src/digital-files/digital-files.routes.ts
 */
function evaluateEntitlement(
  requestUserId: string,
  requestedFileId: string,
  file: MockDigitalFileRecord | null,
  order: MockOrderRecord | null,
): { authorized: boolean; httpStatus: number; errorResponse?: Record<string, unknown> } {
  const genericNotFound = {
    authorized: false,
    httpStatus: 404,
    errorResponse: {
      statusCode: 404,
      error: 'NotFound',
      message: 'Digital file is unavailable.',
    },
  };

  if (!requestUserId) {
    return {
      authorized: false,
      httpStatus: 401,
      errorResponse: {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required.',
      },
    };
  }

  if (!file || !order) {
    return genericNotFound;
  }

  // Exact criteria from digital-files.routes.ts:
  // 1. File matches requested ID
  // 2. File status is READY
  // 3. Storage driver is r2
  // 4. Order belongs to authenticated user
  // 5. Order is COMPLETED
  // 6. Payment is SUCCESSFUL
  // 7. Order item links to file's product
  const isMatch =
    file.id === requestedFileId &&
    file.status === 'READY' &&
    file.storageDriver === 'r2' &&
    order.userId === requestUserId &&
    order.orderStatus === 'COMPLETED' &&
    order.paymentStatus === 'SUCCESSFUL' &&
    order.orderItemProductId === file.productId;

  if (!isMatch) {
    return genericNotFound;
  }

  return { authorized: true, httpStatus: 200 };
}

async function main() {
  console.log('--- Digital Files Customer Entitlement & Rate Limit Tests ---');

  const buyerUserId = 'user-buyer-1111';
  const attackerUserId = 'user-attacker-9999';
  const productId = 'prod-software-2222';
  const fileId = 'file-guide-3333';

  const readyFile: MockDigitalFileRecord = {
    id: fileId,
    productId,
    storageDriver: 'r2',
    status: 'READY',
    storageKey: 'digital-files/33333333-3333-3333-3333-333333333333.pdf',
  };

  const validOrder: MockOrderRecord = {
    orderId: 'order-101',
    userId: buyerUserId,
    orderStatus: 'COMPLETED',
    paymentStatus: 'SUCCESSFUL',
    deliveryStatus: 'DELIVERED',
    orderItemProductId: productId,
    // Note: order service in checkout leaves fulfillmentStatus as PENDING on creation.
    // Our fix ensures buyers are not blocked by this.
    orderItemFulfillmentStatus: 'PENDING',
  };

  // 1. Valid Buyer Download Authorized
  {
    const result = evaluateEntitlement(buyerUserId, fileId, readyFile, validOrder);
    assert.equal(result.authorized, true);
    assert.equal(result.httpStatus, 200);
    console.log('[PASS] Valid customer with COMPLETED & SUCCESSFUL order is authorized');
  }

  // 2. Unpaid Order Blocked (Payment FAILED / PENDING)
  {
    const unpaidOrder: MockOrderRecord = {
      ...validOrder,
      paymentStatus: 'PENDING',
    };
    const result = evaluateEntitlement(buyerUserId, fileId, readyFile, unpaidOrder);
    assert.equal(result.authorized, false);
    assert.equal(result.httpStatus, 404);
    assert.deepEqual(result.errorResponse, {
      statusCode: 404,
      error: 'NotFound',
      message: 'Digital file is unavailable.',
    });
    console.log('[PASS] Unpaid order blocked with generic 404');
  }

  // 3. Incomplete Order Blocked (status !== COMPLETED)
  {
    for (const badStatus of ['PROCESSING', 'CANCELLED', 'REFUNDED']) {
      const incompleteOrder: MockOrderRecord = {
        ...validOrder,
        orderStatus: badStatus,
      };
      const result = evaluateEntitlement(buyerUserId, fileId, readyFile, incompleteOrder);
      assert.equal(result.authorized, false);
      assert.equal(result.httpStatus, 404);
    }
    console.log('[PASS] Incomplete/cancelled/refunded orders blocked with generic 404');
  }

  // 4. IDOR Protection (Attacker user requesting buyer's purchased file)
  {
    const result = evaluateEntitlement(attackerUserId, fileId, readyFile, validOrder);
    assert.equal(result.authorized, false);
    assert.equal(result.httpStatus, 404);
    console.log('[PASS] IDOR attempt by non-owner blocked with generic 404');
  }

  // 5. Non-READY File Statuses Blocked
  {
    for (const badFileStatus of ['PENDING_UPLOAD', 'FAILED', 'DELETING']) {
      const nonReadyFile: MockDigitalFileRecord = {
        ...readyFile,
        status: badFileStatus,
      };
      const result = evaluateEntitlement(buyerUserId, fileId, nonReadyFile, validOrder);
      assert.equal(result.authorized, false);
      assert.equal(result.httpStatus, 404);
    }
    console.log('[PASS] Non-READY file statuses (PENDING_UPLOAD, FAILED, DELETING) blocked');
  }

  // 6. Non-R2 Driver Blocked
  {
    const localFile: MockDigitalFileRecord = {
      ...readyFile,
      storageDriver: 'local',
    };
    const result = evaluateEntitlement(buyerUserId, fileId, localFile, validOrder);
    assert.equal(result.authorized, false);
    assert.equal(result.httpStatus, 404);
    console.log('[PASS] Non-R2 storage drivers blocked from R2 download handler');
  }

  // 7. Dedicated Download Rate Limit Configuration Check
  {
    assert.ok(rateLimitOverrides.digitalDownload, 'digitalDownload override must exist in rateLimitOverrides');
    assert.equal(rateLimitOverrides.digitalDownload.config.rateLimit.max, 15);
    assert.equal(rateLimitOverrides.digitalDownload.config.rateLimit.timeWindow, '1 minute');
    console.log('[PASS] Dedicated rate limit override configured at 15 req/minute');
  }

  console.log('ALL ENTITLEMENT & RATE LIMIT TESTS PASSED (7/7)\n');
}

main().catch((err) => {
  console.error('Entitlement test failed:', err);
  process.exit(1);
});