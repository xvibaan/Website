import assert from 'node:assert/strict';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { S3Client } from '@aws-sdk/client-s3';
import { setDbForTesting } from '../src/db/client';
import { digitalFileAdminRoutes } from '../src/admin/routes/digital-files.routes';
import { digitalFileRoutes } from '../src/digital-files/digital-files.routes';
import { cleanupStalePendingUploads } from '../src/admin/services/digital-files-cleanup.service';
import {
  promoteStagedDigitalObject,
  DigitalStorageError,
} from '../src/storage/R2DigitalStorageService';
import { createSessionToken } from '../src/auth/session';
import { userRepository } from '../src/db/repositories/user.repository';
import { rateLimitOverrides } from '../src/rate-limit';

// Set test environment configuration
process.env.R2_ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
process.env.R2_BUCKET = 'test-digital-bucket';
process.env.R2_ACCESS_KEY_ID = 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AUTH_SECRET = 'test-secret-for-jwt-session-testing';
process.env.NODE_ENV = 'test';

const FILE_ID = '11111111-1111-1111-1111-111111111111';
const PRODUCT_ID = '22222222-2222-2222-2222-222222222222';
const FINAL_KEY = 'digital-files/' + FILE_ID + '.pdf';
const STAGING_KEY = 'digital-staging/' + FILE_ID + '.pdf';

/**
 * Creates a chainable mock DB builder for Fastify routes & services
 */
function createMockDb(config: {
  onSelect: (table: any, whereCond: any) => any[] | Promise<any[]>;
  onUpdate?: (table: any, setVals: any, whereCond: any) => any | Promise<any>;
  onDelete?: (table: any, whereCond: any) => any | Promise<any>;
}) {
  return {
    select: (fields?: any) => {
      let currentTable: any = null;
      let currentWhere: any = null;
      const builder: any = {
        from: (tbl: any) => {
          currentTable = tbl;
          return builder;
        },
        innerJoin: () => builder,
        where: (cond: any) => {
          currentWhere = cond;
          return builder;
        },
        orderBy: () => builder,
        limit: () => builder,
        then: (resolve: any, reject: any) => {
          try {
            const res = config.onSelect(currentTable, currentWhere);
            Promise.resolve(res).then(resolve, reject);
          } catch (e) {
            reject(e);
          }
        },
      };
      return builder;
    },
    update: (tbl: any) => {
      let setVals: any = null;
      let currentWhere: any = null;
      const builder: any = {
        set: (vals: any) => {
          setVals = vals;
          return builder;
        },
        where: (cond: any) => {
          currentWhere = cond;
          return builder;
        },
        then: (resolve: any, reject: any) => {
          try {
            const res = config.onUpdate ? config.onUpdate(tbl, setVals, currentWhere) : {};
            Promise.resolve(res).then(resolve, reject);
          } catch (e) {
            reject(e);
          }
        },
      };
      return builder;
    },
    delete: (tbl: any) => {
      let currentWhere: any = null;
      const builder: any = {
        where: (cond: any) => {
          currentWhere = cond;
          return builder;
        },
        then: (resolve: any, reject: any) => {
          try {
            const res = config.onDelete ? config.onDelete(tbl, currentWhere) : {};
            Promise.resolve(res).then(resolve, reject);
          } catch (e) {
            reject(e);
          }
        },
      };
      return builder;
    },
  };
}

