"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryAdminService = exports.CategoryAdminService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const categories_1 = require("../../db/schema/categories");
const audit_service_1 = require("./audit.service");
class CategoryAdminService {
    async getCategories(isActive) {
        const db = (0, client_1.getDb)();
        const query = db.select().from(categories_1.categories);
        if (isActive !== undefined) {
            query.where((0, drizzle_orm_1.eq)(categories_1.categories.isActive, isActive));
        }
        return query.orderBy((0, drizzle_orm_1.asc)(categories_1.categories.sortOrder), (0, drizzle_orm_1.desc)(categories_1.categories.createdAt));
    }
    async getCategoryById(id) {
        const db = (0, client_1.getDb)();
        const [found] = await db
            .select()
            .from(categories_1.categories)
            .where((0, drizzle_orm_1.eq)(categories_1.categories.id, id))
            .limit(1);
        return found || null;
    }
    async createCategory(data, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            const [created] = await tx
                .insert(categories_1.categories)
                .values({
                ...data,
                slug: data.slug.toLowerCase().trim(),
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'CATEGORY_CREATE',
                entityType: 'CATEGORY',
                entityId: created.id,
                details: { slug: created.slug, name: created.name },
            }, tx);
            return created;
        });
    }
    async updateCategory(id, data, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            const [existing] = await tx
                .select()
                .from(categories_1.categories)
                .where((0, drizzle_orm_1.eq)(categories_1.categories.id, id))
                .limit(1);
            if (!existing)
                return null;
            const [updated] = await tx
                .update(categories_1.categories)
                .set({
                ...data,
                slug: data.slug ? data.slug.toLowerCase().trim() : existing.slug,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(categories_1.categories.id, id))
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'CATEGORY_UPDATE',
                entityType: 'CATEGORY',
                entityId: id,
                details: { before: existing, after: updated },
            }, tx);
            return updated;
        });
    }
    async updateCategoryStatus(id, isActive, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            const [existing] = await tx
                .select()
                .from(categories_1.categories)
                .where((0, drizzle_orm_1.eq)(categories_1.categories.id, id))
                .limit(1);
            if (!existing)
                return null;
            const [updated] = await tx
                .update(categories_1.categories)
                .set({
                isActive,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(categories_1.categories.id, id))
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'CATEGORY_STATUS_UPDATE',
                entityType: 'CATEGORY',
                entityId: id,
                details: { previousActive: existing.isActive, newActive: isActive },
            }, tx);
            return updated;
        });
    }
}
exports.CategoryAdminService = CategoryAdminService;
exports.categoryAdminService = new CategoryAdminService();
