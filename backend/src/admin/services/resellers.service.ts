import { getDb } from '../../db/client';
import { resellers } from '../../db/schema/resellers';
import { users } from '../../db/schema/users';
import { eq, desc } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';

export class ResellerService {
  async listResellers() {
    const db = getDb();
    return await db.select({
      id: resellers.id,
      code: resellers.code,
      businessName: resellers.businessName,
      contactEmail: resellers.contactEmail,
      status: resellers.status,
      plan: resellers.plan,
      apiAccessEnabled: resellers.apiAccessEnabled,
      createdAt: resellers.createdAt,
      owner: {
        id: users.id,
        email: users.email,
      }
    })
    .from(resellers)
    .innerJoin(users, eq(resellers.ownerId, users.id))
    .orderBy(resellers.businessName);
  }

  async getReseller(id: string) {
    const db = getDb();
    const records = await db.select({
      id: resellers.id,
      code: resellers.code,
      businessName: resellers.businessName,
      contactEmail: resellers.contactEmail,
      status: resellers.status,
      plan: resellers.plan,
      apiAccessEnabled: resellers.apiAccessEnabled,
      catalogScope: resellers.catalogScope,
      pricingScope: resellers.pricingScope,
      createdAt: resellers.createdAt,
      owner: {
        id: users.id,
        email: users.email,
      }
    })
    .from(resellers)
    .innerJoin(users, eq(resellers.ownerId, users.id))
    .where(eq(resellers.id, id));

    return records[0] || null;
  }

  async createReseller(data: {
    businessName: string;
    code: string;
    ownerEmail: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
    plan: string;
  }) {
    const db = getDb();
    // 1. Find or create owner user
    let user = await db.query.users.findFirst({
      where: eq(users.email, data.ownerEmail),
    });

    if (!user) {
      const randomPassword = randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      
      const insertResult = await db.insert(users).values({
        email: data.ownerEmail,
        passwordHash,
        role: 'customer', // Or custom role if available
      }).returning();
      user = insertResult[0];
    }

    // 2. Check duplicate code
    const existing = await db.query.resellers.findFirst({
      where: eq(resellers.code, data.code),
    });

    if (existing) {
      throw new Error('RESELLER_CODE_IN_USE');
    }

    const inserted = await db.insert(resellers).values({
      businessName: data.businessName,
      code: data.code,
      ownerId: user.id,
      contactEmail: data.ownerEmail,
      status: data.status,
      plan: data.plan,
    }).returning();

    return inserted[0];
  }

  async updateReseller(id: string, data: Partial<{
    businessName: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
    plan: string;
    apiAccessEnabled: boolean;
  }>) {
    const db = getDb();
    const updated = await db.update(resellers)
      .set(data)
      .where(eq(resellers.id, id))
      .returning();
    
    return updated[0];
  }

  async generateApiToken(id: string) {
    const secret = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(secret).digest('hex');

    const db = getDb();
    await db.update(resellers)
      .set({ 
        apiSecretHash: hash,
        apiAccessEnabled: true,
      })
      .where(eq(resellers.id, id));

    return { secret };
  }

  async revokeApiToken(id: string) {
    const db = getDb();
    await db.update(resellers)
      .set({ 
        apiSecretHash: null,
        apiAccessEnabled: false,
      })
      .where(eq(resellers.id, id));
  }
}

export const resellerService = new ResellerService();
