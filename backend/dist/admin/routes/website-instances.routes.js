"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteInstanceAdminRoutes = void 0;
const website_instances_service_1 = require("../services/website-instances.service");
const audit_service_1 = require("../services/audit.service");
const website_instances_schema_1 = require("../validation/website-instances.schema");
const websiteInstanceAdminRoutes = async (app) => {
    app.get('/', async (request, reply) => {
        const instances = await website_instances_service_1.websiteInstanceService.listInstances();
        return reply.send({ data: instances });
    });
    app.get('/:id', async (request, reply) => {
        const { id } = request.params;
        const instance = await website_instances_service_1.websiteInstanceService.getInstance(id);
        if (!instance) {
            return reply.status(404).send({ error: 'Website instance not found' });
        }
        return reply.send({ data: instance });
    });
    app.post('/', async (request, reply) => {
        const parseResult = website_instances_schema_1.CreateWebsiteInstanceSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
        }
        try {
            const instance = await website_instances_service_1.websiteInstanceService.createInstance(parseResult.data);
            await audit_service_1.auditService.record({
                adminUserId: request.user?.userId || 'system',
                action: 'CREATE_WEBSITE_INSTANCE',
                entityType: 'WEBSITE_INSTANCE',
                entityId: instance.id,
                details: { instanceName: instance.instanceName },
                ipAddress: request.ip,
            });
            return reply.status(201).send({ data: instance });
        }
        catch (err) {
            return reply.status(400).send({ error: err.message });
        }
    });
    app.patch('/:id', async (request, reply) => {
        const { id } = request.params;
        const parseResult = website_instances_schema_1.UpdateWebsiteInstanceSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
        }
        const updated = await website_instances_service_1.websiteInstanceService.updateInstance(id, parseResult.data);
        if (!updated) {
            return reply.status(404).send({ error: 'Website instance not found' });
        }
        await audit_service_1.auditService.record({
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
        const { id } = request.params;
        const parseResult = website_instances_schema_1.CreateDomainRouteSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
        }
        try {
            // Normalize hostname
            const normalizedHostname = parseResult.data.hostname.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            const domain = await website_instances_service_1.websiteInstanceService.addDomain(id, { ...parseResult.data, hostname: normalizedHostname });
            await audit_service_1.auditService.record({
                adminUserId: request.user?.userId || 'system',
                action: 'ADD_DOMAIN_ROUTE',
                entityType: 'WEBSITE_INSTANCE',
                entityId: id,
                details: { hostname: normalizedHostname },
                ipAddress: request.ip,
            });
            return reply.status(201).send({ data: domain });
        }
        catch (err) {
            return reply.status(400).send({ error: err.message });
        }
    });
    app.patch('/:id/domains/:domainId', async (request, reply) => {
        const { id, domainId } = request.params;
        const parseResult = website_instances_schema_1.UpdateDomainRouteSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
        }
        try {
            const updated = await website_instances_service_1.websiteInstanceService.updateDomain(domainId, parseResult.data);
            // If setting as primary, update the instance
            if (parseResult.data.isPrimary) {
                await website_instances_service_1.websiteInstanceService.updateInstance(id, { primaryDomain: updated.hostname });
            }
            await audit_service_1.auditService.record({
                adminUserId: request.user?.userId || 'system',
                action: 'UPDATE_DOMAIN_ROUTE',
                entityType: 'WEBSITE_INSTANCE',
                entityId: id,
                details: { domainId, changes: parseResult.data },
                ipAddress: request.ip,
            });
            return reply.send({ data: updated });
        }
        catch (err) {
            return reply.status(400).send({ error: err.message });
        }
    });
    app.delete('/:id/domains/:domainId', async (request, reply) => {
        const { id, domainId } = request.params;
        await website_instances_service_1.websiteInstanceService.removeDomain(domainId);
        await audit_service_1.auditService.record({
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
exports.websiteInstanceAdminRoutes = websiteInstanceAdminRoutes;
