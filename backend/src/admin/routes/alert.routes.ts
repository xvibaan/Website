import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireRole } from '../../auth/auth.middleware';
import { alertService } from '../services/alert.service';
import { z } from 'zod';

const getAlertsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  type: z.string().optional(),
  severity: z.string().optional(),
  isResolved: z.preprocess((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean().optional()),
});

export const alertRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Requires admin role for system alerts
  app.addHook('preHandler', requireRole('admin'));

  /**
   * GET /api/v1/admin/alerts
   * Retrieves paginated system operational alerts.
   */
  app.get('/', async (request, reply) => {
    const parseResult = getAlertsSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid query parameters',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const { page, limit, type, severity, isResolved } = parseResult.data;
    const result = await alertService.getAlerts({ page, limit, type, severity, isResolved });

    return reply.status(200).send({
      success: true,
      alerts: result.alerts,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  });

  /**
   * POST /api/v1/admin/alerts/:id/resolve
   * Marks a system alert as resolved.
   */
  app.post<{ Params: { id: string } }>('/:id/resolve', async (request, reply) => {
    const { id } = request.params;
    
    // Zod uuid check
    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ statusCode: 400, error: 'BadRequest', message: 'Invalid alert ID format' });
    }

    const resolvedAlert = await alertService.resolveAlert(id, request.user!.userId);
    
    if (!resolvedAlert) {
      return reply.status(404).send({ statusCode: 404, error: 'NotFound', message: 'Alert not found' });
    }

    return reply.status(200).send({
      success: true,
      alert: resolvedAlert,
    });
  });
};
