"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantResolver = tenantResolver;
const client_1 = require("../db/client");
const website_instances_1 = require("../db/schema/website-instances");
const drizzle_orm_1 = require("drizzle-orm");
async function tenantResolver(request, reply) {
    // Extract canonical host without port
    const hostHeader = request.headers.host || '';
    const hostname = hostHeader.split(':')[0].toLowerCase();
    // If local direct access to backend, skip tenant resolution (e.g., localhost:4000)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return;
    }
    try {
        const db = (0, client_1.getDb)();
        const routeInfo = await db
            .select({
            resellerId: website_instances_1.websiteInstances.resellerId,
            instanceId: website_instances_1.websiteInstances.id,
            instanceStatus: website_instances_1.websiteInstances.status,
        })
            .from(website_instances_1.domainRoutes)
            .innerJoin(website_instances_1.websiteInstances, (0, drizzle_orm_1.eq)(website_instances_1.domainRoutes.instanceId, website_instances_1.websiteInstances.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(website_instances_1.domainRoutes.hostname, hostname), (0, drizzle_orm_1.eq)(website_instances_1.domainRoutes.status, 'VERIFIED')))
            .limit(1)
            .execute();
        if (routeInfo.length > 0) {
            const info = routeInfo[0];
            // Prevent routing if instance is not active
            if (info.instanceStatus !== 'ACTIVE') {
                return reply.status(403).send({ error: 'Website instance is currently inactive or suspended' });
            }
            request.tenant = {
                resellerId: info.resellerId,
                instanceId: info.instanceId,
                domain: hostname,
            };
        }
        else {
            // Unknown domain routing
            // If we are strictly enforcing tenant routing for external domains, we might reject here.
            // But we will just not attach a tenant, letting the handlers decide.
        }
    }
    catch (error) {
        request.log.error({ err: error, hostname }, 'Failed to resolve tenant from hostname');
    }
}
