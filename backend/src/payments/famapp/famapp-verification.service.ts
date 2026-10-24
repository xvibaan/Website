import { withTransaction, DbTransaction, getDb, DbClient } from '../../db/client';
import {
  famappEmailEvents,
  upiPaymentSubmissions,
  famappSyncState,
  UpiPaymentSubmission,
  FamappEmailEvent,
} from '../../db/schema/famapp';
import { paymentTransactions } from '../../db/schema/payment-transactions';
import { WalletService, walletService } from '../../wallet/wallet.service';
import { Money } from '../../wallet/money';
import {
  SubmitUtrParams,
  SubmitUtrResult,
  ClaimResult,
  AdminReviewParams,
  ParsedFamappEmail,
  FamappAdminStats,
} from './famapp.types';
import { eq, and, or, sql, desc, count, ne, inArray, gt, lt } from 'drizzle-orm';
import { alertService } from '../../admin/services/alert.service';
import { settingsAdminService } from '../../admin/services/settings.service';

export class FamappVerificationService {
  private db: DbClient;
  private walletSvc: WalletService;
  private settingsSvc: { getSettingValue(key: string, defaultVal: string): Promise<string> };
  private autoCreditEnabled: boolean;

  constructor(options?: {
    db?: DbClient;
    walletSvc?: WalletService;
    settingsSvc?: { getSettingValue(key: string, defaultVal: string): Promise<string> };
    autoCreditEnabled?: boolean;
  }) {
    this.db = options?.db || getDb();
    this.walletSvc = options?.walletSvc || walletService;
    this.settingsSvc = options?.settingsSvc || settingsAdminService;

    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && options?.autoCreditEnabled) {
      console.warn('[FamApp Security] Auto-credit requested in production; forcing disabled.');
      this.autoCreditEnabled = false;
    } else {
      this.autoCreditEnabled = options?.autoCreditEnabled ?? false;
    }
  }

  setAutoCredit(enabled: boolean): void {
    if (process.env.NODE_ENV === 'production' && enabled) {
      throw new Error('SECURITY VIOLATION: Automated wallet crediting from Gmail matching is hard-blocked in production.');
    }
    this.autoCreditEnabled = enabled;
  }

  /**
   * Customer submits a 12-digit UTR/RRN to claim a wallet top-up.
   * Does NOT grant a permanent reservation on the UTR.
   */
  async submitUtr(params: SubmitUtrParams): Promise<SubmitUtrResult> {
    const amount = Money.format(params.amount);
    if (!Money.isPositive(amount)) {
      const err: any = new Error('Deposit amount must be greater than zero');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // Minimum deposit verification from system settings
    const minDepositStr = await this.settingsSvc.getSettingValue('min_deposit_inr', '10');
    const minDeposit = Money.format(minDepositStr);
    if (!Money.isGreaterThanOrEqual(amount, minDeposit)) {
      const err: any = new Error(
        `Minimum deposit amount is ₹${minDeposit} for INR. You entered ₹${amount}.`
      );
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // Strictly validate 12-digit UTR numeric format
    const utr = params.utr.trim();
    if (!/^[0-9]{12}$/.test(utr)) {
      const err: any = new Error('UTR/RRN must be exactly 12 numeric digits');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // 1. Check if this UTR has ALREADY been credited in the system
    const [alreadyCredited] = await this.db
      .select({ id: upiPaymentSubmissions.id, userId: upiPaymentSubmissions.userId })
      .from(upiPaymentSubmissions)
      .where(and(eq(upiPaymentSubmissions.utr, utr), eq(upiPaymentSubmissions.status, 'CREDITED')))
      .limit(1);

    if (alreadyCredited) {
      const err: any = new Error(
        'This 12-digit transaction reference (UTR) has already been credited to an account.'
      );
      err.statusCode = 409;
      err.name = 'Conflict';
      throw err;
    }

    // 2. Check if this customer already has an active pending submission for this exact UTR
    const [existingUserPending] = await this.db
      .select()
      .from(upiPaymentSubmissions)
      .where(
        and(
          eq(upiPaymentSubmissions.userId, params.userId),
          eq(upiPaymentSubmissions.utr, utr),
          eq(upiPaymentSubmissions.status, 'PENDING')
        )
      )
      .limit(1);

    if (existingUserPending) {
      return {
        success: true,
        submissionId: existingUserPending.id,
        status: 'PENDING',
        message: 'A verification submission for this UTR is already pending review or email match.',
        utr: existingUserPending.utr,
        amount: existingUserPending.amount,
        expiresAt: existingUserPending.expiresAt,
      };
    }

    // 3. Rate limiting / Spam prevention: Max 3 active pending claims per customer
    const [pendingCountResult] = await this.db
      .select({ count: count() })
      .from(upiPaymentSubmissions)
      .where(
        and(
          eq(upiPaymentSubmissions.userId, params.userId),
          eq(upiPaymentSubmissions.status, 'PENDING')
        )
      );

    if (Number(pendingCountResult?.count || 0) >= 3) {
      const err: any = new Error(
        'You have 3 pending UPI submissions awaiting verification. Please wait for them to resolve.'
      );
      err.statusCode = 429;
      err.name = 'TooManyRequests';
      throw err;
    }

    // Resolve customer's central marketplace wallet
    const wallet = await this.walletSvc.getOrCreateWallet(params.userId);

    // 30 minute expiry window for customer claims
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // 4. Create submission record in PENDING status
    const [submission] = await this.db
      .insert(upiPaymentSubmissions)
      .values({
        userId: params.userId,
        walletId: wallet.id,
        utr,
        amount,
        currency: 'INR',
        status: 'PENDING',
        expiresAt,
      })
      .returning();

    // 5. Check if an authoritative, unclaimed email event ALREADY exists for this UTR
    const [matchingEmailEvent] = await this.db
      .select()
      .from(famappEmailEvents)
      .where(
        and(
          eq(famappEmailEvents.parsedUtr, utr),
          eq(famappEmailEvents.status, 'UNCLAIMED')
        )
      )
      .limit(1);

    if (matchingEmailEvent) {
      // Check for competing pending submissions on the same UTR from other users
      const competingClaims = await this.db
        .select({ id: upiPaymentSubmissions.id, userId: upiPaymentSubmissions.userId })
        .from(upiPaymentSubmissions)
        .where(
          and(
            eq(upiPaymentSubmissions.utr, utr),
            ne(upiPaymentSubmissions.id, submission.id),
            eq(upiPaymentSubmissions.status, 'PENDING')
          )
        );

      if (competingClaims.length > 0) {
        // Conflicting claims detected -> Flag for manual review
        await this.db
          .update(upiPaymentSubmissions)
          .set({
            status: 'MANUAL_REVIEW',
            failureReason: 'Conflicting claims submitted by multiple users for the same UTR',
            matchedEmailEventId: matchingEmailEvent.id,
          })
          .where(
            or(
              eq(upiPaymentSubmissions.id, submission.id),
              inArray(upiPaymentSubmissions.id, competingClaims.map((c) => c.id))
            )
          );

        alertService.raiseAlert({
          type: 'WEBHOOK_FAILURE',
          severity: 'HIGH',
          message: `Conflicting UTR claim detected for UTR ${utr}`,
          details: { utr, users: [params.userId, ...competingClaims.map((c) => c.userId)] },
        }).catch(console.error);

        return {
          success: true,
          submissionId: submission.id,
          status: 'MANUAL_REVIEW',
          message: 'Conflicting submissions detected for this reference; routed for Admin manual review.',
          utr: submission.utr,
          amount: submission.amount,
          expiresAt: submission.expiresAt,
        };
      }

      // Check amount match
      const eventAmount = Money.format(matchingEmailEvent.parsedAmount);
      if (amount !== eventAmount) {
        await this.db
          .update(upiPaymentSubmissions)
          .set({
            status: 'MANUAL_REVIEW',
            failureReason: `Amount mismatch: customer submitted ₹${amount}, bank email reported ₹${eventAmount}`,
            matchedEmailEventId: matchingEmailEvent.id,
          })
          .where(eq(upiPaymentSubmissions.id, submission.id));

        return {
          success: true,
          submissionId: submission.id,
          status: 'MANUAL_REVIEW',
          message: `Amount mismatch (Submitted: ₹${amount}, Received: ₹${eventAmount}). Sent for Admin review.`,
          utr: submission.utr,
          amount: submission.amount,
          expiresAt: submission.expiresAt,
        };
      }

      // If auto-credit is enabled (non-production staging only), execute atomic credit
      if (this.autoCreditEnabled) {
        await this.claimAndCredit(submission.id, matchingEmailEvent.id);
        return {
          success: true,
          submissionId: submission.id,
          status: 'CREDITED',
          message: 'Payment verified successfully and wallet credited.',
          utr: submission.utr,
          amount: submission.amount,
          expiresAt: submission.expiresAt,
        };
      } else {
        // Default assisted-review mode: mark as MATCHED awaiting admin sign-off
        await this.db
          .update(upiPaymentSubmissions)
          .set({
            status: 'MATCHED',
            matchedEmailEventId: matchingEmailEvent.id,
            adminNotes: 'Automated match found in Gmail; awaiting Admin confirmation.',
          })
          .where(eq(upiPaymentSubmissions.id, submission.id));

        return {
          success: true,
          submissionId: submission.id,
          status: 'MATCHED',
          message: 'Incoming bank transfer matched; awaiting final Admin review.',
          utr: submission.utr,
          amount: submission.amount,
          expiresAt: submission.expiresAt,
        };
      }
    }

    return {
      success: true,
      submissionId: submission.id,
      status: 'PENDING',
      message: 'Submission received. Awaiting incoming payment notification from bank.',
      utr: submission.utr,
      amount: submission.amount,
      expiresAt: submission.expiresAt,
    };
  }

  /**
   * Called by Gmail poller whenever an incoming email is parsed.
   * Checks if any pending customer submission is waiting for this UTR.
   */
  async processIngestedEmail(parsedEvent: ParsedFamappEmail): Promise<void> {
    const utr = parsedEvent.parsedUtr;
    const eventAmount = Money.format(parsedEvent.parsedAmount);

    // Find email event ID in DB
    const [emailEvent] = await this.db
      .select()
      .from(famappEmailEvents)
      .where(eq(famappEmailEvents.gmailMessageId, parsedEvent.gmailMessageId))
      .limit(1);

    if (!emailEvent || emailEvent.status !== 'UNCLAIMED') {
      return;
    }

    // Find pending customer submissions for this UTR
    const pendingSubmissions = await this.db
      .select()
      .from(upiPaymentSubmissions)
      .where(
        and(
          eq(upiPaymentSubmissions.utr, utr),
          eq(upiPaymentSubmissions.status, 'PENDING'),
          gt(upiPaymentSubmissions.expiresAt, new Date())
        )
      );

    if (pendingSubmissions.length === 0) {
      return;
    }

    if (pendingSubmissions.length > 1) {
      // Conflict: Multiple customers claimed this UTR
      await this.db
        .update(upiPaymentSubmissions)
        .set({
          status: 'MANUAL_REVIEW',
          failureReason: 'Multiple users submitted claims for the same incoming payment UTR',
          matchedEmailEventId: emailEvent.id,
        })
        .where(inArray(upiPaymentSubmissions.id, pendingSubmissions.map((s) => s.id)));

      await this.db
        .update(famappEmailEvents)
        .set({ status: 'FLAGGED' })
        .where(eq(famappEmailEvents.id, emailEvent.id));

      alertService.raiseAlert({
        type: 'WEBHOOK_FAILURE',
        severity: 'HIGH',
        message: `Multiple customer claims conflict for incoming UTR ${utr}`,
        details: { utr, submissionIds: pendingSubmissions.map((s) => s.id) },
      }).catch(console.error);

      return;
    }

    const submission = pendingSubmissions[0];
    const subAmount = Money.format(submission.amount);

    // Verify amount match
    if (subAmount !== eventAmount) {
      await this.db
        .update(upiPaymentSubmissions)
        .set({
          status: 'MANUAL_REVIEW',
          failureReason: `Amount mismatch: submitted ₹${subAmount}, email received ₹${eventAmount}`,
          matchedEmailEventId: emailEvent.id,
        })
        .where(eq(upiPaymentSubmissions.id, submission.id));

      return;
    }

    // Match found!
    if (this.autoCreditEnabled) {
      await this.claimAndCredit(submission.id, emailEvent.id);
    } else {
      await this.db
        .update(upiPaymentSubmissions)
        .set({
          status: 'MATCHED',
          matchedEmailEventId: emailEvent.id,
          adminNotes: 'Automated match found in Gmail; awaiting Admin confirmation.',
        })
        .where(eq(upiPaymentSubmissions.id, submission.id));
    }
  }

  /**
   * ATOMIC CLAIM & CREDIT
   * Locks submission and email event row FOR UPDATE inside a database transaction,
   * verifies all invariants, records payment_transactions row, and executes wallet credit.
   */
  async claimAndCredit(
    submissionId: string,
    emailEventId: string,
    adminUserId?: string,
    isOverride: boolean = false,
    overrideReason?: string
  ): Promise<ClaimResult> {
    return withTransaction(async (tx: DbTransaction) => {
      // 1. Lock submission row FOR UPDATE
      const [submission] = await tx
        .select()
        .from(upiPaymentSubmissions)
        .where(eq(upiPaymentSubmissions.id, submissionId))
        .for('update')
        .limit(1);

      if (!submission) {
        throw new Error('UPI payment submission not found');
      }

      if (submission.status === 'CREDITED') {
        return {
          success: true,
          credited: false,
          status: 'CREDITED',
          message: 'Submission has already been credited.',
          submissionId: submission.id,
        };
      }

      // 2. Lock email event row FOR UPDATE
      const [emailEvent] = await tx
        .select()
        .from(famappEmailEvents)
        .where(eq(famappEmailEvents.id, emailEventId))
        .for('update')
        .limit(1);

      if (!emailEvent) {
        throw new Error('FamApp email event not found');
      }

      if (emailEvent.status === 'CLAIMED') {
        return {
          success: false,
          credited: false,
          status: submission.status as any,
          message: 'This email event has already been claimed by another transaction.',
          submissionId: submission.id,
        };
      }

      // 3. Strict Verification Invariants
      const subAmount = Money.format(submission.amount);
      const eventAmount = Money.format(emailEvent.parsedAmount);

      // UTR must strictly match between submission and email event ALWAYS
      if (submission.utr !== emailEvent.parsedUtr) {
        await tx
          .update(upiPaymentSubmissions)
          .set({
            status: 'MANUAL_REVIEW',
            failureReason: `UTR mismatch: submission ${submission.utr}, email has ${emailEvent.parsedUtr}`,
          })
          .where(eq(upiPaymentSubmissions.id, submission.id));

        return {
          success: false,
          credited: false,
          status: 'MANUAL_REVIEW',
          message: 'UTR mismatch between claim and bank email',
          submissionId: submission.id,
        };
      }

      // In normal approval, fail-closed check on authentication and amounts
      if (!isOverride) {
        if (emailEvent.authStatus !== 'VERIFIED' || emailEvent.dkimStatus !== 'PASS') {
          const err: any = new Error(
            `Cannot approve receipt with auth status '${emailEvent.authStatus}' and DKIM '${emailEvent.dkimStatus}' via standard approval.`
          );
          err.statusCode = 400;
          err.name = 'BadRequest';
          throw err;
        }

        if (subAmount !== eventAmount) {
          await tx
            .update(upiPaymentSubmissions)
            .set({
              status: 'MANUAL_REVIEW',
              failureReason: `Amount mismatch: submitted ₹${subAmount}, email reported ₹${eventAmount}`,
              matchedEmailEventId: emailEvent.id,
            })
            .where(eq(upiPaymentSubmissions.id, submission.id));

          return {
            success: false,
            credited: false,
            status: 'MANUAL_REVIEW',
            message: `Amount mismatch: submitted ₹${subAmount}, email reported ₹${eventAmount}`,
            submissionId: submission.id,
          };
        }
      } else {
        // Exceptional override requires mandatory reason
        if (!overrideReason || overrideReason.trim().length < 10) {
          const err: any = new Error('Exceptional manual override requires an audit reason of at least 10 characters.');
          err.statusCode = 400;
          err.name = 'BadRequest';
          throw err;
        }
      }

      // 4. Update Email Event to CLAIMED
      await tx
        .update(famappEmailEvents)
        .set({
          status: 'CLAIMED',
          claimedBySubmissionId: submission.id,
          claimedAt: new Date(),
        })
        .where(eq(famappEmailEvents.id, emailEvent.id));

      // 5. Insert into central payment_transactions
      const [payTx] = await tx
        .insert(paymentTransactions)
        .values({
          userId: submission.userId,
          walletId: submission.walletId,
          gateway: 'famapp_upi',
          gatewayPaymentId: emailEvent.parsedUtr,
          gatewayOrderId: submission.id,
          amount: subAmount,
          currency: 'INR',
          status: 'SUCCESS',
          purpose: 'WALLET_RECHARGE',
          idempotencyKey: `famapp_tx_${emailEvent.parsedUtr}`,
          completedAt: new Date(),
        })
        .returning();

      // 6. Update submission to CREDITED
      await tx
        .update(upiPaymentSubmissions)
        .set({
          status: 'CREDITED',
          paymentTransactionId: payTx.id,
          matchedEmailEventId: emailEvent.id,
          creditedAt: new Date(),
          reviewedBy: adminUserId || null,
          isOverridden: isOverride ? 'true' : 'false',
          overrideReason: overrideReason || null,
        })
        .where(eq(upiPaymentSubmissions.id, submission.id));

      // 7. Atomically credit customer wallet via authoritative walletService
      await this.walletSvc.creditWallet(
        {
          userId: submission.userId,
          amount: subAmount,
          currency: 'INR',
          referenceType: 'deposit',
          referenceId: payTx.id,
          idempotencyKey: `famapp_credit_${emailEvent.parsedUtr}`,
          description: `Wallet recharge via FamApp UPI (UTR: ${emailEvent.parsedUtr})`,
          createdBy: adminUserId || undefined,
          metadata: JSON.stringify({
            gateway: 'famapp_upi',
            utr: emailEvent.parsedUtr,
            senderName: emailEvent.parsedSenderName,
            senderVpa: emailEvent.parsedSenderVpa,
            emailEventId: emailEvent.id,
            submissionId: submission.id,
            isOverride,
            overrideReason: overrideReason || null,
          }),
        },
        tx
      );

      return {
        success: true,
        credited: true,
        status: 'CREDITED',
        message: 'Wallet credited successfully via FamApp UPI verification.',
        submissionId: submission.id,
        paymentTransactionId: payTx.id,
      };
    });
  }

  /**
   * Admin review handler supporting REJECT, standard APPROVE, and explicit OVERRIDE_APPROVE.
   */
  async adminReviewSubmission(params: AdminReviewParams): Promise<ClaimResult> {
    const [submission] = await this.db
      .select()
      .from(upiPaymentSubmissions)
      .where(eq(upiPaymentSubmissions.id, params.submissionId))
      .limit(1);

    if (!submission) {
      const err: any = new Error('Submission not found');
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    if (params.action === 'APPROVE' || params.action === 'OVERRIDE_APPROVE') {
      if (params.settlementConfirmed !== true) {
        const err: any = new Error(
          'Explicit settlement confirmation (settlementConfirmed: true) in merchant bank/FamApp account is required for approving payments.'
        );
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }
    }

    if (params.action === 'REJECT') {
      await this.db
        .update(upiPaymentSubmissions)
        .set({
          status: 'REJECTED',
          failureReason: params.reason || 'Rejected by administrator',
          reviewedBy: params.adminUserId,
          updatedAt: new Date(),
        })
        .where(eq(upiPaymentSubmissions.id, submission.id));

      return {
        success: true,
        credited: false,
        status: 'REJECTED',
        message: 'Submission marked as REJECTED by administrator.',
        submissionId: submission.id,
      };
    }

    // Resolve matching email event
    let emailEventId = submission.matchedEmailEventId;
    if (!emailEventId) {
      const [emailEvent] = await this.db
        .select({ id: famappEmailEvents.id })
        .from(famappEmailEvents)
        .where(
          and(
            eq(famappEmailEvents.parsedUtr, submission.utr),
            or(
              eq(famappEmailEvents.status, 'UNCLAIMED'),
              eq(famappEmailEvents.status, 'FLAGGED')
            )
          )
        )
        .limit(1);

      if (!emailEvent) {
        const err: any = new Error(
          'Cannot approve: No incoming payment notification found in Gmail records matching this UTR.'
        );
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }
      emailEventId = emailEvent.id;
    }

    const [eventRow] = await this.db
      .select()
      .from(famappEmailEvents)
      .where(eq(famappEmailEvents.id, emailEventId))
      .limit(1);

    if (!eventRow) {
      const err: any = new Error('Referenced email event record not found.');
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    // Standard APPROVE: strictly disallow unverified or flagged events
    if (params.action === 'APPROVE') {
      if (
        eventRow.authStatus !== 'VERIFIED' ||
        eventRow.dkimStatus !== 'PASS' ||
        eventRow.status === 'FLAGGED' ||
        eventRow.status === 'UNPARSEABLE'
      ) {
        const err: any = new Error(
          `Standard approval rejected: receipt has authStatus '${eventRow.authStatus}', DKIM '${eventRow.dkimStatus}', and status '${eventRow.status}'. An administrator must review bank statements and use OVERRIDE_APPROVE with an explicit audit reason.`
        );
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }

      return this.claimAndCredit(submission.id, emailEventId, params.adminUserId, false);
    }

    // OVERRIDE_APPROVE: Exceptional manual override
    if (params.action === 'OVERRIDE_APPROVE') {
      if (!params.reason || params.reason.trim().length < 10) {
        const err: any = new Error(
          'Exceptional manual override requires an audit reason of at least 10 characters explaining independent verification.'
        );
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }

      alertService.raiseAlert({
        type: 'WEBHOOK_FAILURE',
        severity: 'MEDIUM',
        message: `Admin manual override approval executed for submission ${submission.id}`,
        details: { adminUserId: params.adminUserId, submissionId: submission.id, utr: submission.utr, reason: params.reason },
      }).catch(console.error);

      return this.claimAndCredit(submission.id, emailEventId, params.adminUserId, true, params.reason.trim());
    }

    const err: any = new Error('Invalid review action specified.');
    err.statusCode = 400;
    err.name = 'BadRequest';
    throw err;
  }

  /**
   * Returns customer's submissions history.
   */
  async getCustomerSubmissions(userId: string): Promise<UpiPaymentSubmission[]> {
    return this.db
      .select()
      .from(upiPaymentSubmissions)
      .where(eq(upiPaymentSubmissions.userId, userId))
      .orderBy(desc(upiPaymentSubmissions.createdAt))
      .limit(50);
  }

  /**
   * Returns a specific submission for customer with IDOR check.
   */
  async getSubmissionById(id: string, userId: string): Promise<UpiPaymentSubmission | null> {
    const [submission] = await this.db
      .select()
      .from(upiPaymentSubmissions)
      .where(and(eq(upiPaymentSubmissions.id, id), eq(upiPaymentSubmissions.userId, userId)))
      .limit(1);

    return submission || null;
  }

  /**
   * Admin: Queries submissions with filters.
   */
  async getAdminSubmissions(filters: {
    page?: number;
    limit?: number;
    status?: string;
    utr?: string;
    userId?: string;
  }): Promise<{ submissions: UpiPaymentSubmission[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters.status) conditions.push(eq(upiPaymentSubmissions.status, filters.status));
    if (filters.utr) conditions.push(eq(upiPaymentSubmissions.utr, filters.utr));
    if (filters.userId) conditions.push(eq(upiPaymentSubmissions.userId, filters.userId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRes] = await Promise.all([
      this.db
        .select()
        .from(upiPaymentSubmissions)
        .where(whereClause)
        .orderBy(desc(upiPaymentSubmissions.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(upiPaymentSubmissions)
        .where(whereClause),
    ]);

    return {
      submissions: rows,
      total: Number(totalRes[0]?.count || 0),
    };
  }

  /**
   * Admin: Queries ingested email events.
   */
  async getAdminEmailEvents(filters: {
    page?: number;
    limit?: number;
    status?: string;
    utr?: string;
  }): Promise<{ emailEvents: FamappEmailEvent[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters.status) conditions.push(eq(famappEmailEvents.status, filters.status));
    if (filters.utr) conditions.push(eq(famappEmailEvents.parsedUtr, filters.utr));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRes] = await Promise.all([
      this.db
        .select()
        .from(famappEmailEvents)
        .where(whereClause)
        .orderBy(desc(famappEmailEvents.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(famappEmailEvents)
        .where(whereClause),
    ]);

    return {
      emailEvents: rows,
      total: Number(totalRes[0]?.count || 0),
    };
  }

  /**
   * Admin: Returns high-level statistics of submissions and email events.
   */
  async getAdminStats(): Promise<FamappAdminStats> {
    const [subCounts, emailCounts] = await Promise.all([
      this.db
        .select({
          total: count(),
          pending: sql<number>`count(*) filter (where status = 'PENDING')::int`,
          matched: sql<number>`count(*) filter (where status = 'MATCHED')::int`,
          credited: sql<number>`count(*) filter (where status = 'CREDITED')::int`,
          manualReview: sql<number>`count(*) filter (where status = 'MANUAL_REVIEW')::int`,
          expired: sql<number>`count(*) filter (where status = 'EXPIRED')::int`,
          rejected: sql<number>`count(*) filter (where status = 'REJECTED')::int`,
        })
        .from(upiPaymentSubmissions),
      this.db
        .select({
          total: count(),
          unclaimed: sql<number>`count(*) filter (where status = 'UNCLAIMED')::int`,
          claimed: sql<number>`count(*) filter (where status = 'CLAIMED')::int`,
          flagged: sql<number>`count(*) filter (where status = 'FLAGGED')::int`,
        })
        .from(famappEmailEvents),
    ]);

    const sc = subCounts[0] || ({} as any);
    const ec = emailCounts[0] || ({} as any);

    return {
      totalSubmissions: Number(sc.total || 0),
      pendingCount: Number(sc.pending || 0),
      creditedCount: Number(sc.credited || 0),
      manualReviewCount: Number(sc.manualReview || 0),
      expiredCount: Number(sc.expired || 0),
      rejectedCount: Number(sc.rejected || 0),
      totalEmailEvents: Number(ec.total || 0),
      unclaimedEventsCount: Number(ec.unclaimed || 0),
      claimedEventsCount: Number(ec.claimed || 0),
      flaggedEventsCount: Number(ec.flagged || 0),
    };
  }

  /**
   * Admin: Returns current synchronization state and health telemetry.
   */
  async getSyncStatus(): Promise<any> {
    const [state] = await this.db
      .select()
      .from(famappSyncState)
      .where(eq(famappSyncState.id, 'primary'))
      .limit(1);

    return state || null;
  }
}

export const famappVerificationService = new FamappVerificationService();
