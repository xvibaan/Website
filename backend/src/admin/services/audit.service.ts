import { eq, desc, and, count } from 'drizzle-orm';
import { getDb, DbTransaction } from '../../db/client';
import { adminAuditLogs, NewAdminAuditLog, AdminAuditLog } from '../../db/schema/audit-logs';

export class AuditService {
  async record(
    log: {
      adminUserId: string;
      action: string;
      entityType: string;
      entityId?: string | null;
      details?: Record<string, any> | string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    tx?: DbTransaction
  ): Promise<AdminAuditLog> {
    const db = tx || getDb();
    const detailsStr =
      log.details && typeof log.details === 'object'
        ? JSON.stringify(log.details)
        : log.details || null;

    const [created] = await db
      .insert(adminAuditLogs)
      .values({
        adminUserId: log.adminUserId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId ?? null,
        details: detailsStr,
        ipAddress: log.ipAddress ?? null,
        userAgent: log.userAgent ?? null,
        createdAt: new Date(),
      })
      .returning();

    return created;
  }

  async getLogs(
    filter: {
      page: number;
      limit: number;
      action?: string;
      entityType?: string;
      entityId?: string;
      adminUserId?: string;
    },
    tx?: DbTransaction
  ): Promise<{ logs: AdminAuditLog[]; total: number }> {
    const db = tx || getDb();
    const conditions = [];

    if (filter.action) conditions.push(eq(adminAuditLogs.action, filter.action));
    if (filter.entityType) conditions.push(eq(adminAuditLogs.entityType, filter.entityType));
    if (filter.entityId) conditions.push(eq(adminAuditLogs.entityId, filter.entityId));
    if (filter.adminUserId) conditions.push(eq(adminAuditLogs.adminUserId, filter.adminUserId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await db
      .select({ count: count() })
      .from(adminAuditLogs)
      .where(whereClause);

    const total = Number(totalRes?.count || 0);
    const offset = (filter.page - 1) * filter.limit;

    const rows = await db
      .select()
      .from(adminAuditLogs)
      .where(whereClause)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(filter.limit)
      .offset(offset);

    return { logs: rows, total };
  }
}

export const auditService = new AuditService();
