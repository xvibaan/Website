import assert from 'node:assert/strict';
import { drizzle } from 'drizzle-orm/node-postgres';
import { S3Client } from '@aws-sdk/client-s3';
import { buildServer } from '../src/server';
import { setDbForTesting, closeDbPool } from '../src/db/client';
import { createSessionToken } from '../src/auth/session';
import { userRepository } from '../src/db/repositories/user.repository';

// Set test environment configuration
process.env.R2_ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
process.env.R2_BUCKET = 'test-digital-bucket';
process.env.R2_ACCESS_KEY_ID = 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AUTH_SECRET = 'test-secret-at-least-32-chars-long-security-token';
process.env.NODE_ENV = 'test';

// Identifiers
const ADMIN_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CUSTOMER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ATTACKER_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const DEACTIVATED_ADMIN_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_PRODUCT_ID = '99999999-9999-9999-9999-999999999999';
const FILE_ID = '22222222-2222-2222-2222-222222222222';
const FINAL_KEY = `digital-files/${FILE_ID}.pdf`;

interface FileRow {
  id: string;
  productId: string;
  storageDriver: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
}

interface OrderItemRow {
  id: number;
  orderId: number;
  productId: string;
}

interface OrderRow {
  id: number;
  userId: string;
  status: string;
  paymentStatus: string;
}

/**
 * Creates a relational mock database pool that simulates real PostgreSQL
 * execution for Drizzle queries with full join and WHERE condition evaluation.
 */
