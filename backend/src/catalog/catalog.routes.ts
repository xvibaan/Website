import { FastifyPluginAsync } from 'fastify';
import { eq, and, asc, desc, inArray } from 'drizzle-orm';
import { getDb } from '../db/client';
import { products } from '../db/schema/products';
import { categories } from '../db/schema/categories';
import { productVariants } from '../db/schema/product-variants';
import { resources } from '../db/schema/resources';

interface ProductsQuery {
  category?: string;
}

function extractFeatures(specs: string | null): string[] {
  if (!specs) return [];
  try {
    const parsed = JSON.parse(specs);
    if (Array.isArray(parsed?.features)) {
      return parsed.features.filter((f: any) => typeof f === 'string');
    }
  } catch {}
  return [];
}

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/products
   * Public endpoint to fetch active products for the customer marketplace.
   * Supports optional query filter: ?category=<categorySlug> (e.g., ?category=gaming)
   */
  app.get<{ Querystring: ProductsQuery }>('/products', async (request, reply) => {
    const db = getDb();
    const { category } = request.query;

    const conditions = [
      eq(products.status, 'ACTIVE'),
      eq(categories.isActive, true),
    ];

    if (category && typeof category === 'string' && category.trim() !== '') {
      conditions.push(eq(categories.slug, category.trim().toLowerCase()));
    }

    // Database-level filtering and join
    const rows = await db
      .select({
        product: products,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(asc(products.sortOrder), desc(products.createdAt));

    if (rows.length === 0) {
      return reply.status(200).send([]);
    }

    const productIds = rows.map((r) => r.product.id);

    // Fetch active variants for all returned products in one efficient query (no N+1)
    const variantsRows = await db
      .select()
      .from(productVariants)
      .where(and(
        inArray(productVariants.productId, productIds),
        eq(productVariants.isActive, true)
      ))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));

    const variantsByProductId = new Map<string, any[]>();
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
        id: resources.id,
        productId: resources.productId,
        name: resources.name,
        type: resources.type,
        purpose: resources.purpose,
        url: resources.url,
        status: resources.status,
        sortOrder: resources.sortOrder,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .where(and(
        inArray(resources.productId, productIds),
        eq(resources.status, 'ACTIVE')
      ))
      .orderBy(asc(resources.sortOrder), asc(resources.createdAt));

    const resourcesByProductId = new Map<string, any[]>();
    for (const r of resourcesRows) {
      if (!r.productId) continue;
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
  app.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const condition = and(
      isUuid ? eq(products.id, id) : eq(products.slug, id),
      eq(products.status, 'ACTIVE'),
      eq(categories.isActive, true)
    );

    const [row] = await db
      .select({
        product: products,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(condition);

    if (!row) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Product not found' });
    }

    const p = row.product;

    // Fetch active variants for this specific product
    const variantsRows = await db
      .select()
      .from(productVariants)
      .where(and(
        eq(productVariants.productId, p.id),
        eq(productVariants.isActive, true)
      ))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));

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
        id: resources.id,
        productId: resources.productId,
        name: resources.name,
        type: resources.type,
        purpose: resources.purpose,
        url: resources.url,
        status: resources.status,
        sortOrder: resources.sortOrder,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .where(and(
        eq(resources.productId, p.id),
        eq(resources.status, 'ACTIVE')
      ))
      .orderBy(asc(resources.sortOrder), asc(resources.createdAt));

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
    const db = getDb();

    const activeCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), desc(categories.createdAt));

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
