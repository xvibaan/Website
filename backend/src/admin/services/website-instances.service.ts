import { eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { websiteInstances, domainRoutes } from '../../db/schema/website-instances';
import { resellers } from '../../db/schema/resellers';

export class WebsiteInstanceService {
  async listInstances() {
    const db = getDb();
    const instances = await db
      .select({
        id: websiteInstances.id,
        instanceName: websiteInstances.instanceName,
        status: websiteInstances.status,
        primaryDomain: websiteInstances.primaryDomain,
        createdAt: websiteInstances.createdAt,
        reseller: {
          id: resellers.id,
          businessName: resellers.businessName,
        },
      })
      .from(websiteInstances)
      .leftJoin(resellers, eq(websiteInstances.resellerId, resellers.id));
    return instances;
  }

  async getInstance(id: string) {
    const db = getDb();
    const instance = await db.query.websiteInstances.findFirst({
      where: eq(websiteInstances.id, id),
    });
    if (!instance) return null;

    const reseller = await db.query.resellers.findFirst({
      where: eq(resellers.id, instance.resellerId),
    });

    const domains = await db.query.domainRoutes.findMany({
      where: eq(domainRoutes.instanceId, id),
    });

    return { ...instance, reseller, domains };
  }

  async createInstance(data: any) {
    const db = getDb();
    const [instance] = await db.insert(websiteInstances).values({
      instanceName: data.instanceName,
      resellerId: data.resellerId,
      status: data.status || 'PENDING',
    }).returning();
    return instance;
  }

  async updateInstance(id: string, data: any) {
    const db = getDb();
    const [updated] = await db.update(websiteInstances).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(websiteInstances.id, id)).returning();
    return updated;
  }

  async addDomain(instanceId: string, data: any) {
    const db = getDb();
    const [domain] = await db.insert(domainRoutes).values({
      instanceId,
      hostname: data.hostname,
      hostnameType: data.hostnameType,
    }).returning();
    return domain;
  }

  async updateDomain(id: string, data: any) {
    const db = getDb();
    const [updated] = await db.update(domainRoutes).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(domainRoutes.id, id)).returning();
    return updated;
  }

  async removeDomain(id: string) {
    const db = getDb();
    await db.delete(domainRoutes).where(eq(domainRoutes.id, id));
  }
}

export const websiteInstanceService = new WebsiteInstanceService();