function createRelationalMockPool(dbState: {
  files: FileRow[];
  orderItems: OrderItemRow[];
  orders: OrderRow[];
  onQuery?: (sql: string, params: any[]) => void;
}) {
  return {
    connect: async () => ({
      query: async (q: any, p: any) => ({ rows: [] }),
      release: () => {},
    }),
    query: async (q: any, params: any[] = []) => {
      const sqlText: string = typeof q === 'string' ? q : q.text;

      if (dbState.onQuery) {
        dbState.onQuery(sqlText, params);
      }

      // Check product existence query:
      // select "id" from "products" where "products"."id" = $1 limit $2
      if (sqlText.includes('from "products"') && sqlText.includes('"products"."id" = $1')) {
        return { rows: [[params[0]]] };
      }

      // Insert into product_digital_files
      if (sqlText.includes('insert into "product_digital_files"')) {
        return { rows: [[FILE_ID]] };
      }

      // Update product_digital_files
      if (sqlText.includes('update "product_digital_files"')) {
        return { rows: [] };
      }

      // Delete from product_digital_files
      if (sqlText.includes('delete from "product_digital_files"')) {
        return { rows: [] };
      }

      // Customer download entitlement query:
      // select "product_digital_files"."id", ... from "product_digital_files"
      // inner join "order_items" ... inner join "orders" ... where ...
      if (
        sqlText.includes('from "product_digital_files"') &&
        sqlText.includes('inner join "order_items"') &&
        sqlText.includes('inner join "orders"')
      ) {
        const targetFileId = params[0];
        const targetFileStatus = params[1];
        const targetDriver = params[2];
        const targetUserId = params[3];
        const targetOrderStatus = params[4];
        const targetPaymentStatus = params[5];

        const matchedRows: any[] = [];

        for (const file of dbState.files) {
          if (
            file.id !== targetFileId ||
            file.status !== targetFileStatus ||
            file.storageDriver !== targetDriver
          ) {
            continue;
          }

          for (const item of dbState.orderItems) {
            if (item.productId !== file.productId) {
              continue;
            }

            for (const order of dbState.orders) {
              if (order.id !== item.orderId) {
                continue;
              }

              if (
                order.userId === targetUserId &&
                order.status === targetOrderStatus &&
                order.paymentStatus === targetPaymentStatus
              ) {
                matchedRows.push([
                  file.id,
                  file.storageKey,
                  file.storageDriver,
                  file.mimeType,
                  file.originalFilename,
                  file.status,
                ]);
              }
            }
          }
        }

        return { rows: matchedRows.slice(0, 1) };
      }

      // Fetch single file for complete/delete routes:
      // select ... from "product_digital_files" where "product_digital_files"."id" = $1 limit $2
      if (
        sqlText.includes('from "product_digital_files"') &&
        !sqlText.includes('inner join') &&
        sqlText.includes('"product_digital_files"."id" = $1')
      ) {
        const fileId = params[0];
        const matched = dbState.files.find((f) => f.id === fileId);
        if (matched) {
          return {
            rows: [
              [
                matched.id,
                matched.productId,
                matched.storageDriver,
                matched.storageKey,
                matched.originalFilename,
                matched.mimeType,
                matched.sizeBytes,
                matched.status,
                ADMIN_USER_ID,
                'test-etag',
                new Date(),
                new Date(),
                null,
              ],
            ],
          };
        }
        return { rows: [] };
      }

      // Admin product files list query:
      // select ... from "product_digital_files" where "product_digital_files"."product_id" = $1
      if (
        sqlText.includes('from "product_digital_files"') &&
        !sqlText.includes('inner join') &&
        sqlText.includes('where "product_digital_files"."product_id" = $1')
      ) {
        const productId = params[0];
        const matched = dbState.files
          .filter((f) => f.productId === productId)
          .map((f) => [
            f.id,
            f.productId,
            f.originalFilename,
            f.mimeType,
            f.sizeBytes,
            f.status,
            null, // uploadedAt
            new Date(), // createdAt
            new Date(), // updatedAt
          ]);
        return { rows: matched };
      }

      // Completed orders count query for product
      if (sqlText.includes('count(*)') && sqlText.includes('inner join "orders"')) {
        const productId = params[0];
        let count = 0;
        for (const item of dbState.orderItems) {
          if (item.productId !== productId) continue;
          for (const order of dbState.orders) {
            if (
              order.id === item.orderId &&
              order.status === 'COMPLETED' &&
              order.paymentStatus === 'SUCCESSFUL'
            ) {
              count++;
            }
          }
        }
        return { rows: [[count]] };
      }


      // Customer product entitlement verification query:
      // select "orders"."id" from "orders" inner join "order_items" on "order_items"."order_id" = "orders"."id" where ...
      if (
        sqlText.includes('from "orders"') &&
        sqlText.includes('inner join "order_items"')
      ) {
        const targetUserId = params[0];
        const targetProductId = params[1];
        const targetOrderStatus = params[2];
        const targetPaymentStatus = params[3];

        for (const order of dbState.orders) {
          if (
            order.userId === targetUserId &&
            order.status === targetOrderStatus &&
            order.paymentStatus === targetPaymentStatus
          ) {
            for (const item of dbState.orderItems) {
              if (item.orderId === order.id && item.productId === targetProductId) {
                return { rows: [[order.id]] };
              }
            }
          }
        }
        return { rows: [] };
      }

      // Customer ready files query for product:
      // select ... from "product_digital_files" where ...
      if (
        sqlText.includes('from "product_digital_files"') &&
        sqlText.includes('"product_digital_files"."status" = $2') &&
        sqlText.includes('"product_digital_files"."storage_driver" = $3')
      ) {
        const productId = params[0];
        const status = params[1];
        const driver = params[2];
        const matched = dbState.files
          .filter((f) => f.productId === productId && f.status === status && f.storageDriver === driver)
          .map((f) => [
            f.id,
            f.originalFilename,
            f.mimeType,
            f.sizeBytes,
            f.status,
          ]);
        return { rows: matched };
      }

      // Cleanup stale query
      if (sqlText.includes('from "product_digital_files"') && sqlText.includes('"status" = $1')) {
        const matched = dbState.files
          .filter((f) => f.status === 'PENDING_UPLOAD')
          .map((f) => [f.id, f.storageKey, f.storageDriver, new Date(Date.now() - 48 * 3600 * 1000)]);
        return { rows: matched };
      }

      return { rows: [] };
    },
    on: () => {},
  };
}

