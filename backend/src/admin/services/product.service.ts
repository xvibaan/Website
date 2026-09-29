import { eq, desc, asc, and, ilike, count } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/client';
import { products, Product, NewProduct } from '../../db/schema/products';
import { categories } from '../../db/schema/categories';
import { providers } from '../../db/schema/providers';
import { productVariants, ProductVariant, NewProductVariant } from '../../db/schema/product-variants';
import { resources } from '../../db/schema/resources';
import { orderItems } from '../../db/schema/orders';
import { auditService } from './audit.service';

export interface AdminProductVariantDetail extends ProductVariant {
  discountPercent: number | null;
}

export interface AdminProductDetail extends Product {
  categoryName: string | null;
  categorySlug: string | null;
  providerName: string | null;
  providerCode: string | null;
  discountPercent: number | null;
  variants: AdminProductVariantDetail[];
  resources: any[];
}

function calculateDiscount(originalPrice?: string | null, sellingPrice?: string | null): number | null {
  if (!originalPrice || !sellingPrice) return null;
  const orig = parseFloat(originalPrice);
  const sell = parseFloat(sellingPrice);
  if (isNaN(orig) || isNaN(sell) || orig <= 0 || sell >= orig) {
    return null;
  }
  return Math.round(((orig - sell) / orig) * 100);
}

