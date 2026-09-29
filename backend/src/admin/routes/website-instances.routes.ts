import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { websiteInstanceService } from '../services/website-instances.service';
import { auditService } from '../services/audit.service';
import { CreateWebsiteInstanceSchema, UpdateWebsiteInstanceSchema, CreateDomainRouteSchema, UpdateDomainRouteSchema } from '../validation/website-instances.schema';

export const websiteInstanceAdminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/', async (request, reply) => {
    const instances = await websiteInstanceService.listInstances();
    return reply.send({ data: instances });
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const instance = await websiteInstanceService.getInstance(id);
    if (!instance) {
      return reply.status(404).send({ error: 'Website instance not found' });
    }
    return reply.send({ data: instance });
  });

  app.post('/', async (request, reply) => {
    const parseResult = CreateWebsiteInstanceSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
    }

    try {
      const instance = await websiteInstanceService.createInstance(parseResult.data);
      
      await auditService.record({
        adminUserId: request.user?.userId || 'system',
        action: 'CREATE_WEBSITE_INSTANCE',
        entityType: 'WEBSITE_INSTANCE',
        entityId: instance.id,
        details: { instanceName: instance.instanceName },
        ipAddress: request.ip,
      });

      return reply.status(201).send({ data: instance });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = UpdateWebsiteInstanceSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
    }

    const updated = await websiteInstanceService.updateInstance(id, parseResult.data);
    if (!updated) {
      return reply.status(404).send({ error: 'Website instance not found' });
    }

    await auditService.record({
      adminUserId: request.user?.userId || 'system',
      action: 'UPDATE_WEBSITE_INSTANCE',
      entityType: 'WEBSITE_INSTANCE',
      entityId: id,
      details: { changes: parseResult.data },
      ipAddress: request.ip,
    });

    return reply.send({ data: updated });
  });

  app.post('/:id/domains', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = CreateDomainRouteSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
    }

    try {
      // Normalize hostname
      const normalizedHostname = parseResult.data.hostname.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const domain = await websiteInstanceService.addDomain(id, { ...parseResult.data, hostname: normalizedHostname });
      
      await auditService.record({
        adminUserId: request.user?.userId || 'system',
        action: 'ADD_DOMAIN_ROUTE',
        entityType: 'WEBSITE_INSTANCE',
        entityId: id,
        details: { hostname: normalizedHostname },
        ipAddress: request.ip,
      });

      return reply.status(201).send({ data: domain });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.patch('/:id/domains/:domainId', async (request, reply) => {
    const { id, domainId } = request.params as { id: string; domainId: string };
    const parseResult = UpdateDomainRouteSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
    }

    try {
      const updated = await websiteInstanceService.updateDomain(domainId, parseResult.data);
      
      // If setting as primary, update the instance
      if (parseResult.data.isPrimary) {
        await websiteInstanceService.updateInstance(id, { primaryDomain: updated.hostname });
      }

      await auditService.record({
        adminUserId: request.user?.userId || 'system',
        action: 'UPDATE_DOMAIN_ROUTE',
        entityType: 'WEBSITE_INSTANCE',
        entityId: id,
        details: { domainId, changes: parseResult.data },
        ipAddress: request.ip,
      });

      return reply.send({ data: updated });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.delete('/:id/domains/:domainId', async (request, reply) => {
    const { id, domainId } = request.params as { id: string; domainId: string };
    await websiteInstanceService.removeDomain(domainId);

    await auditService.record({
      adminUserId: request.user?.userId || 'system',
      action: 'REMOVE_DOMAIN_ROUTE',
      entityType: 'WEBSITE_INSTANCE',
      entityId: id,
      details: { domainId },
      ipAddress: request.ip,
    });

    return reply.send({ success: true });
  });
};
