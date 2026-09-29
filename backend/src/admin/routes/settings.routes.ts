import { FastifyPluginAsync } from 'fastify';
import { settingsAdminService } from '../services/settings.service';
import { updateSettingsSchema } from '../validation/admin.validation';

export const settingsAdminRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/admin/settings
   * Platform configuration settings.
   */
  app.get('/', async (_request, reply) => {
    const settings = await settingsAdminService.getAllSettings();
    return reply.status(200).send({
      success: true,
      settings,
    });
  });

  /**
   * PATCH /api/v1/admin/settings
   * Updates platform settings with audit logging.
   */
  app.patch('/', async (request, reply) => {
    const parseResult = updateSettingsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Invalid settings payload',
        issues: parseResult.error.flatten().fieldErrors,
      });
    }

    const updated = await settingsAdminService.updateSettings(
      parseResult.data.settings,
      request.user!.userId
    );

    return reply.status(200).send({
      success: true,
      settings: updated,
    });
  });
};