export class ProductAdminService {
  async getProducts(query: {
    page: number;
    limit: number;
    categoryId?: string;
    providerId?: string;
    status?: string;
    search?: string;
  }): Promise<{ products: (Product & { categoryName: string | null; providerName: string | null; providerCode: string | null; discountPercent: number | null })[]; total: number }> {
    const db = getDb();
    const conditions = [];

    if (query.categoryId) {
      conditions.push(eq(products.categoryId, query.categoryId));
    }
    if (query.providerId) {
      conditions.push(eq(products.providerId, query.providerId));
    }
    if (query.status) {
      conditions.push(eq(products.status, query.status));
    }
    if (query.search) {
      conditions.push(ilike(products.name, `%${query.search.trim()}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await db
      .select({ count: count() })
      .from(products)
      .where(whereClause);

    const total = Number(totalRes?.count || 0);
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        product: products,
        categoryName: categories.name,
        providerName: providers.name,
        providerCode: providers.code,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(providers, eq(products.providerId, providers.id))
      .where(whereClause)
      .orderBy(asc(products.sortOrder), desc(products.createdAt))
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

  async getProductById(id: string): Promise<AdminProductDetail | null> {
    const db = getDb();
    const rows = await db
      .select({
        product: products,
        categoryName: categories.name,
        categorySlug: categories.slug,
        providerName: providers.name,
        providerCode: providers.code,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(providers, eq(products.providerId, providers.id))
      .where(eq(products.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    const r = rows[0];

    // Fetch variants with discount calculation
    const variantsRows = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));

    const variants: AdminProductVariantDetail[] = variantsRows.map((v) => ({
      ...v,
      discountPercent: calculateDiscount(v.originalPrice, v.sellingPrice),
    }));

    // Fetch linked resources
    const linkedResources = await db
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
        updatedAt: resources.updatedAt,
      })
      .from(resources)
      .where(eq(resources.productId, id))
      .orderBy(asc(resources.sortOrder), asc(resources.createdAt));

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

  async createProduct(data: NewProduct, adminUserId: string): Promise<Product> {
    const db = getDb();

    // Validate categoryId if provided
    if (data.categoryId) {
      const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, data.categoryId));
      if (!cat) {
        const err: any = new Error('Invalid categoryId: Category not found');
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }
    }

    // Validate providerId if provided
    if (data.providerId) {
      const [prov] = await db.select({ id: providers.id }).from(providers).where(eq(providers.id, data.providerId));
      if (!prov) {
        const err: any = new Error('Invalid providerId: Provider not found');
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }
    }

    return withTransaction(async (tx) => {
      const [created] = await tx
        .insert(products)
        .values({
          ...data,
          slug: data.slug.toLowerCase().trim(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'PRODUCT_CREATE',
          entityType: 'PRODUCT',
          entityId: created.id,
          details: { name: created.name, sellingPrice: created.sellingPrice, costPrice: created.costPrice },
        },
        tx
      );

      return created;
    });
  }

  async updateProduct(
    id: string,
    data: Partial<NewProduct>,
    adminUserId: string
  ): Promise<Product | null> {
    const db = getDb();

    // Validate categoryId if provided
    if (data.categoryId) {
      const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, data.categoryId));
      if (!cat) {
        const err: any = new Error('Invalid categoryId: Category not found');
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }
    }

    // Validate providerId if provided
    if (data.providerId) {
      const [prov] = await db.select({ id: providers.id }).from(providers).where(eq(providers.id, data.providerId));
      if (!prov) {
        const err: any = new Error('Invalid providerId: Provider not found');
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }
    }

    return withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (!existing) return null;

      const [updated] = await tx
        .update(products)
        .set({
          ...data,
          slug: data.slug ? data.slug.toLowerCase().trim() : existing.slug,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'PRODUCT_UPDATE',
          entityType: 'PRODUCT',
          entityId: id,
          details: { before: existing, after: updated },
        },
        tx
      );

      return updated;
    });
  }

  async updateProductStatus(
    id: string,
    status: 'ACTIVE' | 'DISABLED' | 'OUT_OF_STOCK' | 'DISCONTINUED',
    adminUserId: string
  ): Promise<Product | null> {
    return withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (!existing) return null;

      const [updated] = await tx
        .update(products)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'PRODUCT_STATUS_UPDATE',
          entityType: 'PRODUCT',
          entityId: id,
          details: { previousStatus: existing.status, newStatus: status },
        },
        tx
      );

      return updated;
    });
  }

  // --- Product Variants Admin Operations ---

  async getVariants(productId: string): Promise<AdminProductVariantDetail[]> {
    const db = getDb();

    // Verify parent product exists
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
    if (!product) {
      const err: any = new Error(`Product '${productId}' not found`);
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    const rows = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));

    return rows.map((v) => ({
      ...v,
      discountPercent: calculateDiscount(v.originalPrice, v.sellingPrice),
    }));
  }

  async createVariant(
    productId: string,
    data: Omit<NewProductVariant, 'productId'>,
    adminUserId: string
  ): Promise<AdminProductVariantDetail> {
    const db = getDb();

    // Verify parent product exists
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
    if (!product) {
      const err: any = new Error(`Product '${productId}' not found`);
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    return withTransaction(async (tx) => {
      const [created] = await tx
        .insert(productVariants)
        .values({
          ...data,
          productId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'VARIANT_CREATE',
          entityType: 'PRODUCT_VARIANT',
          entityId: created.id,
          details: { productId, name: created.name, sellingPrice: created.sellingPrice, costPrice: created.costPrice },
        },
        tx
      );

      return {
        ...created,
        discountPercent: calculateDiscount(created.originalPrice, created.sellingPrice),
      };
    });
  }

  async updateVariant(
    productId: string,
    variantId: string,
    data: Partial<NewProductVariant>,
    adminUserId: string
  ): Promise<AdminProductVariantDetail> {
    const db = getDb();

    const [existing] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId));

    if (!existing) {
      const err: any = new Error(`Variant '${variantId}' not found`);
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    if (existing.productId !== productId) {
      const err: any = new Error('Variant does not belong to the specified product');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    return withTransaction(async (tx) => {
      const [updated] = await tx
        .update(productVariants)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, variantId))
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'VARIANT_UPDATE',
          entityType: 'PRODUCT_VARIANT',
          entityId: variantId,
          details: { productId, before: existing, after: updated },
        },
        tx
      );

      return {
        ...updated,
        discountPercent: calculateDiscount(updated.originalPrice, updated.sellingPrice),
      };
    });
  }

  async updateVariantStatus(
    productId: string,
    variantId: string,
    isActive: boolean,
    adminUserId: string
  ): Promise<AdminProductVariantDetail> {
    return this.updateVariant(productId, variantId, { isActive }, adminUserId);
  }

  async deleteVariant(
    productId: string,
    variantId: string,
    adminUserId: string
  ): Promise<{ success: boolean; deletedVariantId: string }> {
    const db = getDb();

    const [existing] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId));

    if (!existing) {
      const err: any = new Error(`Variant '${variantId}' not found`);
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    if (existing.productId !== productId) {
      const err: any = new Error('Variant does not belong to the specified product');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    // Safety check: ensure variant is not referenced by historical orders
    const [orderCheck] = await db
      .select({ count: count() })
      .from(orderItems)
      .where(and(eq(orderItems.productId, productId), eq(orderItems.variantNameSnapshot, existing.name)));

    if (Number(orderCheck?.count || 0) > 0) {
      const err: any = new Error('Cannot delete variant referenced by existing orders; deactivate it instead');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    return withTransaction(async (tx) => {
      await tx.delete(productVariants).where(eq(productVariants.id, variantId));

      await auditService.record(
        {
          adminUserId,
          action: 'VARIANT_DELETE',
          entityType: 'PRODUCT_VARIANT',
          entityId: variantId,
          details: { productId, variantName: existing.name },
        },
        tx
      );

      return { success: true, deletedVariantId: variantId };
    });
  }
}

export const productAdminService = new ProductAdminService();
