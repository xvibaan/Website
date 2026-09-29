"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productAdminService = exports.ProductAdminService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const products_1 = require("../../db/schema/products");
const categories_1 = require("../../db/schema/categories");
const providers_1 = require("../../db/schema/providers");
const product_variants_1 = require("../../db/schema/product-variants");
const resources_1 = require("../../db/schema/resources");
const orders_1 = require("../../db/schema/orders");
const audit_service_1 = require("./audit.service");
function calculateDiscount(originalPrice, sellingPrice) {
    if (!originalPrice || !sellingPrice)
        return null;
    const orig = parseFloat(originalPrice);
    const sell = parseFloat(sellingPrice);
    if (isNaN(orig) || isNaN(sell) || orig <= 0 || sell >= orig) {
        return null;
    }
    return Math.round(((orig - sell) / orig) * 100);
}
class ProductAdminService {
    async getProducts(query) {
        const db = (0, client_1.getDb)();
        const conditions = [];
        if (query.categoryId) {
            conditions.push((0, drizzle_orm_1.eq)(products_1.products.categoryId, query.categoryId));
        }
        if (query.providerId) {
            conditions.push((0, drizzle_orm_1.eq)(products_1.products.providerId, query.providerId));
        }
        if (query.status) {
            conditions.push((0, drizzle_orm_1.eq)(products_1.products.status, query.status));
        }
        if (query.search) {
            conditions.push((0, drizzle_orm_1.ilike)(products_1.products.name, `%${query.search.trim()}%`));
        }
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
            providerCode: providers_1.providers.code,
        })
            .from(products_1.products)
            .leftJoin(categories_1.categories, (0, drizzle_orm_1.eq)(products_1.products.categoryId, categories_1.categories.id))
            .leftJoin(providers_1.providers, (0, drizzle_orm_1.eq)(products_1.products.providerId, providers_1.providers.id))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.asc)(products_1.products.sortOrder), (0, drizzle_orm_1.desc)(products_1.products.createdAt))
            .limit(query.limit)
            .offset(offset);
        const result = rows.map((r) => ({
            ...r.product,
            categoryName: r.categoryName,
            providerName: r.providerName,
            providerCode: r.providerCode,
            discountPercent: calculateDiscount(r.product.originalPrice, r.product.sellingPrice),
        }));
        return { products: result, total };
    }
    async getProductById(id) {
        const db = (0, client_1.getDb)();
        const rows = await db
            .select({
            product: products_1.products,
            categoryName: categories_1.categories.name,
            categorySlug: categories_1.categories.slug,
            providerName: providers_1.providers.name,
            providerCode: providers_1.providers.code,
        })
            .from(products_1.products)
            .leftJoin(categories_1.categories, (0, drizzle_orm_1.eq)(products_1.products.categoryId, categories_1.categories.id))
            .leftJoin(providers_1.providers, (0, drizzle_orm_1.eq)(products_1.products.providerId, providers_1.providers.id))
            .where((0, drizzle_orm_1.eq)(products_1.products.id, id))
            .limit(1);
        if (rows.length === 0)
            return null;
        const r = rows[0];
        // Fetch variants with discount calculation
        const variantsRows = await db
            .select()
            .from(product_variants_1.productVariants)
            .where((0, drizzle_orm_1.eq)(product_variants_1.productVariants.productId, id))
            .orderBy((0, drizzle_orm_1.asc)(product_variants_1.productVariants.sortOrder), (0, drizzle_orm_1.asc)(product_variants_1.productVariants.createdAt));
        const variants = variantsRows.map((v) => ({
            ...v,
            discountPercent: calculateDiscount(v.originalPrice, v.sellingPrice),
        }));
        // Fetch linked resources
        const linkedResources = await db
            .select({
            id: resources_1.resources.id,
            productId: resources_1.resources.productId,
            name: resources_1.resources.name,
            type: resources_1.resources.type,
            purpose: resources_1.resources.purpose,
            url: resources_1.resources.url,
            status: resources_1.resources.status,
            sortOrder: resources_1.resources.sortOrder,
            createdAt: resources_1.resources.createdAt,
            updatedAt: resources_1.resources.updatedAt,
        })
            .from(resources_1.resources)
            .where((0, drizzle_orm_1.eq)(resources_1.resources.productId, id))
            .orderBy((0, drizzle_orm_1.asc)(resources_1.resources.sortOrder), (0, drizzle_orm_1.asc)(resources_1.resources.createdAt));
        return {
            ...r.product,
            categoryName: r.categoryName,
            categorySlug: r.categorySlug,
            providerName: r.providerName,
            providerCode: r.providerCode,
            discountPercent: calculateDiscount(r.product.originalPrice, r.product.sellingPrice),
            variants,
            resources: linkedResources,
        };
    }
    async createProduct(data, adminUserId) {
        const db = (0, client_1.getDb)();
        // Validate categoryId if provided
        if (data.categoryId) {
            const [cat] = await db.select({ id: categories_1.categories.id }).from(categories_1.categories).where((0, drizzle_orm_1.eq)(categories_1.categories.id, data.categoryId));
            if (!cat) {
                const err = new Error('Invalid categoryId: Category not found');
                err.statusCode = 400;
                err.name = 'BadRequest';
                throw err;
            }
        }
        // Validate providerId if provided
        if (data.providerId) {
            const [prov] = await db.select({ id: providers_1.providers.id }).from(providers_1.providers).where((0, drizzle_orm_1.eq)(providers_1.providers.id, data.providerId));
            if (!prov) {
                const err = new Error('Invalid providerId: Provider not found');
                err.statusCode = 400;
                err.name = 'BadRequest';
                throw err;
            }
        }
        return (0, client_1.withTransaction)(async (tx) => {
            const [created] = await tx
                .insert(products_1.products)
                .values({
                ...data,
                slug: data.slug.toLowerCase().trim(),
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'PRODUCT_CREATE',
                entityType: 'PRODUCT',
                entityId: created.id,
                details: { name: created.name, sellingPrice: created.sellingPrice, costPrice: created.costPrice },
            }, tx);
            return created;
        });
    }
    async updateProduct(id, data, adminUserId) {
        const db = (0, client_1.getDb)();
        // Validate categoryId if provided
        if (data.categoryId) {
            const [cat] = await db.select({ id: categories_1.categories.id }).from(categories_1.categories).where((0, drizzle_orm_1.eq)(categories_1.categories.id, data.categoryId));
            if (!cat) {
                const err = new Error('Invalid categoryId: Category not found');
                err.statusCode = 400;
                err.name = 'BadRequest';
                throw err;
            }
        }
        // Validate providerId if provided
        if (data.providerId) {
            const [prov] = await db.select({ id: providers_1.providers.id }).from(providers_1.providers).where((0, drizzle_orm_1.eq)(providers_1.providers.id, data.providerId));
            if (!prov) {
                const err = new Error('Invalid providerId: Provider not found');
                err.statusCode = 400;
                err.name = 'BadRequest';
                throw err;
            }
        }
        return (0, client_1.withTransaction)(async (tx) => {
            const [existing] = await tx
                .select()
                .from(products_1.products)
                .where((0, drizzle_orm_1.eq)(products_1.products.id, id))
                .limit(1);
            if (!existing)
                return null;
            const [updated] = await tx
                .update(products_1.products)
                .set({
                ...data,
                slug: data.slug ? data.slug.toLowerCase().trim() : existing.slug,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(products_1.products.id, id))
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'PRODUCT_UPDATE',
                entityType: 'PRODUCT',
                entityId: id,
                details: { before: existing, after: updated },
            }, tx);
            return updated;
        });
    }
    async updateProductStatus(id, status, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            const [existing] = await tx
                .select()
                .from(products_1.products)
                .where((0, drizzle_orm_1.eq)(products_1.products.id, id))
                .limit(1);
            if (!existing)
                return null;
            const [updated] = await tx
                .update(products_1.products)
                .set({
                status,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(products_1.products.id, id))
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'PRODUCT_STATUS_UPDATE',
                entityType: 'PRODUCT',
                entityId: id,
                details: { previousStatus: existing.status, newStatus: status },
            }, tx);
            return updated;
        });
    }
    // --- Product Variants Admin Operations ---
    async getVariants(productId) {
        const db = (0, client_1.getDb)();
        // Verify parent product exists
        const [product] = await db.select({ id: products_1.products.id }).from(products_1.products).where((0, drizzle_orm_1.eq)(products_1.products.id, productId));
        if (!product) {
            const err = new Error(`Product '${productId}' not found`);
            err.statusCode = 404;
            err.name = 'NotFound';
            throw err;
        }
        const rows = await db
            .select()
            .from(product_variants_1.productVariants)
            .where((0, drizzle_orm_1.eq)(product_variants_1.productVariants.productId, productId))
            .orderBy((0, drizzle_orm_1.asc)(product_variants_1.productVariants.sortOrder), (0, drizzle_orm_1.asc)(product_variants_1.productVariants.createdAt));
        return rows.map((v) => ({
            ...v,
            discountPercent: calculateDiscount(v.originalPrice, v.sellingPrice),
        }));
    }
    async createVariant(productId, data, adminUserId) {
        const db = (0, client_1.getDb)();
        // Verify parent product exists
        const [product] = await db.select({ id: products_1.products.id }).from(products_1.products).where((0, drizzle_orm_1.eq)(products_1.products.id, productId));
        if (!product) {
            const err = new Error(`Product '${productId}' not found`);
            err.statusCode = 404;
            err.name = 'NotFound';
            throw err;
        }
        return (0, client_1.withTransaction)(async (tx) => {
            const [created] = await tx
                .insert(product_variants_1.productVariants)
                .values({
                ...data,
                productId,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'VARIANT_CREATE',
                entityType: 'PRODUCT_VARIANT',
                entityId: created.id,
                details: { productId, name: created.name, sellingPrice: created.sellingPrice, costPrice: created.costPrice },
            }, tx);
            return {
                ...created,
                discountPercent: calculateDiscount(created.originalPrice, created.sellingPrice),
            };
        });
    }
    async updateVariant(productId, variantId, data, adminUserId) {
        const db = (0, client_1.getDb)();
        const [existing] = await db
            .select()
            .from(product_variants_1.productVariants)
            .where((0, drizzle_orm_1.eq)(product_variants_1.productVariants.id, variantId));
        if (!existing) {
            const err = new Error(`Variant '${variantId}' not found`);
            err.statusCode = 404;
            err.name = 'NotFound';
            throw err;
        }
        if (existing.productId !== productId) {
            const err = new Error('Variant does not belong to the specified product');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        return (0, client_1.withTransaction)(async (tx) => {
            const [updated] = await tx
                .update(product_variants_1.productVariants)
                .set({
                ...data,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(product_variants_1.productVariants.id, variantId))
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'VARIANT_UPDATE',
                entityType: 'PRODUCT_VARIANT',
                entityId: variantId,
                details: { productId, before: existing, after: updated },
            }, tx);
            return {
                ...updated,
                discountPercent: calculateDiscount(updated.originalPrice, updated.sellingPrice),
            };
        });
    }
    async updateVariantStatus(productId, variantId, isActive, adminUserId) {
        return this.updateVariant(productId, variantId, { isActive }, adminUserId);
    }
    async deleteVariant(productId, variantId, adminUserId) {
        const db = (0, client_1.getDb)();
        const [existing] = await db
            .select()
            .from(product_variants_1.productVariants)
            .where((0, drizzle_orm_1.eq)(product_variants_1.productVariants.id, variantId));
        if (!existing) {
            const err = new Error(`Variant '${variantId}' not found`);
            err.statusCode = 404;
            err.name = 'NotFound';
            throw err;
        }
        if (existing.productId !== productId) {
            const err = new Error('Variant does not belong to the specified product');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        // Safety check: ensure variant is not referenced by historical orders
        const [orderCheck] = await db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(orders_1.orderItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(orders_1.orderItems.productId, productId), (0, drizzle_orm_1.eq)(orders_1.orderItems.variantNameSnapshot, existing.name)));
        if (Number(orderCheck?.count || 0) > 0) {
            const err = new Error('Cannot delete variant referenced by existing orders; deactivate it instead');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        return (0, client_1.withTransaction)(async (tx) => {
            await tx.delete(product_variants_1.productVariants).where((0, drizzle_orm_1.eq)(product_variants_1.productVariants.id, variantId));
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'VARIANT_DELETE',
                entityType: 'PRODUCT_VARIANT',
                entityId: variantId,
                details: { productId, variantName: existing.name },
            }, tx);
            return { success: true, deletedVariantId: variantId };
        });
    }
}
exports.ProductAdminService = ProductAdminService;
exports.productAdminService = new ProductAdminService();
