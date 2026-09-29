import { FastifyPluginAsync } from 'fastify';
import { dashboardAdminService } from '../services/dashboard.service';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/admin/dashboard
   * Consolidated real-time database overview metrics.
   */
  app.get('/', async (_request, reply) => {
    const overview = await dashboardAdminService.getDashboardOverview();
    return reply.status(200).send(overview);
  });
};
