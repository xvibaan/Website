import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../../auth/auth.middleware';
import { famappVerificationService } from './famapp-verification.service';
import {
  adminReviewSubmissionSchema,
  querySubmissionsSchema,
  queryEmailEventsSchema,
} from './famapp.validation';

export const famappAdminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Enforce server-side authentication and admin RBAC across all Admin FamApp endpoints
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('admin'));

  /**
   * GET /api/v1/admin/payments/famapp/stats
   * High-level metrics for matched, unmatched, delayed, duplicate, and conflicting claims.
   */
  app.get('/stats', async (_request, reply) => {
    const stats = await famappVerificationService.getAdminStats();
    return reply.status(200).send({
      success: true,
      stats,
    });
  });

  /**
   * GET /api/v1/admin/payments/famapp/submissions
   * List customer UPI submissions with filters (status, utr, userId).
   */
  app.get('/submissions', async (request, reply) => {
    const parseResult = querySubmissionsSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid query parameters',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const { page, limit, status, utr, userId } = parseResult.data;
    const result = await famappVerificationService.getAdminSubmissions({
      page,
      limit,
      status,
      utr,
      userId,
    });

    return reply.status(200).send({
      success: true,
      submissions: result.submissions,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    });
  });

  /**
   * GET /api/v1/admin/payments/famapp/email-events
   * Ingested Gmail notifications (unclaimed, claimed, flagged, unparseable).
   */
  app.get('/email-events', async (request, reply) => {
    const parseResult = queryEmailEventsSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid query parameters',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const { page, limit, status, utr } = parseResult.data;
    const result = await famappVerificationService.getAdminEmailEvents({
      page,
      limit,
      status,
      utr,
    });

    return reply.status(200).send({
      success: true,
      emailEvents: result.emailEvents,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    });
  });

  /**
   * POST /api/v1/admin/payments/famapp/submissions/:id/review
   * Admin reviews (APPROVE or REJECT) a pending, matched, or manual-review submission.
   */
  app.post('/submissions/:id/review', async (request, reply) => {
    const admin = request.user;
    if (!admin) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Admin authentication required',
      });
    }

    const { id } = request.params as { id: string };
    const parseResult = adminReviewSubmissionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid review payload',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const { action, reason, settlementConfirmed } = parseResult.data;

    const result = await famappVerificationService.adminReviewSubmission({
      submissionId: id,
      adminUserId: admin.userId,
      action,
      reason,
      settlementConfirmed,
    });

    return reply.status(200).send({
      success: result.success,
      credited: result.credited,
      status: result.status,
      message: result.message,
      submissionId: result.submissionId,
      paymentTransactionId: result.paymentTransactionId,
    });
  });
  /**
   * GET /api/v1/admin/payments/famapp/sync-status
   * Real-time Gmail API synchronization health and cursor telemetry.
   */
  app.get('/sync-status', async (_request, reply) => {
    const syncStatus = await famappVerificationService.getSyncStatus();
    const isConfigured = !!(
      (process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) &&
      (process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN)
    );
    return reply.status(200).send({
      success: true,
      syncStatus: syncStatus || {
        id: 'primary',
        lastSyncedAt: null,
        lastSyncedMessageTimestamp: null,
        consecutiveErrors: '0',
        lastError: null,
      },
      isConfigured,
      merchantVpa: process.env.MERCHANT_UPI_VPA || 'Not configured',
      autoCreditEnabled: false,
    });
  });
};
