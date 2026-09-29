import { eq, desc, asc, and, count } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/client';
import { resources, Resource, NewResource } from '../../db/schema/resources';
import { products } from '../../db/schema/products';
import { auditService } from './audit.service';

export interface AdminResourceDetail extends Resource {
  productName: string | null;
}

export class ResourceAdminService {
  async getResources(query: {
    page: number;
    limit: number;
    type?: string;
    status?: string;
    productId?: string;
  }): Promise<{ resources: AdminResourceDetail[]; total: number }> {
    const db = getDb();
    const conditions = [];

    if (query.type) conditions.push(eq(resources.type, query.type));
    if (query.status) conditions.push(eq(resources.status, query.status));
    if (query.productId) conditions.push(eq(resources.productId, query.productId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await db
      .select({ count: count() })
      .from(resources)
      .where(whereClause);

    const total = Number(totalRes?.count || 0);
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        resource: resources,
        productName: products.name,
      })
      .from(resources)
      .leftJoin(products, eq(resources.productId, products.id))
      .where(whereClause)
      .orderBy(asc(resources.sortOrder), desc(resources.createdAt))
      .limit(query.limit)
      .offset(offset);

    const list: AdminResourceDetail[] = rows.map((r) => ({
      ...r.resource,
      productName: r.productName,
    }));

    return { resources: list, total };
  }

  async getResourceById(id: string): Promise<AdminResourceDetail | null> {
    const db = getDb();
    const rows = await db
      .select({
        resource: resources,
        productName: products.name,
      })
      .from(resources)
      .leftJoin(products, eq(resources.productId, products.id))
      .where(eq(resources.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    return {
      ...rows[0].resource,
      productName: rows[0].productName,
    };
  }

  async createResource(data: NewResource, adminUserId: string): Promise<Resource> {
    return withTransaction(async (tx) => {
      const [created] = await tx
        .insert(resources)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'RESOURCE_CREATE',
          entityType: 'RESOURCE',
          entityId: created.id,
          details: { name: created.name, type: created.type, url: created.url },
        },
        tx
      );

      return created;
    });
  }

  async updateResource(
    id: string,
    data: Partial<NewResource>,
    adminUserId: string
  ): Promise<Resource | null> {
    return withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(resources)
        .where(eq(resources.id, id))
        .limit(1);

      if (!existing) return null;

      const [updated] = await tx
        .update(resources)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(resources.id, id))
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'RESOURCE_UPDATE',
          entityType: 'RESOURCE',
          entityId: id,
          details: { before: existing, after: updated },
        },
        tx
      );

      return updated;
    });
  }

  async updateResourceStatus(
    id: string,
    status: 'ACTIVE' | 'DISABLED',
    adminUserId: string
  ): Promise<Resource | null> {
    return withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(resources)
        .where(eq(resources.id, id))
        .limit(1);

      if (!existing) return null;

      const [updated] = await tx
        .update(resources)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(resources.id, id))
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'RESOURCE_STATUS_UPDATE',
          entityType: 'RESOURCE',
          entityId: id,
          details: { previousStatus: existing.status, newStatus: status },
        },
        tx
      );

      return updated;
    });
  }

  async deleteResource(id: string, adminUserId: string): Promise<boolean> {
    return withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(resources)
        .where(eq(resources.id, id))
        .limit(1);

      if (!existing) return false;

      await tx.delete(resources).where(eq(resources.id, id));

      await auditService.record(
        {
          adminUserId,
          action: 'RESOURCE_DELETE',
          entityType: 'RESOURCE',
          entityId: id,
          details: { name: existing.name, url: existing.url },
        },
        tx
      );

      return true;
    });
  }
}

export const resourceAdminService = new ResourceAdminService();
