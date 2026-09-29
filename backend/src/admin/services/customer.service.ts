import { eq, desc, and, ilike, count } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/client';
import { users, User } from '../../db/schema/users';
import { wallets } from '../../db/schema/wallets';
import { auditService } from './audit.service';

export interface SafeAdminCustomer {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  wallet: {
    id: string;
    balance: string;
    currency: string;
    status: string;
  } | null;
}

export class CustomerAdminService {
  async getCustomers(query: {
    page: number;
    limit: number;
    search?: string;
    role?: 'customer' | 'admin';
    isActive?: boolean;
  }): Promise<{ customers: SafeAdminCustomer[]; total: number }> {
    const db = getDb();
    const conditions = [];

    if (query.role) {
      conditions.push(eq(users.role, query.role));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(users.isActive, query.isActive));
    }
    if (query.search) {
      conditions.push(ilike(users.email, `%${query.search.trim()}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const total = Number(totalRes?.count || 0);
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        user: users,
        wallet: wallets,
      })
      .from(users)
      .leftJoin(wallets, eq(users.id, wallets.userId))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(query.limit)
      .offset(offset);

    const customers: SafeAdminCustomer[] = rows.map((r) => ({
      id: r.user.id,
      email: r.user.email,
      role: r.user.role,
      isActive: r.user.isActive,
      createdAt: r.user.createdAt,
      updatedAt: r.user.updatedAt,
      wallet: r.wallet
        ? {
            id: r.wallet.id,
            balance: r.wallet.balance,
            currency: r.wallet.currency,
            status: r.wallet.status,
          }
        : null,
    }));

    return { customers, total };
  }

  async getCustomerById(id: string): Promise<SafeAdminCustomer | null> {
    const db = getDb();
    const rows = await db
      .select({
        user: users,
        wallet: wallets,
      })
      .from(users)
      .leftJoin(wallets, eq(users.id, wallets.userId))
      .where(eq(users.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      id: r.user.id,
      email: r.user.email,
      role: r.user.role,
      isActive: r.user.isActive,
      createdAt: r.user.createdAt,
      updatedAt: r.user.updatedAt,
      wallet: r.wallet
        ? {
            id: r.wallet.id,
            balance: r.wallet.balance,
            currency: r.wallet.currency,
            status: r.wallet.status,
          }
        : null,
    };
  }

  async updateCustomerStatus(
    id: string,
    isActive: boolean,
    reason: string | undefined,
    adminUserId: string
  ): Promise<SafeAdminCustomer | null> {
    return withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!existing) return null;

      const [updated] = await tx
        .update(users)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      await auditService.record(
        {
          adminUserId,
          action: 'CUSTOMER_STATUS_UPDATE',
          entityType: 'USER',
          entityId: id,
          details: {
            previousActive: existing.isActive,
            newActive: isActive,
            reason: reason || null,
          },
        },
        tx
      );

      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, id))
        .limit(1);

      return {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        wallet: wallet
          ? {
              id: wallet.id,
              balance: wallet.balance,
              currency: wallet.currency,
              status: wallet.status,
            }
          : null,
      };
    });
  }
}

export const customerAdminService = new CustomerAdminService();
