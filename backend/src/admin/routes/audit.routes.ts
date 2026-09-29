import { FastifyPluginAsync } from 'fastify';
import { auditService } from '../services/audit.service';
import { auditLogQuerySchema } from '../validation/admin.validation';

export const auditAdminRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/admin/audit-logs
   * Immutable audit logs for tracking administrative actions across the platform.
   */
  app.get('/', async (request, reply) => {
    const parseResult = auditLogQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid query parameters',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const { page, limit, action, entityType, entityId, adminUserId } = parseResult.data;
    const { logs, total } = await auditService.getLogs({
      page,
      limit,
      action,
      entityType,
      entityId,
      adminUserId,
    });

    return reply.status(200).send({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  });
};
