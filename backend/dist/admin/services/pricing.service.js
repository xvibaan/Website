"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingAdminService = exports.PricingAdminService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const products_1 = require("../../db/schema/products");
const categories_1 = require("../../db/schema/categories");
const providers_1 = require("../../db/schema/providers");
const audit_service_1 = require("./audit.service");
class PricingAdminService {
    async getPricingOverview(query) {
        const db = (0, client_1.getDb)();
        const conditions = [];
        if (query.categoryId)
            conditions.push((0, drizzle_orm_1.eq)(products_1.products.categoryId, query.categoryId));
        if (query.providerId)
            conditions.push((0, drizzle_orm_1.eq)(products_1.products.providerId, query.providerId));
        if (query.search)
            conditions.push((0, drizzle_orm_1.ilike)(products_1.products.name, `%${query.search.trim()}%`));
        const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const [totalRes] = await db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(products_1.products)
            .where(whereClause);
        const total = Number(totalRes?.count || 0);
        const offset = (query.page - 1) * query.limit;
        const rows = await db
            .select({
            product: products_1.products,
            categoryName: categories_1.categories.name,
            providerName: providers_1.providers.name,
        })
            .from(products_1.products)
            .leftJoin(categories_1.categories, (0, drizzle_orm_1.eq)(products_1.products.categoryId, categories_1.categories.id))
            .leftJoin(providers_1.providers, (0, drizzle_orm_1.eq)(products_1.products.providerId, providers_1.providers.id))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.asc)(products_1.products.sortOrder), (0, drizzle_orm_1.desc)(products_1.products.updatedAt))
            .limit(query.limit)
            .offset(offset);
        const pricing = rows.map((r) => {
            const sp = parseFloat(r.product.sellingPrice) || 0;
            const cp = parseFloat(r.product.costPrice) || 0;
            const marginVal = Math.max(0, sp - cp);
            const marginPct = sp > 0 ? ((marginVal / sp) * 100).toFixed(2) : '0.00';
            return {
                productId: r.product.id,
                name: r.product.name,
                slug: r.product.slug,
                categoryName: r.categoryName,
                providerName: r.providerName,
                sellingPrice: r.product.sellingPrice,
                costPrice: r.product.costPrice,
                currency: r.product.currency,
                margin: marginVal.toFixed(2),
                marginPercentage: `${marginPct}%`,
                status: r.product.status,
                updatedAt: r.product.updatedAt,
            };
        });
        return { pricing, total };
    }
    async updatePricing(productId, data, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            const [existing] = await tx
                .select()
                .from(products_1.products)
                .where((0, drizzle_orm_1.eq)(products_1.products.id, productId))
                .limit(1);
            if (!existing)
                return null;
            const updateData = {
                sellingPrice: data.sellingPrice,
                updatedAt: new Date(),
            };
            if (data.costPrice !== undefined) {
                updateData.costPrice = data.costPrice;
            }
            if (data.currency) {
                updateData.currency = data.currency;
            }
            const [updated] = await tx
                .update(products_1.products)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(products_1.products.id, productId))
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'PRICING_UPDATE',
                entityType: 'PRODUCT',
                entityId: productId,
                details: {
                    oldSellingPrice: existing.sellingPrice,
                    newSellingPrice: updated.sellingPrice,
                    oldCostPrice: existing.costPrice,
                    newCostPrice: updated.costPrice,
                },
            }, tx);
            const sp = parseFloat(updated.sellingPrice) || 0;
            const cp = parseFloat(updated.costPrice) || 0;
            const marginVal = Math.max(0, sp - cp);
            const marginPct = sp > 0 ? ((marginVal / sp) * 100).toFixed(2) : '0.00';
            return {
                productId: updated.id,
                name: updated.name,
                slug: updated.slug,
                categoryName: null,
                providerName: null,
                sellingPrice: updated.sellingPrice,
                costPrice: updated.costPrice,
                currency: updated.currency,
                margin: marginVal.toFixed(2),
                marginPercentage: `${marginPct}%`,
                status: updated.status,
                updatedAt: updated.updatedAt,
            };
        });
    }
}
exports.PricingAdminService = PricingAdminService;
exports.pricingAdminService = new PricingAdminService();
