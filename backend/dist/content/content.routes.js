"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentRoutes = void 0;
const content_service_1 = require("./content.service");
const contentRoutes = async (app) => {
    /**
     * GET /api/v1/content
     * Public endpoint (no authentication) serving customer-facing marketplace content.
     * Only explicitly allowlisted `content.*` platform settings are exposed; missing keys
     * fall back to defaults. See content.service.ts for the allowlist.
     */
    app.get('/content', async (request, reply) => {
        try {
            const content = await content_service_1.contentService.getPublicContent((key, reason) => {
                request.log.warn({ key, reason }, 'Invalid public content setting; using default for section');
            });
            return reply.status(200).send(content);
        }
        catch (err) {
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
exports.contentRoutes = contentRoutes;
