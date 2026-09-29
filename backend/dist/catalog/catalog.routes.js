"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogRoutes = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const products_1 = require("../db/schema/products");
const categories_1 = require("../db/schema/categories");
const product_variants_1 = require("../db/schema/product-variants");
const resources_1 = require("../db/schema/resources");
function extractFeatures(specs) {
    if (!specs)
        return [];
    try {
        const parsed = JSON.parse(specs);
        if (Array.isArray(parsed?.features)) {
            return parsed.features.filter((f) => typeof f === 'string');
        }
    }
    catch { }
    return [];
}
const catalogRoutes = async (app) => {
    /**
     * GET /api/v1/products
     * Public endpoint to fetch active products for the customer marketplace.
     * Supports optional query filter: ?category=<categorySlug> (e.g., ?category=gaming)
     */
    app.get('/products', async (request, reply) => {
        const db = (0, client_1.getDb)();
        const { category } = request.query;
        const conditions = [
            (0, drizzle_orm_1.eq)(products_1.products.status, 'ACTIVE'),
            (0, drizzle_orm_1.eq)(categories_1.categories.isActive, true),
        ];
        if (category && typeof category === 'string' && category.trim() !== '') {
            conditions.push((0, drizzle_orm_1.eq)(categories_1.categories.slug, category.trim().toLowerCase()));
        }
        // Database-level filtering and join
        const rows = await db
            .select({
            product: products_1.products,
            categoryName: categories_1.categories.name,
            categorySlug: categories_1.categories.slug,
        })
            .from(products_1.products)
            .innerJoin(categories_1.categories, (0, drizzle_orm_1.eq)(products_1.products.categoryId, categories_1.categories.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.asc)(products_1.products.sortOrder), (0, drizzle_orm_1.desc)(products_1.products.createdAt));
        if (rows.length === 0) {
            return reply.status(200).send([]);
        }
        const productIds = rows.map((r) => r.product.id);
        // Fetch active variants for all returned products in one efficient query (no N+1)
        const variantsRows = await db
            .select()
            .from(product_variants_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(product_variants_1.productVariants.productId, productIds), (0, drizzle_orm_1.eq)(product_variants_1.productVariants.isActive, true)))
            .orderBy((0, drizzle_orm_1.asc)(product_variants_1.productVariants.sortOrder), (0, drizzle_orm_1.asc)(product_variants_1.productVariants.createdAt));
        const variantsByProductId = new Map();
        for (const v of variantsRows) {
            const list = variantsByProductId.get(v.productId) || [];
            list.push({
                id: v.id,
                productId: v.productId,
                product_id: v.productId,
                name: v.name,
                config_name: v.name,
                duration: v.duration,
                originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
                face_value: v.originalPrice ? Number(v.originalPrice) : null,
                sellingPrice: Number(v.sellingPrice),
                price: Number(v.sellingPrice),
                currency: 'INR',
                specs: v.specs,
                availableStock: v.availableStock,
                available_stock: v.availableStock,
                isActive: v.isActive,
                is_active: v.isActive,
                sortOrder: v.sortOrder,
                createdAt: v.createdAt,
            });
            variantsByProductId.set(v.productId, list);
        }
        // Fetch active resources for returned products
        const resourcesRows = await db
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
        })
            .from(resources_1.resources)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(resources_1.resources.productId, productIds), (0, drizzle_orm_1.eq)(resources_1.resources.status, 'ACTIVE')))
            .orderBy((0, drizzle_orm_1.asc)(resources_1.resources.sortOrder), (0, drizzle_orm_1.asc)(resources_1.resources.createdAt));
        const resourcesByProductId = new Map();
        for (const r of resourcesRows) {
            if (!r.productId)
                continue;
            const list = resourcesByProductId.get(r.productId) || [];
            list.push({
                id: r.id,
                productId: r.productId,
                name: r.name,
                type: r.type,
                purpose: r.purpose,
                url: r.url,
                status: r.status,
                sortOrder: r.sortOrder,
                createdAt: r.createdAt,
            });
            resourcesByProductId.set(r.productId, list);
        }
        // Map to public customer response with zero sensitive data
        const mappedProducts = rows.map((row) => {
            const p = row.product;
            const prodVariants = variantsByProductId.get(p.id) || [];
            const prodResources = resourcesByProductId.get(p.id) || [];
            return {
                id: p.id,
                name: p.name,
                title: p.name,
                slug: p.slug,
                shortDescription: p.shortDescription,
                description: p.description,
                category: row.categoryName || null,
                categoryId: p.categoryId,
                categorySlug: row.categorySlug || null,
                originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
                sellingPrice: Number(p.sellingPrice),
                basePrice: Number(p.sellingPrice),
                price: Number(p.sellingPrice),
                currency: p.currency || 'INR',
                imageUrl: p.imageUrl,
                image_url: p.imageUrl,
                specs: p.specs,
                status: p.status,
                is_active: p.status === 'ACTIVE',
                sortOrder: p.sortOrder,
                features: extractFeatures(p.specs),
                variants: prodVariants,
                resources: prodResources,
                createdAt: p.createdAt,
                created_at: p.createdAt,
            };
        });
        return reply.status(200).send(mappedProducts);
    });
    /**
     * GET /api/v1/products/:id
     * Public endpoint to fetch a single product by ID (or slug fallback).
     */
    app.get('/products/:id', async (request, reply) => {
        const db = (0, client_1.getDb)();
        const { id } = request.params;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const condition = (0, drizzle_orm_1.and)(isUuid ? (0, drizzle_orm_1.eq)(products_1.products.id, id) : (0, drizzle_orm_1.eq)(products_1.products.slug, id), (0, drizzle_orm_1.eq)(products_1.products.status, 'ACTIVE'), (0, drizzle_orm_1.eq)(categories_1.categories.isActive, true));
        const [row] = await db
            .select({
            product: products_1.products,
            categoryName: categories_1.categories.name,
            categorySlug: categories_1.categories.slug,
        })
            .from(products_1.products)
            .innerJoin(categories_1.categories, (0, drizzle_orm_1.eq)(products_1.products.categoryId, categories_1.categories.id))
            .where(condition);
        if (!row) {
            return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Product not found' });
        }
        const p = row.product;
        // Fetch active variants for this specific product
        const variantsRows = await db
            .select()
            .from(product_variants_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(product_variants_1.productVariants.productId, p.id), (0, drizzle_orm_1.eq)(product_variants_1.productVariants.isActive, true)))
            .orderBy((0, drizzle_orm_1.asc)(product_variants_1.productVariants.sortOrder), (0, drizzle_orm_1.asc)(product_variants_1.productVariants.createdAt));
        const mappedVariants = variantsRows.map((v) => ({
            id: v.id,
            productId: v.productId,
            product_id: v.productId,
            name: v.name,
            config_name: v.name,
            duration: v.duration,
            originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
            face_value: v.originalPrice ? Number(v.originalPrice) : null,
            sellingPrice: Number(v.sellingPrice),
            price: Number(v.sellingPrice),
            currency: p.currency || 'INR',
            specs: v.specs,
            availableStock: v.availableStock,
            available_stock: v.availableStock,
            isActive: v.isActive,
            is_active: v.isActive,
            sortOrder: v.sortOrder,
            createdAt: v.createdAt,
        }));
        // Fetch active resources for this specific product
        const resourcesRows = await db
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
        })
            .from(resources_1.resources)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(resources_1.resources.productId, p.id), (0, drizzle_orm_1.eq)(resources_1.resources.status, 'ACTIVE')))
            .orderBy((0, drizzle_orm_1.asc)(resources_1.resources.sortOrder), (0, drizzle_orm_1.asc)(resources_1.resources.createdAt));
        const mappedResources = resourcesRows.map((r) => ({
            id: r.id,
            productId: r.productId,
            name: r.name,
            type: r.type,
            purpose: r.purpose,
            url: r.url,
            status: r.status,
            sortOrder: r.sortOrder,
            createdAt: r.createdAt,
        }));
        const mappedProduct = {
            id: p.id,
            name: p.name,
            title: p.name,
            slug: p.slug,
            shortDescription: p.shortDescription,
            description: p.description,
            category: row.categoryName || null,
            categoryId: p.categoryId,
            categorySlug: row.categorySlug || null,
            originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
            sellingPrice: Number(p.sellingPrice),
            basePrice: Number(p.sellingPrice),
            price: Number(p.sellingPrice),
            currency: p.currency || 'INR',
            imageUrl: p.imageUrl,
            image_url: p.imageUrl,
            specs: p.specs,
            status: p.status,
            is_active: p.status === 'ACTIVE',
            sortOrder: p.sortOrder,
            features: extractFeatures(p.specs),
            variants: mappedVariants,
            resources: mappedResources,
            createdAt: p.createdAt,
            created_at: p.createdAt,
        };
        return reply.status(200).send(mappedProduct);
    });
    /**
     * GET /api/v1/categories
     * Public endpoint to fetch active categories for the customer marketplace.
     */
    app.get('/categories', async (request, reply) => {
        const db = (0, client_1.getDb)();
        const activeCategories = await db
            .select()
            .from(categories_1.categories)
            .where((0, drizzle_orm_1.eq)(categories_1.categories.isActive, true))
            .orderBy((0, drizzle_orm_1.asc)(categories_1.categories.sortOrder), (0, drizzle_orm_1.desc)(categories_1.categories.createdAt));
        const mappedCategories = activeCategories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            icon: c.icon,
            sortOrder: c.sortOrder,
        }));
        return reply.status(200).send(mappedCategories);
    });
};
exports.catalogRoutes = catalogRoutes;
