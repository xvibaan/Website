"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteInstanceService = exports.WebsiteInstanceService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const website_instances_1 = require("../../db/schema/website-instances");
const resellers_1 = require("../../db/schema/resellers");
class WebsiteInstanceService {
    async listInstances() {
        const db = (0, client_1.getDb)();
        const instances = await db
            .select({
            id: website_instances_1.websiteInstances.id,
            instanceName: website_instances_1.websiteInstances.instanceName,
            status: website_instances_1.websiteInstances.status,
            primaryDomain: website_instances_1.websiteInstances.primaryDomain,
            createdAt: website_instances_1.websiteInstances.createdAt,
            reseller: {
                id: resellers_1.resellers.id,
                businessName: resellers_1.resellers.businessName,
            },
        })
            .from(website_instances_1.websiteInstances)
            .leftJoin(resellers_1.resellers, (0, drizzle_orm_1.eq)(website_instances_1.websiteInstances.resellerId, resellers_1.resellers.id));
        return instances;
    }
    async getInstance(id) {
        const db = (0, client_1.getDb)();
        const instance = await db.query.websiteInstances.findFirst({
            where: (0, drizzle_orm_1.eq)(website_instances_1.websiteInstances.id, id),
        });
        if (!instance)
            return null;
        const reseller = await db.query.resellers.findFirst({
            where: (0, drizzle_orm_1.eq)(resellers_1.resellers.id, instance.resellerId),
        });
        const domains = await db.query.domainRoutes.findMany({
            where: (0, drizzle_orm_1.eq)(website_instances_1.domainRoutes.instanceId, id),
        });
        return { ...instance, reseller, domains };
    }
    async createInstance(data) {
        const db = (0, client_1.getDb)();
        const [instance] = await db.insert(website_instances_1.websiteInstances).values({
            instanceName: data.instanceName,
            resellerId: data.resellerId,
            status: data.status || 'PENDING',
        }).returning();
        return instance;
    }
    async updateInstance(id, data) {
        const db = (0, client_1.getDb)();
        const [updated] = await db.update(website_instances_1.websiteInstances).set({
            ...data,
            updatedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(website_instances_1.websiteInstances.id, id)).returning();
        return updated;
    }
    async addDomain(instanceId, data) {
        const db = (0, client_1.getDb)();
        const [domain] = await db.insert(website_instances_1.domainRoutes).values({
            instanceId,
            hostname: data.hostname,
            hostnameType: data.hostnameType,
        }).returning();
        return domain;
    }
    async updateDomain(id, data) {
        const db = (0, client_1.getDb)();
        const [updated] = await db.update(website_instances_1.domainRoutes).set({
            ...data,
            updatedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(website_instances_1.domainRoutes.id, id)).returning();
        return updated;
    }
    async removeDomain(id) {
        const db = (0, client_1.getDb)();
        await db.delete(website_instances_1.domainRoutes).where((0, drizzle_orm_1.eq)(website_instances_1.domainRoutes.id, id));
    }
}
exports.WebsiteInstanceService = WebsiteInstanceService;
exports.websiteInstanceService = new WebsiteInstanceService();