async function runSecurityVerification() {
  console.log('================================================================');
  console.log('  FOCUSED SECURITY VERIFICATION: FASTIFY AUTH & SQL ENTITLEMENT ');
  console.log('================================================================\n');

  // Stub S3Client to return mock presigned responses
  const originalS3Send = S3Client.prototype.send;
  S3Client.prototype.send = (async () => ({
    ETag: '"test-etag"',
    ContentLength: 1024,
    ContentType: 'application/pdf',
  })) as any;

  // Stub userRepository.findById to simulate session lookups
  const originalFindById = userRepository.findById;
  (userRepository as any).findById = async (id: string) => {
    if (id === ADMIN_USER_ID) {
      return { id, email: 'admin@example.com', role: 'admin', isActive: true };
    }
    if (id === CUSTOMER_USER_ID) {
      return { id, email: 'customer@example.com', role: 'customer', isActive: true };
    }
    if (id === ATTACKER_USER_ID) {
      return { id, email: 'attacker@example.com', role: 'customer', isActive: true };
    }
    if (id === DEACTIVATED_ADMIN_ID) {
      return { id, email: 'deactivated@example.com', role: 'admin', isActive: false };
    }
    return null;
  };

  // Generate tokens
  const adminToken = createSessionToken({
    userId: ADMIN_USER_ID,
    email: 'admin@example.com',
    role: 'admin',
    isActive: true,
  });

  const customerToken = createSessionToken({
    userId: CUSTOMER_USER_ID,
    email: 'customer@example.com',
    role: 'customer',
    isActive: true,
  });

  const attackerToken = createSessionToken({
    userId: ATTACKER_USER_ID,
    email: 'attacker@example.com',
    role: 'customer',
    isActive: true,
  });

  const deactivatedAdminToken = createSessionToken({
    userId: DEACTIVATED_ADMIN_ID,
    email: 'deactivated@example.com',
    role: 'admin',
    isActive: false,
  });

  const expiredOrInvalidToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature';

  // Initial healthy fixtures
  const validFile: FileRow = {
    id: FILE_ID,
    productId: PRODUCT_ID,
    storageDriver: 'r2',
    storageKey: FINAL_KEY,
    originalFilename: 'mastering-typescript.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    status: 'READY',
  };

  const validOrderItem: OrderItemRow = {
    id: 101,
    orderId: 5001,
    productId: PRODUCT_ID,
  };

  const validOrder: OrderRow = {
    id: 5001,
    userId: CUSTOMER_USER_ID,
    status: 'COMPLETED',
    paymentStatus: 'SUCCESSFUL',
  };

  let lastExecutedSql = '';
  let lastQueryParams: any[] = [];

  const testDbState: {
    files: FileRow[];
    orderItems: OrderItemRow[];
    orders: OrderRow[];
    onQuery: (sql: string, params: any[]) => void;
  } = {
    files: [validFile],
    orderItems: [validOrderItem],
    orders: [validOrder],
    onQuery: (sql, params) => {
      lastExecutedSql = sql;
      lastQueryParams = params;
    },
  };

  const mockPool = createRelationalMockPool(testDbState);
  const mockDrizzleDb = drizzle(mockPool as any);
  setDbForTesting(mockDrizzleDb);

  // Mount the REAL production Fastify server
  const server = buildServer();
  await server.ready();

  let passedTests = 0;

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: TRACE & TEST EVERY ADMIN DIGITAL-FILE ENDPOINT THROUGH REAL MIDDLEWARE
    // -------------------------------------------------------------------------
    console.log('--- SECTION 1: Production Fastify Plugin Chain & Admin RBAC Boundary ---');

    const adminEndpoints = [
      {
        name: 'List product files',
        method: 'GET' as const,
        url: `/api/v1/admin/digital-files/product/${PRODUCT_ID}`,
        body: undefined,
      },
      {
        name: 'Initiate file upload',
        method: 'POST' as const,
        url: '/api/v1/admin/digital-files/upload/initiate',
        body: {
          productId: PRODUCT_ID,
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        },
      },
      {
        name: 'Complete file upload',
        method: 'POST' as const,
        url: `/api/v1/admin/digital-files/${FILE_ID}/complete`,
        body: undefined,
      },
      {
        name: 'Delete digital file',
        method: 'DELETE' as const,
        url: `/api/v1/admin/digital-files/${FILE_ID}`,
        body: undefined,
      },
      {
        name: 'Cleanup stale uploads',
        method: 'POST' as const,
        url: '/api/v1/admin/digital-files/cleanup-stale',
        body: {},
      },
    ];

    for (const ep of adminEndpoints) {
      console.log(`\n  Checking Endpoint: [${ep.method}] ${ep.url} (${ep.name})`);

      // 1. Unauthenticated request (no cookie, no Authorization header)
      {
        const res = await server.inject({
          method: ep.method,
          url: ep.url,
          payload: ep.body,
        });

        assert.equal(
          res.statusCode,
          401,
          `Unauthenticated request to ${ep.url} must return 401 Unauthorized`,
        );
        const json = JSON.parse(res.body);
        assert.equal(json.error, 'Unauthorized');
        assert.equal(json.message, 'Authentication required');
        console.log(`    [PASS] Unauthenticated request blocked -> 401 Unauthorized`);
        passedTests++;
      }

      // 2. Request with invalid/expired token
      {
        const res = await server.inject({
          method: ep.method,
          url: ep.url,
          payload: ep.body,
          headers: {
            authorization: `Bearer ${expiredOrInvalidToken}`,
          },
        });

        assert.equal(
          res.statusCode,
          401,
          `Invalid token request to ${ep.url} must return 401 Unauthorized`,
        );
        const json = JSON.parse(res.body);
        assert.equal(json.error, 'Unauthorized');
        assert.equal(json.message, 'Invalid or expired session');
        console.log(`    [PASS] Invalid token blocked -> 401 Unauthorized`);
        passedTests++;
      }

      // 3. Request with deactivated admin account
      {
        const res = await server.inject({
          method: ep.method,
          url: ep.url,
          payload: ep.body,
          headers: {
            authorization: `Bearer ${deactivatedAdminToken}`,
          },
        });

        assert.equal(
          res.statusCode,
          401,
          `Deactivated user request to ${ep.url} must return 401 Unauthorized`,
        );
        const json = JSON.parse(res.body);
        assert.equal(json.error, 'Unauthorized');
        assert.equal(json.message, 'Account is deactivated or no longer exists');
        console.log(`    [PASS] Deactivated user blocked -> 401 Unauthorized`);
        passedTests++;
      }

      // 4. Request with non-admin / customer role ('customer')
      {
        const res = await server.inject({
          method: ep.method,
          url: ep.url,
          payload: ep.body,
          headers: {
            authorization: `Bearer ${customerToken}`,
          },
        });

        assert.equal(
          res.statusCode,
          403,
          `Customer role request to ${ep.url} must return 403 Forbidden`,
        );
        const json = JSON.parse(res.body);
        assert.equal(json.error, 'Forbidden');
        assert.equal(
          json.message,
          'Insufficient permissions to access this resource',
        );
        console.log(`    [PASS] Non-admin (customer) blocked -> 403 Forbidden`);
        passedTests++;
      }

      // 5. Request with authenticated admin role ('admin') passes through middleware chain
      {
        const res = await server.inject({
          method: ep.method,
          url: ep.url,
          payload: ep.body,
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        });

        // The request passed authentication and authorization (not 401 and not 403)
        assert.notEqual(
          res.statusCode,
          401,
          `Admin request to ${ep.url} must not return 401`,
        );
        assert.notEqual(
          res.statusCode,
          403,
          `Admin request to ${ep.url} must not return 403`,
        );
        console.log(
          `    [PASS] Authenticated admin allowed past auth/RBAC chain (HTTP ${res.statusCode})`,
        );
        passedTests++;
      }
    }

    // -------------------------------------------------------------------------
    // SECTION 2: CUSTOMER DOWNLOAD SQL JOINS & RELATIONAL QUERY VERIFICATION
    // -------------------------------------------------------------------------
    console.log(
      '\n--- SECTION 2: Customer Download SQL Joins, Conditions & Entitlement ---',
    );

    // 2.1 SQL Structure and Parameter Verification
    {
      testDbState.files = [validFile];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [validOrder];

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/${FILE_ID}/download`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 200, 'Legitimate buyer must receive 200 OK');
      const body = JSON.parse(res.body);
      assert.equal(body.success, true);
      assert.equal(body.fileId, FILE_ID);
      assert.ok(
        res.headers['cache-control']?.includes('no-store'),
        'Must include no-store Cache-Control header',
      );

      // Verify exact SQL compiled by Drizzle ORM
      assert.ok(
        lastExecutedSql.includes('inner join "order_items" on "order_items"."product_id" = "product_digital_files"."product_id"'),
        'SQL must inner join order_items on productId',
      );
      assert.ok(
        lastExecutedSql.includes('inner join "orders" on "orders"."id" = "order_items"."order_id"'),
        'SQL must inner join orders on orderId',
      );
      assert.ok(
        lastExecutedSql.includes('"orders"."user_id" = $4'),
        'SQL must enforce orders.user_id = request.user.userId',
      );
      assert.ok(
        lastExecutedSql.includes('"orders"."status" = $5'),
        'SQL must enforce orders.status = COMPLETED',
      );
      assert.ok(
        lastExecutedSql.includes('"orders"."payment_status" = $6'),
        'SQL must enforce orders.payment_status = SUCCESSFUL',
      );
      assert.ok(
        lastExecutedSql.includes('"product_digital_files"."status" = $2'),
        'SQL must enforce product_digital_files.status = READY',
      );
      assert.ok(
        lastExecutedSql.includes('"product_digital_files"."storage_driver" = $3'),
        'SQL must enforce storage_driver = r2',
      );

      // Verify parameters
      assert.equal(lastQueryParams[0], FILE_ID);
      assert.equal(lastQueryParams[1], 'READY');
      assert.equal(lastQueryParams[2], 'r2');
      assert.equal(lastQueryParams[3], CUSTOMER_USER_ID);
      assert.equal(lastQueryParams[4], 'COMPLETED');
      assert.equal(lastQueryParams[5], 'SUCCESSFUL');

      console.log('  [PASS] Verified Drizzle SQL joins, WHERE parameters, and HTTP 200 response for entitled buyer');
      passedTests++;
    }

    // 2.2 Unauthenticated Request to Download Route
    {
      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/${FILE_ID}/download`,
      });

      assert.equal(res.statusCode, 401, 'Unauthenticated download must return 401 Unauthorized');
      const json = JSON.parse(res.body);
      assert.equal(json.error, 'Unauthorized');
      assert.equal(json.message, 'Authentication required');
      console.log('  [PASS] Unauthenticated customer download blocked -> 401 Unauthorized');
      passedTests++;
    }

    // 2.3 Wrong Owner / IDOR Attack: Attacker requests file bought by Customer
    {
      testDbState.files = [validFile];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [validOrder]; // belongs to CUSTOMER_USER_ID

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/${FILE_ID}/download`,
        headers: {
          authorization: `Bearer ${attackerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'IDOR download attempt must return 404 Not Found');
      const json = JSON.parse(res.body);
      assert.equal(json.message, 'Digital file is unavailable.');
      console.log('  [PASS] IDOR attack by non-owner blocked with generic 404 (no info disclosure)');
      passedTests++;
    }

    // 2.4 Unpaid Order (paymentStatus = 'PENDING')
    {
      testDbState.files = [validFile];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [
        {
          ...validOrder,
          paymentStatus: 'PENDING',
        },
      ];

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/${FILE_ID}/download`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Unpaid order (PENDING) must return 404 Not Found');
      console.log('  [PASS] Unpaid order (paymentStatus: PENDING) blocked -> 404 Not Found');
      passedTests++;
    }

    // 2.5 Failed Payment (paymentStatus = 'FAILED')
    {
      testDbState.files = [validFile];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [
        {
          ...validOrder,
          paymentStatus: 'FAILED',
        },
      ];

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/${FILE_ID}/download`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Failed payment must return 404 Not Found');
      console.log('  [PASS] Failed payment (paymentStatus: FAILED) blocked -> 404 Not Found');
      passedTests++;
    }

    // 2.6 Incomplete Order (order status = 'PROCESSING')
    {
      testDbState.files = [validFile];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [
        {
          ...validOrder,
          status: 'PROCESSING',
        },
      ];

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/${FILE_ID}/download`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Incomplete order (PROCESSING) must return 404 Not Found');
      console.log('  [PASS] Incomplete order (orders.status: PROCESSING) blocked -> 404 Not Found');
      passedTests++;
    }

    // 2.7 Cancelled Order (order status = 'CANCELLED')
    {
      testDbState.files = [validFile];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [
        {
          ...validOrder,
          status: 'CANCELLED',
        },
      ];

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/${FILE_ID}/download`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Cancelled order must return 404 Not Found');
      console.log('  [PASS] Cancelled order (orders.status: CANCELLED) blocked -> 404 Not Found');
      passedTests++;
    }

    // 2.8 Refunded Order (order status = 'REFUNDED')
    {
      testDbState.files = [validFile];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [
        {
          ...validOrder,
          status: 'REFUNDED',
        },
      ];

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/${FILE_ID}/download`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Refunded order must return 404 Not Found');
      console.log('  [PASS] Refunded order (orders.status: REFUNDED) blocked -> 404 Not Found');
      passedTests++;
    }

    // 2.9 File Status Not READY (PENDING_UPLOAD, FAILED, DELETING)
    {
      for (const nonReadyStatus of ['PENDING_UPLOAD', 'FAILED', 'DELETING']) {
        testDbState.files = [
          {
            ...validFile,
            status: nonReadyStatus,
          },
        ];
        testDbState.orderItems = [validOrderItem];
        testDbState.orders = [validOrder];

        const res = await server.inject({
          method: 'GET',
          url: `/api/v1/digital-files/${FILE_ID}/download`,
          headers: {
            authorization: `Bearer ${customerToken}`,
          },
        });

        assert.equal(
          res.statusCode,
          404,
          `Non-ready file status (${nonReadyStatus}) must return 404 Not Found`,
        );
      }
      console.log('  [PASS] Non-READY file statuses (PENDING_UPLOAD, FAILED, DELETING) blocked -> 404 Not Found');
      passedTests++;
    }

    // 2.10 Non-R2 Storage Driver (e.g., 'local')
    {
      testDbState.files = [
        {
          ...validFile,
          storageDriver: 'local',
        },
      ];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [validOrder];

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/${FILE_ID}/download`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Non-R2 storage driver must return 404 Not Found');
      console.log('  [PASS] Non-R2 storage driver (local) blocked -> 404 Not Found');
      passedTests++;
    }

    // 2.11 Customer Owns Order for DIFFERENT Product
    {
      testDbState.files = [validFile]; // Product: PRODUCT_ID
      testDbState.orderItems = [
        {
          id: 102,
          orderId: 5002,
          productId: OTHER_PRODUCT_ID, // Different product!
        },
      ];
      testDbState.orders = [
        {
          id: 5002,
          userId: CUSTOMER_USER_ID,
          status: 'COMPLETED',
          paymentStatus: 'SUCCESSFUL',
        },
      ];

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/${FILE_ID}/download`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Order for different product must return 404 Not Found');
      console.log('  [PASS] Order for different product rejected -> 404 Not Found');
      passedTests++;
    }

    // 2.12 Invalid UUID format in fileId parameter
    {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/digital-files/invalid-uuid-format/download',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Malformed file ID must return 404 Not Found');
      console.log('  [PASS] Malformed file UUID parameter rejected before DB query -> 404 Not Found');
      passedTests++;
    }

    // -------------------------------------------------------------------------
    // SECTION 3: CUSTOMER PRODUCT DIGITAL-FILES LISTING ENTITLEMENT
    // -------------------------------------------------------------------------
    console.log(
      '\n--- SECTION 3: Customer Product Digital Files Listing & Entitlement ---',
    );

    // 3.1 Unauthenticated request
    {
      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/product/${PRODUCT_ID}`,
      });

      assert.equal(res.statusCode, 401, 'Unauthenticated product files request must return 401');
      console.log('  [PASS] Unauthenticated product digital files query blocked -> 401 Unauthorized');
      passedTests++;
    }

    // 3.2 Non-buyer / Attacker IDOR probe for product files
    {
      testDbState.files = [validFile];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [validOrder]; // owned by CUSTOMER_USER_ID

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/product/${PRODUCT_ID}`,
        headers: {
          authorization: `Bearer ${attackerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Non-buyer must receive 404 (no file disclosure)');
      const json = JSON.parse(res.body);
      assert.equal(json.message, 'Digital files are unavailable.');
      console.log('  [PASS] Non-buyer IDOR probe for product files blocked -> 404 Not Found');
      passedTests++;
    }

    // 3.3 Buyer with unpaid order
    {
      testDbState.files = [validFile];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [
        {
          ...validOrder,
          paymentStatus: 'PENDING',
        },
      ];

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/product/${PRODUCT_ID}`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Unpaid customer must receive 404');
      console.log('  [PASS] Unpaid customer querying product files blocked -> 404 Not Found');
      passedTests++;
    }

    // 3.4 Entitled buyer receives safe file metadata only
    {
      testDbState.files = [validFile];
      testDbState.orderItems = [validOrderItem];
      testDbState.orders = [validOrder];

      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/digital-files/product/${PRODUCT_ID}`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 200, 'Entitled buyer must receive 200 OK');
      const body = JSON.parse(res.body);
      assert.equal(body.success, true);
      assert.equal(Array.isArray(body.data), true);
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].id, FILE_ID);
      assert.equal(body.data[0].filename, 'mastering-typescript.pdf');
      assert.equal(body.data[0].mimeType, 'application/pdf');
      assert.equal(body.data[0].sizeBytes, 2048);
      assert.equal(body.data[0].status, 'READY');

      // CRITICAL SECURITY ASSERTION: No storageKey, bucket, or R2 credentials leaked!
      assert.equal(body.data[0].storageKey, undefined);
      assert.equal(body.data[0].storageDriver, undefined);
      assert.equal(res.body.includes('test-digital-bucket'), false);
      assert.equal(res.body.includes('digital-files/'), false);
      console.log('  [PASS] Entitled buyer receives safe metadata; zero storageKey/bucket leakage');
      passedTests++;
    }

    // 3.5 Malformed product UUID format
    {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/digital-files/product/not-a-valid-uuid',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.statusCode, 404, 'Malformed product UUID rejected before DB query -> 404');
      console.log('  [PASS] Malformed product UUID rejected before DB query -> 404 Not Found');
      passedTests++;
    }

  } finally {
    S3Client.prototype.send = originalS3Send;
    userRepository.findById = originalFindById;
    await server.close();
    await closeDbPool();
  }

  console.log(`\n================================================================`);
  console.log(`ALL ${passedTests} SECURITY & ENTITLEMENT VERIFICATION CHECKS PASSED!`);
  console.log(`================================================================\n`);
}

runSecurityVerification().then(() => process.exit(0)).catch((err) => {
  console.error('Security verification test failed:', err);
  process.exit(1);
});
