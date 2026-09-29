"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceAdminService = exports.ResourceAdminService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const resources_1 = require("../../db/schema/resources");
const products_1 = require("../../db/schema/products");
const audit_service_1 = require("./audit.service");
class ResourceAdminService {
    async getResources(query) {
        const db = (0, client_1.getDb)();
        const conditions = [];
        if (query.type)
            conditions.push((0, drizzle_orm_1.eq)(resources_1.resources.type, query.type));
        if (query.status)
            conditions.push((0, drizzle_orm_1.eq)(resources_1.resources.status, query.status));
        if (query.productId)
            conditions.push((0, drizzle_orm_1.eq)(resources_1.resources.productId, query.productId));
        const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const [totalRes] = await db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(resources_1.resources)
            .where(whereClause);
        const total = Number(totalRes?.count || 0);
        const offset = (query.page - 1) * query.limit;
        const rows = await db
            .select({
            resource: resources_1.resources,
            productName: products_1.products.name,
        })
            .from(resources_1.resources)
            .leftJoin(products_1.products, (0, drizzle_orm_1.eq)(resources_1.resources.productId, products_1.products.id))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.asc)(resources_1.resources.sortOrder), (0, drizzle_orm_1.desc)(resources_1.resources.createdAt))
            .limit(query.limit)
            .offset(offset);
        const list = rows.map((r) => ({
            ...r.resource,
            productName: r.productName,
        }));
        return { resources: list, total };
    }
    async getResourceById(id) {
        const db = (0, client_1.getDb)();
        const rows = await db
            .select({
            resource: resources_1.resources,
            productName: products_1.products.name,
        })
            .from(resources_1.resources)
            .leftJoin(products_1.products, (0, drizzle_orm_1.eq)(resources_1.resources.productId, products_1.products.id))
            .where((0, drizzle_orm_1.eq)(resources_1.resources.id, id))
            .limit(1);
        if (rows.length === 0)
            return null;
        return {
            ...rows[0].resource,
            productName: rows[0].productName,
        };
    }
    async createResource(data, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            const [created] = await tx
                .insert(resources_1.resources)
                .values({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'RESOURCE_CREATE',
                entityType: 'RESOURCE',
                entityId: created.id,
                details: { name: created.name, type: created.type, url: created.url },
            }, tx);
            return created;
        });
    }
    async updateResource(id, data, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            const [existing] = await tx
                .select()
                .from(resources_1.resources)
                .where((0, drizzle_orm_1.eq)(resources_1.resources.id, id))
                .limit(1);
            if (!existing)
                return null;
            const [updated] = await tx
                .update(resources_1.resources)
                .set({
                ...data,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(resources_1.resources.id, id))
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'RESOURCE_UPDATE',
                entityType: 'RESOURCE',
                entityId: id,
                details: { before: existing, after: updated },
            }, tx);
            return updated;
        });
    }
    async updateResourceStatus(id, status, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            const [existing] = await tx
                .select()
                .from(resources_1.resources)
                .where((0, drizzle_orm_1.eq)(resources_1.resources.id, id))
                .limit(1);
            if (!existing)
                return null;
            const [updated] = await tx
                .update(resources_1.resources)
                .set({
                status,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(resources_1.resources.id, id))
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'RESOURCE_STATUS_UPDATE',
                entityType: 'RESOURCE',
                entityId: id,
                details: { previousStatus: existing.status, newStatus: status },
            }, tx);
            return updated;
        });
    }
    async deleteResource(id, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            const [existing] = await tx
                .select()
                .from(resources_1.resources)
                .where((0, drizzle_orm_1.eq)(resources_1.resources.id, id))
                .limit(1);
            if (!existing)
                return false;
            await tx.delete(resources_1.resources).where((0, drizzle_orm_1.eq)(resources_1.resources.id, id));
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'RESOURCE_DELETE',
                entityType: 'RESOURCE',
                entityId: id,
                details: { name: existing.name, url: existing.url },
            }, tx);
            return true;
        });
    }
}
exports.ResourceAdminService = ResourceAdminService;
exports.resourceAdminService = new ResourceAdminService();
