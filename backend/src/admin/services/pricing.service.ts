import { eq, desc, asc, and, ilike, count } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/client';
import { products, Product } from '../../db/schema/products';
import { categories } from '../../db/schema/categories';
import { providers } from '../../db/schema/providers';
import { auditService } from './audit.service';

export interface ProductPricingItem {
  productId: string;
  name: string;
  slug: string;
  categoryName: string | null;
  providerName: string | null;
  sellingPrice: string;
  costPrice: string;
  currency: string;
  margin: string; // sellingPrice - costPrice
  marginPercentage: string; // ((margin / sellingPrice) * 100)%
  status: string;
  updatedAt: Date;
}

export class PricingAdminService {
  async getPricingOverview(query: {
    page: number;
    limit: number;
    categoryId?: string;
    providerId?: string;
    search?: string;
  }): Promise<{ pricing: ProductPricingItem[]; total: number }> {
    const db = getDb();
    const conditions = [];

    if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
    if (query.providerId) conditions.push(eq(products.providerId, query.providerId));
    if (query.search) conditions.push(ilike(products.name, `%${query.search.trim()}%`));

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
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(providers, eq(products.providerId, providers.id))
      .where(whereClause)
      .orderBy(asc(products.sortOrder), desc(products.updatedAt))
      .limit(query.limit)
      .offset(offset);

    const pricing: ProductPricingItem[] = rows.map((r) => {
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

  async updatePricing(
    productId: string,
    data: { sellingPrice: string; costPrice?: string; currency?: string },
    adminUserId: string
  ): Promise<ProductPricingItem | null> {
    return withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!existing) return null;

      const updateData: Partial<Product> = {
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
        .update(products)
        .set(updateData)
        .where(eq(products.id, productId))
        .returning();

      await auditService.record(
        {
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
        },
        tx
      );

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

export const pricingAdminService = new PricingAdminService();