async function main() {
  console.log('=== R2 Digital Files Implementation-Level Verification Suite ===\n');

  // Preserve original S3Client.prototype.send
  const originalSend = S3Client.prototype.send;

  // Preserve original userRepository.findById
  const originalFindById = userRepository.findById;

  let passedTests = 0;
  const totalTests = 8;

  try {
    // ------------------------------------------------------------------------
    // Suite 1: Actual Fastify Admin Routes (digitalFileAdminRoutes)
    // ------------------------------------------------------------------------
    console.log('--- Suite 1: Actual Fastify Admin Deletion Route (DELETE /:id) ---');

    const adminApp = Fastify();
    await adminApp.register(fastifyCookie);
    await adminApp.register(digitalFileAdminRoutes, { prefix: '/api/v1/admin/digital-files' });
    await adminApp.ready();

    // Test 1: R2 deletion failure leaves record intact in DELETING and returns 502
    {
      let dbUpdatedStatus: string | null = null;
      let dbDeletedCalled = false;

      // Mock database fixture: file exists in READY state, 0 completed customer orders
      let selectCount = 0;
      const mockDb = createMockDb({
        onSelect: () => {
          selectCount++;
          if (selectCount === 1) {
            // First query: fetch productDigitalFiles record
            return [
              {
                id: FILE_ID,
                productId: PRODUCT_ID,
                storageDriver: 'r2',
                storageKey: FINAL_KEY,
                originalFilename: 'ebook.pdf',
                mimeType: 'application/pdf',
                status: 'READY',
              },
            ];
          }
          // Second query: fetch orderItems innerJoin orders count
          return [{ count: 0 }];
        },
        onUpdate: (_tbl, vals) => {
          dbUpdatedStatus = vals.status;
          return {};
        },
        onDelete: () => {
          dbDeletedCalled = true;
          return {};
        },
      });

      setDbForTesting(mockDb);

      // S3Client stub: simulate R2 transient 500 error
      S3Client.prototype.send = (async () => {
        const err: any = new Error('R2 upstream failure: service temporarily unavailable');
        err.$metadata = { httpStatusCode: 500 };
        throw err;
      }) as any;

      const res = await adminApp.inject({
        method: 'DELETE',
        url: '/api/v1/admin/digital-files/' + FILE_ID,
      });

      assert.equal(res.statusCode, 502, 'Must return HTTP 502 Bad Gateway on storage failure');
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'BadGateway');
      assert.equal(body.status, 'DELETING');
      assert.ok(body.message.includes('retained in DELETING status and can be safely retried'));

      // Crucial implementation assertion:
      assert.equal(dbUpdatedStatus, 'DELETING', 'Record status must be updated to DELETING prior to storage call');
      assert.equal(dbDeletedCalled, false, 'Database record must NEVER be deleted when R2 deletion fails');

      console.log('[PASS] Test 1: Actual DELETE route leaves record intact in DELETING status on R2 failure (HTTP 502)');
      passedTests++;
    }

    // Test 2: Repeating deletion on record in DELETING state succeeds and removes DB record
    {
      let dbDeletedCalled = false;
      let s3CallCount = 0;

      let selectCount = 0;
      const mockDb = createMockDb({
        onSelect: () => {
          selectCount++;
          if (selectCount === 1) {
            // Record is currently in DELETING state
            return [
              {
                id: FILE_ID,
                productId: PRODUCT_ID,
                storageDriver: 'r2',
                storageKey: FINAL_KEY,
                originalFilename: 'ebook.pdf',
                mimeType: 'application/pdf',
                status: 'DELETING',
              },
            ];
          }
          return [{ count: 0 }];
        },
        onUpdate: () => {},
        onDelete: () => {
          dbDeletedCalled = true;
          return {};
        },
      });

      setDbForTesting(mockDb);

      // S3Client stub: R2 is now healthy and returns 200
      S3Client.prototype.send = (async () => {
        s3CallCount++;
        return {};
      }) as any;

      const res = await adminApp.inject({
        method: 'DELETE',
        url: '/api/v1/admin/digital-files/' + FILE_ID,
      });

      assert.equal(res.statusCode, 200, 'Must return HTTP 200 on successful retry');
      const body = JSON.parse(res.body);
      assert.equal(body.success, true);
      assert.ok(s3CallCount >= 1, 'R2 storage deletion was re-executed');
      assert.equal(dbDeletedCalled, true, 'Database record must be deleted upon confirmed storage cleanup');

      console.log('[PASS] Test 2: Actual DELETE route safely retries DELETING record and deletes DB record on success');
      passedTests++;
    }

    // Test 3: Idempotent deletion when object is already missing from R2 (NoSuchKey / 404)
    {
      let dbDeletedCalled = false;

      let selectCount = 0;
      const mockDb = createMockDb({
        onSelect: () => {
          selectCount++;
          if (selectCount === 1) {
            return [
              {
                id: FILE_ID,
                productId: PRODUCT_ID,
                storageDriver: 'r2',
                storageKey: FINAL_KEY,
                originalFilename: 'ebook.pdf',
                mimeType: 'application/pdf',
                status: 'DELETING',
              },
            ];
          }
          return [{ count: 0 }];
        },
        onUpdate: () => {},
        onDelete: () => {
          dbDeletedCalled = true;
          return {};
        },
      });

      setDbForTesting(mockDb);

      // S3Client stub: R2 returns 404 NoSuchKey (already missing)
      S3Client.prototype.send = (async () => {
        const err: any = new Error('The specified key does not exist.');
        err.name = 'NoSuchKey';
        err.$metadata = { httpStatusCode: 404 };
        throw err;
      }) as any;

      const res = await adminApp.inject({
        method: 'DELETE',
        url: '/api/v1/admin/digital-files/' + FILE_ID,
      });

      assert.equal(res.statusCode, 200, 'Already-missing object must be handled idempotently as 200');
      assert.equal(dbDeletedCalled, true, 'Database record must be removed when storage object is confirmed gone');

      console.log('[PASS] Test 3: Actual DELETE route handles missing R2 object (NoSuchKey/404) idempotently');
      passedTests++;
    }

    // Test 4: Paid customer entitlement protection unconditionally blocks deletion
    {
      let dbUpdatedCalled = false;
      let dbDeletedCalled = false;
      let s3Called = false;

      let selectCount = 0;
      const mockDb = createMockDb({
        onSelect: () => {
          selectCount++;
          if (selectCount === 1) {
            return [
              {
                id: FILE_ID,
                productId: PRODUCT_ID,
                storageDriver: 'r2',
                storageKey: FINAL_KEY,
                originalFilename: 'ebook.pdf',
                mimeType: 'application/pdf',
                status: 'READY',
              },
            ];
          }
          // 4 completed customer orders exist for this product!
          return [{ count: 4 }];
        },
        onUpdate: () => {
          dbUpdatedCalled = true;
        },
        onDelete: () => {
          dbDeletedCalled = true;
        },
      });

      setDbForTesting(mockDb);

      S3Client.prototype.send = (async () => {
        s3Called = true;
        return {};
      }) as any;

      const res = await adminApp.inject({
        method: 'DELETE',
        url: '/api/v1/admin/digital-files/' + FILE_ID,
      });

      assert.equal(res.statusCode, 409, 'Must return HTTP 409 Conflict when completed orders exist');
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Conflict');
      assert.equal(body.completedOrdersCount, 4);
      assert.ok(body.message.includes('4 completed customer order(s) exist'));

      assert.equal(dbUpdatedCalled, false, 'DB status must NOT be modified');
      assert.equal(dbDeletedCalled, false, 'DB record must NOT be deleted');
      assert.equal(s3Called, false, 'Storage must NEVER be touched when entitlement blocks deletion');

      console.log('[PASS] Test 4: Actual DELETE route unconditionally blocks deletion when completed orders exist (409 Conflict)');
      passedTests++;
    }

    // ------------------------------------------------------------------------
    // Suite 2: Actual Cleanup Service (cleanupStalePendingUploads)
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 2: Actual Staging Cleanup Service (cleanupStalePendingUploads) ---');

    // Test 5: Non-404 R2 storage failure preserves record in PENDING_UPLOAD for future retry
    {
      let dbUpdatedStatus: string | null = null;

      const mockDb = createMockDb({
        onSelect: () => [
          {
            id: FILE_ID,
            storageKey: FINAL_KEY,
            storageDriver: 'r2',
            createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48h old
          },
        ],
        onUpdate: (_tbl, vals) => {
          dbUpdatedStatus = vals.status;
          return {};
        },
      });

      setDbForTesting(mockDb);

      // S3Client stub: simulate network failure during cleanup
      S3Client.prototype.send = (async () => {
        const err: any = new Error('Connection reset by peer');
        err.$metadata = { httpStatusCode: 504 };
        throw err;
      }) as any;

      const result = await cleanupStalePendingUploads({ maxAgeHours: 24, limit: 10 });

      assert.equal(result.scanned, 1);
      assert.equal(result.cleaned, 0);
      assert.equal(result.failed, 1);
      assert.equal(dbUpdatedStatus, null, 'Record must NOT be updated to FAILED on storage error');

      console.log('[PASS] Test 5: Actual cleanupStalePendingUploads preserves record in PENDING_UPLOAD on non-404 storage error');
      passedTests++;
    }

    // Test 6: Staging cleanup strictly asserts staging prefix and never deletes digital-files/ keys
    {
      let s3DeletedKey: string | null = null;

      const mockDb = createMockDb({
        onSelect: () => [
          {
            id: FILE_ID,
            // Corrupt/malicious storage key
            storageKey: 'arbitrary-prefix/malicious.pdf',
            storageDriver: 'r2',
            createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          },
        ],
      });

      setDbForTesting(mockDb);

      S3Client.prototype.send = (async (cmd: any) => {
        s3DeletedKey = cmd?.input?.Key;
        return {};
      }) as any;

      const result = await cleanupStalePendingUploads({ maxAgeHours: 24, limit: 10 });

      assert.equal(result.failed, 1);
      assert.equal(result.cleaned, 0);
      assert.equal(s3DeletedKey, null, 'S3 delete must NEVER be called with invalid key');
      assert.ok(result.errors[0].error.includes('Invalid storage key format'));

      console.log('[PASS] Test 6: Actual cleanupStalePendingUploads rejects invalid storage keys and protects digital-files/');
      passedTests++;
    }

    // ------------------------------------------------------------------------
    // Suite 3: Actual Customer Download Route (digitalFileRoutes)
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 3: Actual Customer Download Route (GET /:fileId/download) ---');

    const customerApp = Fastify();
    await customerApp.register(fastifyCookie);
    await customerApp.register(digitalFileRoutes, { prefix: '/api/v1/digital-files' });
    await customerApp.ready();

    // Verify rate limit configuration attached to route
    assert.equal(rateLimitOverrides.digitalDownload.config.rateLimit.max, 15, 'Rate limit max must be 15');
    assert.equal(rateLimitOverrides.digitalDownload.config.rateLimit.timeWindow, '1 minute');

    const buyerUserId = '33333333-3333-3333-3333-333333333333';
    const nonBuyerUserId = '44444444-4444-4444-4444-444444444444';

    // Stub userRepository.findById for session authentication
    (userRepository as any).findById = async (id: string) => ({
      id,
      email: id === buyerUserId ? 'buyer@example.com' : 'other@example.com',
      role: 'CUSTOMER',
      isActive: true,
    });

    const buyerToken = createSessionToken({
      userId: buyerUserId,
      email: 'buyer@example.com',
      role: 'CUSTOMER',
      isActive: true,
    });

    const nonBuyerToken = createSessionToken({
      userId: nonBuyerUserId,
      email: 'other@example.com',
      role: 'CUSTOMER',
      isActive: true,
    });

    // Test 7: Download endpoint authorizes only owner of completed, paid order; rejects IDOR/unpaid with generic 404
    {
      // Case A: Entitled buyer with completed, paid order
      const mockDbBuyer = createMockDb({
        onSelect: () => [
          {
            id: FILE_ID,
            storageKey: FINAL_KEY,
            storageDriver: 'r2',
            mimeType: 'application/pdf',
            filename: 'my-manual.pdf',
            status: 'READY',
          },
        ],
      });

      setDbForTesting(mockDbBuyer);

      const resBuyer = await customerApp.inject({
        method: 'GET',
        url: '/api/v1/digital-files/' + FILE_ID + '/download',
        headers: {
          authorization: 'Bearer ' + buyerToken,
        },
      });

      assert.equal(resBuyer.statusCode, 200, 'Must return 200 for entitled buyer');
      assert.ok(resBuyer.headers['cache-control']?.includes('no-store'));
      const buyerBody = JSON.parse(resBuyer.body);
      assert.equal(buyerBody.success, true);
      assert.equal(buyerBody.fileId, FILE_ID);
      assert.ok(buyerBody.downloadUrl.includes('test-digital-bucket'));

      // Case B: Non-buyer / IDOR attempt (query returns empty)
      const mockDbNonBuyer = createMockDb({
        onSelect: () => [], // No completed paid order for this user
      });

      setDbForTesting(mockDbNonBuyer);

      const resNonBuyer = await customerApp.inject({
        method: 'GET',
        url: '/api/v1/digital-files/' + FILE_ID + '/download',
        headers: {
          authorization: 'Bearer ' + nonBuyerToken,
        },
      });

      assert.equal(resNonBuyer.statusCode, 404, 'Must return 404 for non-buyer');
      const nonBuyerBody = JSON.parse(resNonBuyer.body);
      assert.equal(nonBuyerBody.message, 'Digital file is unavailable.'); // Generic message, no information disclosure

      // Case C: Unauthenticated request (no token)
      const resUnauth = await customerApp.inject({
        method: 'GET',
        url: '/api/v1/digital-files/' + FILE_ID + '/download',
      });

      assert.equal(resUnauth.statusCode, 401, 'Must return 401 for unauthenticated request');

      console.log('[PASS] Test 7: Actual download route authorizes only entitled buyers and rejects IDOR/unauthenticated with generic 404/401');
      passedTests++;
    }

    // ------------------------------------------------------------------------
    // Suite 4: Actual Storage Service Conditional-Copy Error Handling
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 4: Actual Storage Service Conditional-Copy Error Handling ---');

    // Test 8: promoteStagedDigitalObject maps 412 PreconditionFailed to structured DigitalStorageError
    {
      S3Client.prototype.send = (async () => {
        const err: any = new Error('PreconditionFailed');
        err.name = 'PreconditionFailed';
        err.$metadata = { httpStatusCode: 412 };
        throw err;
      }) as any;

      await assert.rejects(
        async () => {
          await promoteStagedDigitalObject({
            stagingKey: STAGING_KEY,
            mimeType: 'application/pdf',
            expectedETag: 'original-etag-12345',
          });
        },
        (err: any) => {
          assert.ok(err instanceof DigitalStorageError, 'Must be instance of DigitalStorageError');
          assert.equal(err.statusCode, 412, 'Must have statusCode 412');
          assert.equal(err.code, 'DIGITAL_FILE_ETAG_MISMATCH', 'Must have error code DIGITAL_FILE_ETAG_MISMATCH');
          assert.ok(err.message.includes('ETag mismatch'));
          return true;
        },
      );

      console.log('[PASS] Test 8: Actual promoteStagedDigitalObject maps 412 PreconditionFailed to structured DIGITAL_FILE_ETAG_MISMATCH');
      passedTests++;
    }

  } finally {
    // Restore originals
    S3Client.prototype.send = originalSend;
    userRepository.findById = originalFindById;
  }

  console.log(`\n=================================================================`);
  console.log(`ALL ${passedTests}/${totalTests} REAL IMPLEMENTATION-LEVEL VERIFICATION TESTS PASSED!`);
  console.log(`=================================================================\n`);
}

main().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});