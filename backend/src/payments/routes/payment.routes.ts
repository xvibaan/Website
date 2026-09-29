import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../auth/auth.middleware';
import { paymentTransactionService } from '../services/PaymentTransactionService';
import {
  createPaymentSchema,
  paymentHistoryQuerySchema,
  paymentIdParamSchema,
  webhookParamSchema,
} from '../payment.validation';
import { rateLimitOverrides } from '../../rate-limit';

export const paymentRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * POST /api/v1/payments/create
   * Customer initiates a wallet recharge payment.
   * Authenticated customer session required.
   */
  app.post(
    '/create',
    { preHandler: [authenticate], ...rateLimitOverrides.paymentCreate },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const parseResult = createPaymentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid payment parameters',
          issues: parseResult.error.flatten().fieldErrors,
        });
      }

      const { amount, currency, purpose, gateway, idempotencyKey } = parseResult.data;

      const result = await paymentTransactionService.createWalletRechargePayment({
        userId: user.userId,
        amount,
        currency,
        purpose,
        gateway,
        idempotencyKey,
      });

      return reply.status(201).send({
        success: true,
        paymentTransaction: result.paymentTransaction,
        checkoutUrl: result.checkoutUrl,
        clientSecret: result.clientSecret,
        gatewayOrderId: result.gatewayOrderId,
      });
    }
  );

  /**
   * GET /api/v1/payments
   * Customer retrieves their payment transaction history.
   * Authenticated customer session required.
   */
  app.get(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const parseResult = paymentHistoryQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid query parameters',
          issues: parseResult.error.flatten().fieldErrors,
        });
      }

      const { page, limit } = parseResult.data;
      const result = await paymentTransactionService.getPaymentHistory(
        user.userId,
        page,
        limit
      );

      return reply.status(200).send({
        success: true,
        transactions: result.transactions,
        pagination: result.pagination,
      });
    }
  );

  /**
   * GET /api/v1/payments/:id
   * Customer retrieves a specific payment transaction.
   * Enforces IDOR protection (can only fetch own transaction).
   */
  app.get(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const paramResult = paymentIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid payment ID parameter',
          issues: paramResult.error.flatten().fieldErrors,
        });
      }

      const transaction = await paymentTransactionService.getPaymentById(
        paramResult.data.id,
        user.userId
      );

      return reply.status(200).send({
        success: true,
        paymentTransaction: transaction,
      });
    }
  );

  /**
   * POST /api/v1/payments/webhook/:gateway
   * Public webhook endpoint for payment gateway events.
   * Unauthenticated via user session; verified cryptographically via gateway signature.
   */
  app.post(
    '/webhook/:gateway',
    async (request, reply) => {
      const paramResult = webhookParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid gateway parameter in webhook route',
        });
      }

      const { gateway } = paramResult.data;

      // Extract raw body preserved by Fastify content type parser or fallback to buffer
      const rawBody: Buffer | string =
        (request as any).rawBody ||
        (Buffer.isBuffer(request.body)
          ? request.body
          : typeof request.body === 'string'
          ? Buffer.from(request.body, 'utf8')
          : Buffer.from(JSON.stringify(request.body || {}), 'utf8'));

      const result = await paymentTransactionService.processWebhook(
        gateway,
        request.headers,
        rawBody
      );

      return reply.status(200).send({
        success: result.success,
        duplicate: result.duplicate || false,
        status: result.status,
        message: result.message,
        paymentTransactionId: result.paymentTransactionId,
      });
    }
  );
};
