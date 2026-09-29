"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const audit_logs_1 = require("../../db/schema/audit-logs");
class AuditService {
    async record(log, tx) {
        const db = tx || (0, client_1.getDb)();
        const detailsStr = log.details && typeof log.details === 'object'
            ? JSON.stringify(log.details)
            : log.details || null;
        const [created] = await db
            .insert(audit_logs_1.adminAuditLogs)
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
    async getLogs(filter, tx) {
        const db = tx || (0, client_1.getDb)();
        const conditions = [];
        if (filter.action)
            conditions.push((0, drizzle_orm_1.eq)(audit_logs_1.adminAuditLogs.action, filter.action));
        if (filter.entityType)
            conditions.push((0, drizzle_orm_1.eq)(audit_logs_1.adminAuditLogs.entityType, filter.entityType));
        if (filter.entityId)
            conditions.push((0, drizzle_orm_1.eq)(audit_logs_1.adminAuditLogs.entityId, filter.entityId));
        if (filter.adminUserId)
            conditions.push((0, drizzle_orm_1.eq)(audit_logs_1.adminAuditLogs.adminUserId, filter.adminUserId));
        const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const [totalRes] = await db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(audit_logs_1.adminAuditLogs)
            .where(whereClause);
        const total = Number(totalRes?.count || 0);
        const offset = (filter.page - 1) * filter.limit;
        const rows = await db
            .select()
            .from(audit_logs_1.adminAuditLogs)
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.desc)(audit_logs_1.adminAuditLogs.createdAt))
            .limit(filter.limit)
            .offset(offset);
        return { logs: rows, total };
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
