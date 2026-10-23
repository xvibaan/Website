import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../auth/auth.middleware';
import { famappVerificationService } from './famapp-verification.service';
import { submitUtrSchema } from './famapp.validation';

export const famappRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // All customer FamApp endpoints require active authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/payments/famapp/qr-info
   * Returns authoritative merchant UPI VPA, name, and instructions.
   */
  app.get('/qr-info', async (_request, reply) => {
    const rawVpa = (process.env.MERCHANT_UPI_VPA || '').trim();
    const isConfigured = Boolean(
      rawVpa &&
      rawVpa !== 'merchant@fam' &&
      !rawVpa.includes('placeholder') &&
      /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(rawVpa)
    );
    const merchantName = (process.env.MERCHANT_NAME || 'Host Market Place').trim();

    return reply.status(200).send({
      success: true,
      isConfigured,
      merchantVpa: isConfigured ? rawVpa : null,
      merchantName,
      currency: 'INR',
      minDeposit: '10.00',
      error: isConfigured ? null : 'Merchant UPI address is not configured. UPI QR top-ups are temporarily disabled.',
    });
  });


  /**
   * POST /api/v1/payments/famapp/submit-utr
   * Customer submits a 12-digit UTR/RRN to claim a static UPI QR top-up.
   */
  app.post('/submit-utr', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const parseResult = submitUtrSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid UTR submission parameters',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const rawVpa = (process.env.MERCHANT_UPI_VPA || '').trim();
    const isVpaConfigured = Boolean(
      rawVpa &&
      rawVpa !== 'merchant@fam' &&
      !rawVpa.includes('placeholder') &&
      /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(rawVpa)
    );
    if (!isVpaConfigured && process.env.NODE_ENV !== 'test') {
      return reply.status(503).send({
        statusCode: 503,
        error: 'ServiceUnavailable',
        message: 'UPI QR deposits are currently unavailable because the merchant UPI address is not configured.',
      });
    }

    const { utr, amount, currency } = parseResult.data;

    const result = await famappVerificationService.submitUtr({
      userId: user.userId,
      utr,
      amount,
      currency,
    });

    return reply.status(200).send({
      success: result.success,
      submissionId: result.submissionId,
      status: result.status,
      message: result.message,
      utr: result.utr,
      amount: result.amount,
      expiresAt: result.expiresAt.toISOString(),
    });
  });

  /**
   * GET /api/v1/payments/famapp/status/:id
   * Customer checks verification status of their submission with IDOR protection.
   */
  app.get('/status/:id', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const { id } = request.params as { id: string };
    const submission = await famappVerificationService.getSubmissionById(id, user.userId);

    if (!submission) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NotFound',
        message: 'Submission not found or access denied',
      });
    }

    return reply.status(200).send({
      success: true,
      submission: {
        id: submission.id,
        utr: submission.utr,
        amount: submission.amount,
        currency: submission.currency,
        status: submission.status,
        failureReason: submission.failureReason,
        createdAt: submission.createdAt.toISOString(),
        expiresAt: submission.expiresAt.toISOString(),
        creditedAt: submission.creditedAt?.toISOString() || null,
      },
    });
  });

  /**
   * GET /api/v1/payments/famapp/history
   * Customer views their recent UPI QR top-up submissions.
   */
  app.get('/history', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const submissions = await famappVerificationService.getCustomerSubmissions(user.userId);

    return reply.status(200).send({
      success: true,
      submissions: submissions.map((s) => ({
        id: s.id,
        utr: s.utr,
        amount: s.amount,
        currency: s.currency,
        status: s.status,
        failureReason: s.failureReason,
        createdAt: s.createdAt.toISOString(),
        creditedAt: s.creditedAt?.toISOString() || null,
      })),
    });
  });
};
