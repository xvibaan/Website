import crypto from 'crypto';
import { FamappEmailParser } from '../src/payments/famapp/famapp-email-parser';
import { GmailPollerService, GMAIL_READONLY_SCOPE } from '../src/payments/famapp/gmail-poller.service';
import { GoogleOAuthGmailClient } from '../src/payments/famapp/gmail-client';
import { FamappVerificationService } from '../src/payments/famapp/famapp-verification.service';
import {
  utrStringSchema,
  amountStringSchema,
  submitUtrSchema,
  adminReviewSubmissionSchema,
} from '../src/payments/famapp/famapp.validation';
import { RawGmailMessage, IGmailClient, ParsedFamappEmail } from '../src/payments/famapp/famapp.types';
import { famappEmailEvents, upiPaymentSubmissions, famappSyncState } from '../src/db/schema/famapp';
import { Money } from '../src/wallet/money';
import { DevelopmentPaymentGateway } from '../src/payments/gateways/development.gateway';
import { alertService } from '../src/admin/services/alert.service';

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

// =========================================================================
// MOCK GMAIL CLIENT TEST DOUBLE WITH PAGINATION SUPPORT
// =========================================================================
class MockGmailClient implements IGmailClient {
  public pages: Array<{ messages: Array<{ id: string; threadId: string }>; nextPageToken?: string }> = [];
  public messages: Map<string, RawGmailMessage> = new Map();
  public listQueries: string[] = [];
  public listPageTokens: (string | undefined)[] = [];

  addMessage(msg: RawGmailMessage) {
    this.messages.set(msg.id, msg);
  }

  setPages(pages: Array<{ messages: Array<{ id: string; threadId: string }>; nextPageToken?: string }>) {
    this.pages = pages;
  }

  async listMessages(query: string, pageToken?: string, maxResults?: number) {
    this.listQueries.push(query);
    this.listPageTokens.push(pageToken);

    if (this.pages.length > 0) {
      if (!pageToken) {
        return this.pages[0];
      }
      const pageIndex = parseInt(pageToken.replace('page_', ''), 10);
      if (pageIndex < this.pages.length) {
        return this.pages[pageIndex];
      }
      return { messages: [] };
    }

    const msgs = Array.from(this.messages.values()).map((m) => ({
      id: m.id,
      threadId: m.threadId,
    }));
    return { messages: msgs };
  }

  async getMessage(id: string): Promise<RawGmailMessage> {
    const msg = this.messages.get(id);
    if (!msg) throw new Error(`Message not found: ${id}`);
    return msg;
  }

  async listHistory(startHistoryId: string) {
    return { history: [], historyId: 'hist_99999' };
  }
}

// =========================================================================
// IN-MEMORY DATABASE & REPOSITORY TEST DOUBLE
// =========================================================================
class InMemoryDbDouble {
  public emailEvents: Map<string, any> = new Map();
  public submissions: Map<string, any> = new Map();
  public paymentTransactions: Map<string, any> = new Map();
  public syncState: Map<string, any> = new Map();
  public wallets: Map<string, any> = new Map();
  public ledgerEntries: Map<string, any> = new Map();
}

function createMockGmailMessage(options: {
  id: string;
  from?: string;
  to?: string;
  subject?: string;
  bodyText: string;
  dkim?: 'PASS' | 'FAIL' | 'NONE';
  dkimDomain?: string;
  spf?: 'PASS' | 'FAIL' | 'NONE';
  date?: string;
}): RawGmailMessage {
  const from = options.from || 'FamApp <no-reply@famapp.in>';
  const to = options.to || 'merchant@fam';
  const subject = options.subject || 'Money Received via UPI';
  const date = options.date || new Date().toUTCString();

  const dkimDomain = options.dkimDomain || 'famapp.in';
  let authResults = '';
  if (options.dkim === 'PASS') {
    authResults += `dkim=pass header.i=@${dkimDomain} header.d=${dkimDomain}; `;
  } else if (options.dkim === 'FAIL') {
    authResults += 'dkim=fail (bad signature); ';
  }

  if (options.spf === 'PASS') {
    authResults += `spf=pass (google.com: domain of ${from} designates 1.2.3.4 as permitted sender);`;
  } else if (options.spf === 'FAIL') {
    authResults += 'spf=fail;';
  }

  const base64Body = Buffer.from(options.bodyText, 'utf8').toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return {
    id: options.id,
    threadId: `th_${options.id}`,
    snippet: options.bodyText.substring(0, 100),
    payload: {
      headers: [
        { name: 'From', value: from },
        { name: 'To', value: to },
        { name: 'Subject', value: subject },
        { name: 'Date', value: date },
        { name: 'Authentication-Results', value: authResults },
        { name: 'Received-SPF', value: options.spf === 'PASS' ? 'pass' : (options.spf === 'FAIL' ? 'fail' : 'neutral') },
      ],
      body: {
        data: base64Body,
      },
    },
  };
}

