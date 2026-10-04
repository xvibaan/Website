import { FastifyPluginAsync } from 'fastify';
import { contentService } from './content.service';

export const contentRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/content
   * Public endpoint (no authentication) serving customer-facing marketplace content.
   * Only explicitly allowlisted `content.*` platform settings are exposed; missing keys
   * fall back to defaults. See content.service.ts for the allowlist.
   */
  app.get('/content', async (request, reply) => {
    try {
      const content = await contentService.getPublicContent((key, reason) => {
        request.log.warn({ key, reason }, 'Invalid public content setting; using default for section');
      });
      return reply.status(200).send(content);
    } catch (err) {
      // Do not leak database error details to public clients.
      request.log.error({ err }, 'Failed to load public content settings');
      return reply.status(503).send({
        statusCode: 503,
        error: 'ServiceUnavailable',
        message: 'Content is temporarily unavailable',
      });
    }
  });
};
