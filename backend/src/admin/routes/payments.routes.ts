import { FastifyPluginAsync } from 'fastify';
import { paymentTransactionService } from '../../payments/services/PaymentTransactionService';
import {
  adminPaymentQuerySchema,
  paymentIdParamSchema,
} from '../../payments/payment.validation';

export const paymentAdminRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/admin/payments
   * Lists payment transactions with customer, status, and gateway filtering.
   */
  app.get('/', async (request, reply) => {
    const queryResult = adminPaymentQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid query parameters',
        issues: queryResult.error.flatten().fieldErrors,
      });
    }

    const { page, limit, status, userId } = queryResult.data;
    const result = await paymentTransactionService.getAdminPayments({
      page,
      limit,
      status,
      userId,
    });

    return reply.status(200).send({
      success: true,
      transactions: result.transactions,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/admin/payments/:id
   * Single payment transaction detail for admin auditing.
   */
  app.get('/:id', async (request, reply) => {
    const paramResult = paymentIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid payment ID parameter',
        issues: paramResult.error.flatten().fieldErrors,
      });
    }

    const transaction = await paymentTransactionService.getAdminPaymentById(paramResult.data.id);
    if (!transaction) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NotFound',
        message: `Payment '${paramResult.data.id}' not found`,
      });
    }

    return reply.status(200).send({
      success: true,
      paymentTransaction: transaction,
    });
  });
};