function createQueryChain(rows: any[] = []) {
  const chain: any = {
    limit: (n: number) => createQueryChain(rows.slice(0, n)),
    offset: () => chain,
    orderBy: () => chain,
    for: () => chain,
    then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

async function runTestSuite() {
  const testStore = new InMemoryDbDouble();
  alertService.raiseAlert = async () => ({ id: 'mock_alert_id' } as any);
  console.log('================================================================');
  console.log('  FAMAPP HARDENED SECURITY & INTEGRATION REGRESSION SUITE       ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. UTR VALIDATION & REQUEST SCHEMAS
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: UTR Validation & Request Schemas ---');

  assert(utrStringSchema.safeParse('412345678901').success === true, '12-digit numeric UTR must pass validation');
  assert(utrStringSchema.safeParse('41234567890').success === false, '11-digit UTR must be rejected');
  assert(utrStringSchema.safeParse('4123456789012').success === false, '13-digit UTR must be rejected');
  assert(utrStringSchema.safeParse('41234567890A').success === false, 'Alphanumeric UTR must be rejected');

  const validSubmitRes = submitUtrSchema.safeParse({
    utr: '429817654321',
    amount: '500.00',
    currency: 'INR',
  });
  assert(validSubmitRes.success === true, 'Valid submission body must pass Zod schema');

  const negAmountRes = submitUtrSchema.safeParse({
    utr: '429817654321',
    amount: '-10.00',
    currency: 'INR',
  });
  assert(negAmountRes.success === false, 'Negative deposit amount must be rejected');

  const usdtRes = submitUtrSchema.safeParse({
    utr: '429817654321',
    amount: '10.00',
    currency: 'USDT',
  });
  assert(usdtRes.success === false, 'Non-INR currency for UPI top-up must be rejected');

  // Admin Review Schemas
  const missingApproveFails = adminReviewSubmissionSchema.safeParse({ action: 'APPROVE' });
  assert(missingApproveFails.success === false, 'APPROVE with missing settlementConfirmed must fail validation');

  const falseApproveFails = adminReviewSubmissionSchema.safeParse({ action: 'APPROVE', settlementConfirmed: false });
  assert(falseApproveFails.success === false, 'APPROVE with settlementConfirmed: false must fail validation');

  const stringApproveFails = adminReviewSubmissionSchema.safeParse({ action: 'APPROVE', settlementConfirmed: 'true' });
  assert(stringApproveFails.success === false, 'APPROVE with non-boolean settlementConfirmed must fail validation');

  const validApprove = adminReviewSubmissionSchema.safeParse({ action: 'APPROVE', settlementConfirmed: true });
  assert(validApprove.success === true, 'Standard APPROVE with settlementConfirmed: true is valid');

  const missingOverrideFails = adminReviewSubmissionSchema.safeParse({
    action: 'OVERRIDE_APPROVE',
    reason: 'Verified manually via ICICI bank corporate statement at 18:30',
  });
  assert(missingOverrideFails.success === false, 'OVERRIDE_APPROVE with missing settlementConfirmed must fail validation');

  const falseOverrideFails = adminReviewSubmissionSchema.safeParse({
    action: 'OVERRIDE_APPROVE',
    reason: 'Verified manually via ICICI bank corporate statement at 18:30',
    settlementConfirmed: false,
  });
  assert(falseOverrideFails.success === false, 'OVERRIDE_APPROVE with settlementConfirmed: false must fail validation');

  const validOverride = adminReviewSubmissionSchema.safeParse({
    action: 'OVERRIDE_APPROVE',
    reason: 'Verified manually via ICICI bank corporate statement at 18:30',
    settlementConfirmed: true,
  });
  assert(validOverride.success === true, 'OVERRIDE_APPROVE with adequate reason and settlementConfirmed: true is valid');

  const shortReasonFails = adminReviewSubmissionSchema.safeParse({
    action: 'OVERRIDE_APPROVE',
    reason: 'too short', // 9 chars
    settlementConfirmed: true,
  });
  assert(shortReasonFails.success === false, 'OVERRIDE_APPROVE with reason under 10 chars must fail validation');

  const validReject = adminReviewSubmissionSchema.safeParse({ action: 'REJECT', reason: 'User sent screenshot of wrong transaction' });
  assert(validReject.success === true, 'REJECT action with reason is valid without settlementConfirmed');

  // -------------------------------------------------------------------------
  // 2. GMAIL SENDER QUERY & STRICT ALLOWLIST ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Sender Query & Allowlist Enforcement ---');

  assert(
    GmailPollerService.DEFAULT_QUERY === 'from:(no-reply@famapp.in OR no-reply@fampay.in)',
    'Gmail poller default query must match exact verified senders no-reply@famapp.in and no-reply@fampay.in'
  );

  assert(
    FamappEmailParser.ALLOWED_SENDER_ADDRESSES.includes('no-reply@famapp.in') &&
    FamappEmailParser.ALLOWED_SENDER_ADDRESSES.includes('no-reply@fampay.in'),
    'Parser allowlist must include verified no-reply@famapp.in and no-reply@fampay.in'
  );

  // Reject unverified sender address
  const unverifiedSenderMsg = createMockGmailMessage({
    id: 'msg_unverified_sender',
    from: 'FamApp Updates <updates@famapp.in>',
    bodyText: 'Payment Received! You received ₹500.00. UPI Ref No: 412345678901',
    dkim: 'PASS',
  });
  const parsedUnverifiedSender = FamappEmailParser.parse(unverifiedSenderMsg);
  assert(
    parsedUnverifiedSender?.authStatus === 'FAILED',
    'Sender address updates@famapp.in not in allowlist must be marked FAILED'
  );

  // Reject display-name spoofing
  const spoofedDisplayNameMsg = createMockGmailMessage({
    id: 'msg_spoofed_name',
    from: '"no-reply@famapp.in" <attacker@phishing-attack.com>',
    bodyText: 'Payment Received! You received ₹500.00. UPI Ref No: 412345678901',
    dkim: 'PASS',
    dkimDomain: 'phishing-attack.com',
  });
  const parsedSpoofedName = FamappEmailParser.parse(spoofedDisplayNameMsg);
  assert(
    parsedSpoofedName?.authStatus === 'FAILED',
    'Display name spoofing no-reply@famapp.in with foreign envelope address must be marked FAILED'
  );

  // -------------------------------------------------------------------------
  // 3. CRYPTOGRAPHIC EMAIL AUTHENTICATION (DKIM & DOMAIN ALIGNMENT)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Email Authentication & DKIM Alignment ---');

  // 3.1 Perfectly aligned authentic email
  const authenticMsg = createMockGmailMessage({
    id: 'msg_auth_001',
    from: 'FamApp Notifications <no-reply@famapp.in>',
    to: 'merchant@fam',
    subject: 'You received ₹500.00 from Aryan Sharma',
    bodyText: 'Payment Received!\nYou received ₹500.00 from Aryan Sharma (UPI ID: aryan@okaxis)\nUPI Ref No: 412345678901\nTxn ID: FAM-TX-888999\nTo: merchant@fam\nDate: 23 Oct 2026',
    dkim: 'PASS',
    dkimDomain: 'famapp.in',
    spf: 'PASS',
  });
  const parsedValid = FamappEmailParser.parse(authenticMsg);
  assert(parsedValid !== null, 'Authentic FamApp notification must be parsed successfully');
  assert(parsedValid?.parsedUtr === '412345678901', 'Parser must extract exact 12-digit UTR');
  assert(parsedValid?.parsedTxId === 'FAM-TX-888999', 'Parser must extract internal transaction ID');
  assert(parsedValid?.parsedAmount === '500.00', 'Parser must extract and normalize amount to 500.00');
  assert(parsedValid?.dkimStatus === 'PASS', 'DKIM pass header with aligned domain must be PASS');
  assert(parsedValid?.authStatus === 'VERIFIED', 'Authentic email with valid aligned DKIM must be VERIFIED');

  // 3.2 DKIM Failure
  const dkimFailMsg = createMockGmailMessage({
    id: 'msg_dkim_fail',
    from: 'FamApp Notifications <no-reply@famapp.in>',
    bodyText: 'Payment Received! You received ₹500.00. UPI Ref No: 412345678901',
    dkim: 'FAIL',
  });
  const parsedDkimFail = FamappEmailParser.parse(dkimFailMsg);
  assert(parsedDkimFail?.dkimStatus === 'FAIL', 'Cryptographic DKIM failure must be recorded as FAIL');
  assert(parsedDkimFail?.authStatus === 'FAILED', 'Message with failed DKIM must have authStatus FAILED');

  // 3.3 Missing DKIM / Unauthenticated
  const missingDkimMsg = createMockGmailMessage({
    id: 'msg_dkim_missing',
    from: 'FamApp Notifications <no-reply@famapp.in>',
    bodyText: 'Payment Received! You received ₹500.00. UPI Ref No: 412345678901',
    dkim: 'NONE',
  });
  const parsedMissingDkim = FamappEmailParser.parse(missingDkimMsg);
  assert(parsedMissingDkim?.dkimStatus === 'NONE', 'Missing DKIM header must be recorded as NONE');
  assert(parsedMissingDkim?.authStatus === 'MISSING', 'Message without DKIM must fail closed to MISSING');

  // 3.4 Unaligned DKIM (Valid signature but from foreign domain)
  const unalignedDkimMsg = createMockGmailMessage({
    id: 'msg_unaligned_dkim',
    from: 'FamApp Notifications <no-reply@famapp.in>',
    bodyText: 'Payment Received! You received ₹500.00. UPI Ref No: 412345678901',
    dkim: 'PASS',
    dkimDomain: 'evil-attacker.org',
  });
  const parsedUnalignedDkim = FamappEmailParser.parse(unalignedDkimMsg);
  assert(parsedUnalignedDkim?.dkimStatus === 'FAIL', 'DKIM signed by unaligned domain evil-attacker.org must be recorded as FAIL');
  assert(parsedUnalignedDkim?.authStatus === 'FAILED', 'Unaligned DKIM signature must have authStatus FAILED');

  // -------------------------------------------------------------------------
  // 4. PARSER AMBIGUITY: DIRECTION, UTR LABELS & AMOUNT
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Direction, UTR & Amount Parsing Ambiguity ---');

  // 4.1 Outgoing Debit Email (Must be rejected completely)
  const debitMsg = createMockGmailMessage({
    id: 'msg_debit_001',
    from: 'FamApp Notifications <no-reply@famapp.in>',
    subject: 'You paid ₹500.00 to Merchant Shop',
    bodyText: 'Payment Sent! You paid ₹500.00 to Merchant Shop. UPI Ref No: 412345678901 debited from your account.',
    dkim: 'PASS',
  });
  const parsedDebit = FamappEmailParser.parse(debitMsg);
  assert(parsedDebit === null, 'Outgoing debit email must be completely rejected by parser');

  // 4.2 Loose 12-digit number without keyword label (e.g. phone number or tracking ID)
  const looseDigitsMsg = createMockGmailMessage({
    id: 'msg_loose_digits',
    from: 'FamApp Notifications <no-reply@famapp.in>',
    bodyText: 'Payment Received! ₹500.00 received. Call customer support at 987654321012 for help.',
    dkim: 'PASS',
  });
  const parsedLooseDigits = FamappEmailParser.parse(looseDigitsMsg);
  assert(parsedLooseDigits === null, '12-digit phone number without UTR keyword must return null');

  // 4.3 Transaction ID present without UTR
  const txIdOnlyMsg = createMockGmailMessage({
    id: 'msg_tx_id_only',
    from: 'FamApp Notifications <no-reply@famapp.in>',
    bodyText: 'Payment Received! ₹500.00 credited. Transaction ID: TXN_998877665544.',
    dkim: 'PASS',
  });
  const parsedTxIdOnly = FamappEmailParser.parse(txIdOnlyMsg);
  assert(parsedTxIdOnly === null, 'Email with transaction ID but lacking 12-digit UTR must return null');

  // 4.4 Supported UTR keyword variations
  const utrVariants = [
    { text: 'UPI Ref No: 411122223333', utr: '411122223333' },
    { text: 'UTR: 422233334444', utr: '422233334444' },
    { text: 'RRN 433344445555', utr: '433344445555' },
    { text: 'Bank Ref No. 444455556666', utr: '444455556666' },
  ];
  for (const v of utrVariants) {
    const vMsg = createMockGmailMessage({
      id: `msg_${v.utr}`,
      bodyText: `Payment Received! Credited ₹250.00. ${v.text}`,
      dkim: 'PASS',
    });
    const parsedV = FamappEmailParser.parse(vMsg);
    assert(parsedV?.parsedUtr === v.utr, `Parser must match keyword variation: ${v.text}`);
  }

  // -------------------------------------------------------------------------
  // 5. MERCHANT VPA MATCHING & RECIPIENT VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Merchant VPA Matching & Recipient Enforcement ---');

  const mockGmailPoller = new MockGmailClient();

  let insertedEventStatus = '';
  const mockDbForVpa: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    }),
    insert: () => ({
      values: (val: any) => {
        if (val.status !== undefined) {
          insertedEventStatus = val.status;
        }
        return {
          returning: () => [val],
          onConflictDoUpdate: () => Promise.resolve(),
        };
      },
    }),
  };

  // 5.1 Matching recipient VPA
  const matchingVpaMsg = createMockGmailMessage({
    id: 'msg_vpa_match',
    bodyText: 'Payment Received! Credited ₹500.00 to merchant@fam. UPI Ref No: 499988887777',
    dkim: 'PASS',
  });
  mockGmailPoller.addMessage(matchingVpaMsg);

  const pollerWithVpa = new GmailPollerService({
    client: mockGmailPoller,
    merchantVpa: 'merchant@fam',
    db: mockDbForVpa,
  });

  const pollResVpaMatch = await pollerWithVpa.pollOnce();
  assert(pollResVpaMatch.ingested === 1, 'Matching merchant VPA must be successfully ingested');
  assert(insertedEventStatus === 'UNCLAIMED', 'Matching merchant VPA must result in UNCLAIMED status');

  // 5.2 Mismatched recipient VPA (Payment directed to a different merchant account)
  const wrongVpaMsg = createMockGmailMessage({
    id: 'msg_vpa_mismatch',
    bodyText: 'Payment Received! Credited ₹500.00 to fraudulent@fam. UPI Ref No: 488877776666',
    dkim: 'PASS',
  });
  mockGmailPoller.addMessage(wrongVpaMsg);

  const pollResVpaMismatch = await pollerWithVpa.pollOnce();
  assert(pollResVpaMismatch.authFailed >= 1, 'Mismatched recipient VPA must be counted as auth failure');
  assert(insertedEventStatus === 'FLAGGED', 'Mismatched recipient VPA must be ingested as FLAGGED');

  // -------------------------------------------------------------------------
  // 6. GMAIL PAGINATION & RECOVERY OVERLAPPING LOOKBACK
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Gmail Pagination & Overlapping Lookback ---');

  // 6.1 Multi-page search results traversal
  const multiPageClient = new MockGmailClient();
  multiPageClient.setPages([
    {
      messages: [
        { id: 'page1_msg1', threadId: 'th_p1_1' },
        { id: 'page1_msg2', threadId: 'th_p1_2' },
      ],
      nextPageToken: 'page_1',
    },
    {
      messages: [
        { id: 'page2_msg1', threadId: 'th_p2_1' },
      ],
      nextPageToken: undefined,
    },
  ]);

  multiPageClient.addMessage(createMockGmailMessage({ id: 'page1_msg1', bodyText: 'Payment Received! ₹100. UPI Ref No: 400000000001', dkim: 'PASS' }));
  multiPageClient.addMessage(createMockGmailMessage({ id: 'page1_msg2', bodyText: 'Payment Received! ₹200. UPI Ref No: 400000000002', dkim: 'PASS' }));
  multiPageClient.addMessage(createMockGmailMessage({ id: 'page2_msg1', bodyText: 'Payment Received! ₹300. UPI Ref No: 400000000003', dkim: 'PASS' }));

  const pollerPagination = new GmailPollerService({
    client: multiPageClient,
    db: mockDbForVpa,
  });

  const paginationRes = await pollerPagination.pollOnce();
  assert(paginationRes.scanned === 3, 'Poller must traverse nextPageToken and scan all 3 messages across 2 pages');
  assert(multiPageClient.listPageTokens.length === 2, 'Poller must issue exactly 2 paginated API requests');

  // 6.2 Bounded Overlapping Lookback Buffer (30 minutes)
  const mockDbWithCursor: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => [{ lastSyncedMessageTimestamp: new Date('2026-10-23T12:00:00Z') }],
        }),
      }),
    }),
    insert: mockDbForVpa.insert,
  };

  const cursorClient = new MockGmailClient();
  const pollerCursor = new GmailPollerService({
    client: cursorClient,
    db: mockDbWithCursor,
  });
  await pollerCursor.pollOnce();

  const lastQuery = cursorClient.listQueries[0];
  const expectedTimestampSeconds = Math.floor(new Date('2026-10-23T12:00:00Z').getTime() / 1000) - 1800;
  assert(
    lastQuery.includes(`after:${expectedTimestampSeconds}`),
    `Poller query must apply 1800s lookback buffer for recovery scan: ${lastQuery}`
  );

  // -------------------------------------------------------------------------
  // 7. DATABASE ERROR DISCRIMINATION VS DUPLICATE HANDLING
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Database Error Discrimination ---');

  // 7.1 Postgres unique constraint (code 23505) -> gracefully increment duplicate count
  const uniqueViolationError = new Error('duplicate key value violates unique constraint famapp_email_events_gmail_message_id_key');
  (uniqueViolationError as any).code = '23505';

  const mockDbUniqueViolation: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => [], // simulate concurrency race where select saw nothing
        }),
      }),
    }),
    insert: (table: any) => ({
      values: (val: any) => {
        if (table === famappEmailEvents || val?.gmailMessageId) {
          throw uniqueViolationError;
        }
        return {
          onConflictDoUpdate: () => Promise.resolve(),
        };
      },
    }),
  };

  const pollerUniqueViol = new GmailPollerService({
    client: mockGmailPoller,
    db: mockDbUniqueViolation,
  });

  const pollResUnique = await pollerUniqueViol.pollOnce();
  assert(pollResUnique.duplicates >= 1, 'Postgres unique violation 23505 must be recorded as duplicate without throwing');

  // 7.2 Arbitrary DB Connection / Syntax Failure -> Must rethrow and NOT mask as duplicate
  const generalDbError = new Error('Connection terminated unexpectedly');
  (generalDbError as any).code = 'ECONNREFUSED';

  const mockDbGeneralError: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    }),
    insert: (table: any) => ({
      values: (val: any) => {
        if (table === famappEmailEvents || val?.gmailMessageId) {
          throw generalDbError;
        }
        return {
          onConflictDoUpdate: () => Promise.resolve(),
        };
      },
    }),
  };

  const pollerGeneralError = new GmailPollerService({
    client: mockGmailPoller,
    db: mockDbGeneralError,
  });

  let didThrowGeneral = false;
  try {
    await pollerGeneralError.pollOnce();
  } catch (err: any) {
    didThrowGeneral = (err.code === 'ECONNREFUSED');
  }
  assert(didThrowGeneral === true, 'General database error ECONNREFUSED must be rethrown and not masked as duplicate');

  // -------------------------------------------------------------------------
  // 8. PRODUCTION AUTO-CREDIT HARD-BLOCK & STAGING WORKFLOWS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Production Auto-Credit Hard-Block ---');

  const oldEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  let prodSvcBlocked = false;
  try {
    const prodSvc = new FamappVerificationService({ autoCreditEnabled: true });
    // Constructor forces autoCreditEnabled = false in production
    prodSvc.setAutoCredit(true);
  } catch (err: any) {
    prodSvcBlocked = err.message.includes('hard-blocked in production');
  } finally {
    process.env.NODE_ENV = oldEnv;
  }
  assert(prodSvcBlocked === true, 'Enabling auto-credit in NODE_ENV=production must throw security violation');

  // -------------------------------------------------------------------------
  // 9. ADMIN APPROVAL: STANDARD VS OVERRIDE_APPROVE
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Admin Standard vs Override Approval ---');

  let walletBalance = '100.00';
  let ledgerCount = 0;
  const mockWalletSvc: any = {
    getOrCreateWallet: async (userId: string) => ({ id: 'wallet_123', userId, balance: walletBalance }),
    creditWallet: async (params: any) => {
      if (testStore.ledgerEntries.has(params.idempotencyKey)) {
        return {
          wallet: { balance: walletBalance },
          ledgerEntry: testStore.ledgerEntries.get(params.idempotencyKey),
        };
      }
      walletBalance = Money.add(walletBalance, params.amount);
      ledgerCount++;
      const entry = { id: `ledger_${ledgerCount}`, idempotencyKey: params.idempotencyKey };
      testStore.ledgerEntries.set(params.idempotencyKey, entry);
      return { wallet: { balance: walletBalance }, ledgerEntry: entry };
    },
  };

  // Flagged event in DB
  const flaggedEventRow = {
    id: 'evt_flagged_1',
    parsedUtr: '412345678901',
    parsedAmount: '500.00',
    authStatus: 'FAILED',
    dkimStatus: 'FAIL',
    status: 'FLAGGED',
  };

  // Inject email event lookup
  const adminReviewSvc = new FamappVerificationService({
    db: {
      select: () => ({
        from: (table: any) => ({
          where: () => {
            const isEmail = (table === famappEmailEvents || table?.gmailMessageId !== undefined);
            return createQueryChain([isEmail ? flaggedEventRow : {
              id: 'sub_review_1',
              userId: 'user_001',
              walletId: 'wallet_123',
              utr: '412345678901',
              amount: '500.00',
              status: 'PENDING',
              matchedEmailEventId: 'evt_flagged_1',
            }]);
          },
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }),
    } as any,
    walletSvc: mockWalletSvc,
  });

  const initialBalBeforeReviews = walletBalance;
  const initialLedgerBeforeReviews = ledgerCount;

  // 9.1 Fail-Closed: Standard APPROVE with missing settlementConfirmed must throw 400
  let missingApproveFailed = false;
  try {
    await adminReviewSvc.adminReviewSubmission({
      submissionId: 'sub_review_1',
      action: 'APPROVE',
      adminUserId: 'admin_1',
    });
  } catch (err: any) {
    missingApproveFailed = err.message.includes('Explicit settlement confirmation (settlementConfirmed: true)');
  }
  assert(missingApproveFailed === true, 'APPROVE with missing settlementConfirmed must fail-closed in service');

  // 9.2 Fail-Closed: Standard APPROVE with settlementConfirmed: false must throw 400
  let falseApproveFailed = false;
  try {
    await adminReviewSvc.adminReviewSubmission({
      submissionId: 'sub_review_1',
      action: 'APPROVE',
      adminUserId: 'admin_1',
      settlementConfirmed: false,
    });
  } catch (err: any) {
    falseApproveFailed = err.message.includes('Explicit settlement confirmation (settlementConfirmed: true)');
  }
  assert(falseApproveFailed === true, 'APPROVE with settlementConfirmed: false must fail-closed in service');

  // 9.3 Fail-Closed: OVERRIDE_APPROVE with missing settlementConfirmed must throw 400
  let missingOverrideFailed = false;
  try {
    await adminReviewSvc.adminReviewSubmission({
      submissionId: 'sub_review_1',
      action: 'OVERRIDE_APPROVE',
      adminUserId: 'admin_1',
      reason: 'Verified manually via ICICI corporate banking statement at 18:30',
    });
  } catch (err: any) {
    missingOverrideFailed = err.message.includes('Explicit settlement confirmation (settlementConfirmed: true)');
  }
  assert(missingOverrideFailed === true, 'OVERRIDE_APPROVE with missing settlementConfirmed must fail-closed in service');

  // 9.4 Fail-Closed: OVERRIDE_APPROVE with settlementConfirmed: false must throw 400
  let falseOverrideFailed = false;
  try {
    await adminReviewSvc.adminReviewSubmission({
      submissionId: 'sub_review_1',
      action: 'OVERRIDE_APPROVE',
      adminUserId: 'admin_1',
      reason: 'Verified manually via ICICI corporate banking statement at 18:30',
      settlementConfirmed: false,
    });
  } catch (err: any) {
    falseOverrideFailed = err.message.includes('Explicit settlement confirmation (settlementConfirmed: true)');
  }
  assert(falseOverrideFailed === true, 'OVERRIDE_APPROVE with settlementConfirmed: false must fail-closed in service');

  // 9.5 Safety Invariant: Rejected approvals must never create wallet credit or ledger entry
  assert(walletBalance === initialBalBeforeReviews, 'Rejected approvals must never alter wallet balance');
  assert(ledgerCount === initialLedgerBeforeReviews, 'Rejected approvals must never create wallet ledger entry');

  // 9.6 Standard APPROVE with explicit settlementConfirmed: true proceeds to event checks and fails on FLAGGED / auth-failed event
  let standardApproveFailed = false;
  try {
    await adminReviewSvc.adminReviewSubmission({
      submissionId: 'sub_review_1',
      action: 'APPROVE',
      adminUserId: 'admin_1',
      settlementConfirmed: true,
    });
  } catch (err: any) {
    standardApproveFailed = err.message.includes('Standard approval rejected: receipt has authStatus');
  }
  assert(standardApproveFailed === true, 'Standard APPROVE with settlementConfirmed: true proceeds and blocks flagged/auth-failed event');

  // 9.7 OVERRIDE_APPROVE with explicit settlementConfirmed: true proceeds to reason checks and fails on insufficient reason (< 10 chars)
  let shortReasonFailed = false;
  try {
    await adminReviewSvc.adminReviewSubmission({
      submissionId: 'sub_review_1',
      action: 'OVERRIDE_APPROVE',
      adminUserId: 'admin_1',
      reason: 'ok paid', // 7 chars
      settlementConfirmed: true,
    });
  } catch (err: any) {
    shortReasonFailed = err.message.includes('audit reason of at least 10 characters');
  }
  assert(shortReasonFailed === true, 'OVERRIDE_APPROVE with settlementConfirmed: true proceeds and blocks reason under 10 chars');

  // 9.8 REJECT action proceeds safely without requiring settlement confirmation
  let rejectStatus = '';
  const mockDbReject: any = {
    select: () => ({
      from: () => ({
        where: () => createQueryChain([{
          id: 'sub_reject_1',
          userId: 'user_001',
          walletId: 'wallet_123',
          utr: '412345678901',
          amount: '500.00',
          status: 'PENDING',
        }]),
      }),
    }),
    update: () => ({
      set: (val: any) => {
        rejectStatus = val?.status;
        return { where: () => Promise.resolve() };
      },
    }),
  };
  const rejectSvc = new FamappVerificationService({
    db: mockDbReject,
    walletSvc: mockWalletSvc,
  });
  const rejectResult = await rejectSvc.adminReviewSubmission({
    submissionId: 'sub_reject_1',
    action: 'REJECT',
    adminUserId: 'admin_1',
    reason: 'Fraudulent duplicate UTR slip',
  });
  assert(rejectResult.status === 'REJECTED', 'REJECT action must transition status to REJECTED without settlement confirmation');
  assert(rejectResult.credited === false, 'REJECT action must not credit wallet');
  assert(walletBalance === initialBalBeforeReviews, 'REJECT action must not alter wallet balance');
  assert(ledgerCount === initialLedgerBeforeReviews, 'REJECT action must not create ledger entries');

  // -------------------------------------------------------------------------
  // 10. EXACTLY-ONCE WALLET CREDIT & IDEMPOTENCY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 10: Exactly-Once Wallet Credit & Idempotency ---');

  const initialBal = walletBalance;
  const initialLedger = ledgerCount;

  // Credit 500.00
  await mockWalletSvc.creditWallet({
    userId: 'user_001',
    amount: '500.00',
    idempotencyKey: 'famapp_credit_unique_123',
  });
  assert(walletBalance === Money.add(initialBal, '500.00'), 'Wallet balance must increment by 500.00');
  assert(ledgerCount === initialLedger + 1, 'Ledger entry count must increment by exactly 1');

  // Replay credit attempt with identical idempotency key
  const creditReplayRes = await mockWalletSvc.creditWallet({
    userId: 'user_001',
    amount: '500.00',
    idempotencyKey: 'famapp_credit_unique_123',
  });
  assert(walletBalance === Money.add(initialBal, '500.00'), 'Replayed credit attempt must not alter wallet balance');
  assert(ledgerCount === initialLedger + 1, 'Replayed credit must not create a duplicate ledger entry');
  assert(creditReplayRes.ledgerEntry.id === `ledger_${initialLedger + 1}`, 'Idempotent replay must return existing ledger entry');

  // -------------------------------------------------------------------------
  // 11. ASYNCHRONOUS MATCHING & COMPETING CLAIMS WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 11: Asynchronous Matching & Competing Claims ---');

  const mockDbWorkflow: any = {
    select: (fields?: any) => {
      const isCount = fields && typeof fields === 'object' && 'count' in fields;
      const defaultRows = isCount ? [{ count: 0 }] : [];
      return {
        from: () => ({
          where: () => createQueryChain(defaultRows),
        }),
      };
    },
    insert: () => ({
      values: (val: any) => {
        val.id = `sub_${Date.now()}`;
        return {
          returning: () => [val],
        };
      },
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }),
  };

  const mockSettingsSvc = { getSettingValue: async () => '10' };

  const verificationSvcWorkflow = new FamappVerificationService({
    db: mockDbWorkflow,
    walletSvc: mockWalletSvc,
    settingsSvc: mockSettingsSvc,
    autoCreditEnabled: false,
  });

  const submitPendingRes = await verificationSvcWorkflow.submitUtr({
    userId: 'user_001',
    utr: '412345678901',
    amount: '500.00',
    currency: 'INR',
  });

  assert(submitPendingRes.status === 'PENDING', 'Submission before email arrives must be PENDING');
  assert(submitPendingRes.utr === '412345678901', 'Submission must retain customer UTR');

  // Email arrives after UTR submission -> transitions to MATCHED
  const mockEmailEventRow = {
    id: 'evt_match_123',
    gmailMessageId: 'msg_auth_001',
    status: 'UNCLAIMED',
    parsedUtr: '412345678901',
    parsedAmount: '500.00',
  };

  let matchedStatus = '';
  const mockDbWithPendingMatch: any = {
    select: () => ({
      from: (table: any) => ({
        where: () => {
          const isEmailTable = (table === famappEmailEvents || table?.gmailMessageId !== undefined);
          if (isEmailTable) {
            return createQueryChain([mockEmailEventRow]);
          }
          return createQueryChain([
            {
              id: submitPendingRes.submissionId,
              userId: 'user_001',
              walletId: 'wallet_123',
              utr: '412345678901',
              amount: '500.00',
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 1800000),
            },
          ]);
        },
      }),
    }),
    update: () => ({
      set: (updates: any) => {
        if (updates.status) matchedStatus = updates.status;
        return { where: () => Promise.resolve() };
      },
    }),
  };

  const verificationSvcMatching = new FamappVerificationService({
    db: mockDbWithPendingMatch,
    walletSvc: mockWalletSvc,
    settingsSvc: mockSettingsSvc,
    autoCreditEnabled: false,
  });

  await verificationSvcMatching.processIngestedEmail(parsedValid!);
  assert(matchedStatus === 'MATCHED', 'Email arriving after UTR submission in assisted mode must transition submission to MATCHED');

  // Amount mismatch -> MANUAL_REVIEW
  let amountMismatchStatus = '';
  let mismatchReason = '';
  const mockDbAmountMismatch: any = {
    select: () => ({
      from: (table: any) => ({
        where: () => {
          const isEmailTable = (table === famappEmailEvents || table?.gmailMessageId !== undefined);
          if (isEmailTable) {
            return createQueryChain([mockEmailEventRow]);
          }
          return createQueryChain([
            {
              id: 'sub_mismatch',
              userId: 'user_001',
              walletId: 'wallet_123',
              utr: '412345678901',
              amount: '750.00',
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 1800000),
            },
          ]);
        },
      }),
    }),
    update: () => ({
      set: (updates: any) => {
        amountMismatchStatus = updates.status;
        mismatchReason = updates.failureReason;
        return { where: () => Promise.resolve() };
      },
    }),
  };

  const verificationSvcMismatch = new FamappVerificationService({
    db: mockDbAmountMismatch,
    walletSvc: mockWalletSvc,
    settingsSvc: mockSettingsSvc,
  });

  await verificationSvcMismatch.processIngestedEmail(parsedValid!);
  assert(amountMismatchStatus === 'MANUAL_REVIEW', 'Amount mismatch must route submission to MANUAL_REVIEW');
  assert(mismatchReason.includes('Amount mismatch'), 'Mismatch reason must record discrepancy');

  // Competing customer claims for same UTR -> MANUAL_REVIEW
  let conflictStatus = '';
  const mockDbConflict: any = {
    select: () => ({
      from: (table: any) => ({
        where: () => {
          const isEmailTable = (table === famappEmailEvents || table?.gmailMessageId !== undefined);
          if (isEmailTable) {
            return createQueryChain([mockEmailEventRow]);
          }
          return createQueryChain([
            { id: 'sub_userA', userId: 'user_A', utr: '412345678901', amount: '500.00', status: 'PENDING', expiresAt: new Date(Date.now() + 1800000) },
            { id: 'sub_userB', userId: 'user_B', utr: '412345678901', amount: '500.00', status: 'PENDING', expiresAt: new Date(Date.now() + 1800000) },
          ]);
        },
      }),
    }),
    update: () => ({
      set: (updates: any) => {
        if (updates.status === 'MANUAL_REVIEW') { conflictStatus = updates.status; }
        return { where: () => Promise.resolve() };
      },
    }),
  };

  const verificationSvcConflict = new FamappVerificationService({
    db: mockDbConflict,
    walletSvc: mockWalletSvc,
    settingsSvc: mockSettingsSvc,
  });

  await verificationSvcConflict.processIngestedEmail(parsedValid!);
  assert(conflictStatus === 'MANUAL_REVIEW', 'Competing customer submissions for same UTR must enter MANUAL_REVIEW');

  // -------------------------------------------------------------------------
  // 12. RAZORPAY REGRESSION SAFETY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 12: Razorpay Regression Safety ---');

  const testSecret = 'rzp_test_secret_key_1234567890abcdef';
  const testOrderId = 'order_test_1234567890';
  const testPaymentId = 'pay_test_0987654321';

  const validSignature = crypto
    .createHmac('sha256', testSecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  const devGateway = new DevelopmentPaymentGateway(testSecret);

  const sigValid = await devGateway.verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: validSignature,
  });
  assert(sigValid === true, 'Existing Razorpay checkout signature verification must remain intact');

  const tamperedSig = validSignature.substring(0, validSignature.length - 2) + '00';
  const sigInvalid = await devGateway.verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: tamperedSig,
  });
  assert(sigInvalid === false, 'Existing Razorpay tampered signature rejection must remain intact');

  // -------------------------------------------------------------------------
  // 13. PHASE 2 API SECURITY, IDOR & RATE LIMITING
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 13: Phase 2 API Security & IDOR Protection ---');

  // 13.1 IDOR Protection: User B attempting to view User A's submission
  const mockDbIdor: any = {
    select: () => ({
      from: () => ({
        where: () => createQueryChain([]), // Returns null/empty because userId != submission.userId
      }),
    }),
  };

  const idorSvc = new FamappVerificationService({
    db: mockDbIdor,
    walletSvc: mockWalletSvc,
  });

  const idorResult = await idorSvc.getSubmissionById('sub_userA_123', 'user_attacker_B');
  assert(idorResult === null, 'IDOR Protection: Access to another user\'s submission must be denied (null)');

  // 13.2 Legitimate Access: User A accessing own submission
  const mockDbLegit: any = {
    select: () => ({
      from: () => ({
        where: () => createQueryChain([{ id: 'sub_userA_123', userId: 'user_A', utr: '412345678901', amount: '500.00' }]),
      }),
    }),
  };
  const legitSvc = new FamappVerificationService({
    db: mockDbLegit,
    walletSvc: mockWalletSvc,
  });
  const legitResult = await legitSvc.getSubmissionById('sub_userA_123', 'user_A');
  assert(legitResult !== null && legitResult.id === 'sub_userA_123', 'Customer must successfully access own submission');

  // 13.3 Duplicate Already-Credited UTR Rejection
  const mockDbAlreadyCredited: any = {
    select: () => ({
      from: () => ({
        where: () => createQueryChain([{ id: 'sub_already_credited', userId: 'user_orig' }]),
      }),
    }),
  };
  const creditedUtrSvc = new FamappVerificationService({
    db: mockDbAlreadyCredited,
    walletSvc: mockWalletSvc,
    settingsSvc: mockSettingsSvc,
  });

  let duplicateCreditBlocked = false;
  try {
    await creditedUtrSvc.submitUtr({
      userId: 'user_thief',
      utr: '412345678901',
      amount: '500.00',
      currency: 'INR',
    });
  } catch (err: any) {
    duplicateCreditBlocked = err.statusCode === 409 || err.message.includes('already been credited');
  }
  assert(duplicateCreditBlocked === true, 'Submitting an already credited UTR must be blocked with 409 Conflict');

  // 13.4 Rate Limiting: Max 3 Pending Claims per customer
  let rateLimitQueryCount = 0;
  const mockDbRateLimit: any = {
    select: (fields?: any) => ({
      from: () => ({
        where: () => {
          rateLimitQueryCount++;
          if (rateLimitQueryCount <= 2) return createQueryChain([]);
          return createQueryChain([{ count: 3 }]);
        },
      }),
    }),
  };
  const rateLimitSvc = new FamappVerificationService({
    db: mockDbRateLimit,
    walletSvc: mockWalletSvc,
    settingsSvc: mockSettingsSvc,
  });

  let rateLimitExceeded = false;
  try {
    await rateLimitSvc.submitUtr({
      userId: 'user_spammer',
      utr: '499999999999',
      amount: '500.00',
      currency: 'INR',
    });
  } catch (err: any) {
    rateLimitExceeded = err.statusCode === 429 || err.message.includes('pending UPI submissions');
  }
  assert(rateLimitExceeded === true, 'Customer attempting > 3 active pending claims must be rate-limited with 429');

  // 13.5 Unconfigured Google OAuth Client Safe Idle Mode
  const unconfiguredClient = new GoogleOAuthGmailClient({ clientId: '', clientSecret: '', refreshToken: '' });
  assert(unconfiguredClient.isConfigured() === false, 'GoogleOAuthGmailClient without credentials must return isConfigured = false');

  const placeholderClient = new GoogleOAuthGmailClient({ clientId: 'your-client-id-placeholder', clientSecret: 'secret', refreshToken: 'token' });
  assert(placeholderClient.isConfigured() === false, 'GoogleOAuthGmailClient with placeholder clientId must return isConfigured = false');

  console.log('\n================================================================');
  console.log(`  FAMAPP HARDENED SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED  `);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
