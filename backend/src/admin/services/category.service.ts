import { eq, desc, asc } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/client';
import { categories, Category, NewCategory } from '../../db/schema/categories';
import { auditService } from './audit.service';

export class CategoryAdminService {
  async getCategories(isActive?: boolean): Promise<Category[]> {
    const db = getDb();
    const query = db.select().from(categories);

    if (isActive !== undefined) {
      query.where(eq(categories.isActive, isActive));
    }

    return query.orderBy(asc(categories.sortOrder), desc(categories.createdAt));
  }

  async getCategoryById(id: string): Promise<Category | null> {
    const db = getDb();
    const [found] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return found || null;
  }

  async createCategory(data: NewCategory, adminUserId: string): Promise<Category> {
    return withTransaction(async (tx) => {
      const [created] = await tx
        .insert(categories)
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
          action: 'CATEGORY_CREATE',
          entityType: 'CATEGORY',
          entityId: created.id,
          details: { slug: created.slug, name: created.name },
        },
        tx
      );

      return created;
    });
  }

  async updateCategory(
    id: string,
    data: Partial<NewCategory>,
    adminUserId: string
  ): Promise<Category | null> {
    return withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (!existing) return null;

      const [updated] = await tx
        .update(categories)
        .set({
          ...data,
          slug: data.slug ? data.slug.toLowerCase().trim() : existing.slug,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, id))
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'CATEGORY_UPDATE',
          entityType: 'CATEGORY',
          entityId: id,
          details: { before: existing, after: updated },
        },
        tx
      );

      return updated;
    });
  }

  async updateCategoryStatus(
    id: string,
    isActive: boolean,
    adminUserId: string
  ): Promise<Category | null> {
    return withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (!existing) return null;

      const [updated] = await tx
        .update(categories)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, id))
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'CATEGORY_STATUS_UPDATE',
          entityType: 'CATEGORY',
          entityId: id,
          details: { previousActive: existing.isActive, newActive: isActive },
        },
        tx
      );

      return updated;
    });
  }
}

export const categoryAdminService = new CategoryAdminService();
