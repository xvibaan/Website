"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertService = exports.AlertService = void 0;
const client_1 = require("../../db/client");
const system_alerts_1 = require("../../db/schema/system-alerts");
const drizzle_orm_1 = require("drizzle-orm");
class AlertService {
    async raiseAlert(params, tx) {
        const db = tx || (0, client_1.getDb)();
        // Log to standard output for external monitoring systems (Datadog/CloudWatch etc.)
        console.error(JSON.stringify({
            level: 'error',
            alert: true,
            ...params
        }));
        const [alert] = await db
            .insert(system_alerts_1.systemAlerts)
            .values({
            type: params.type,
            severity: params.severity,
            message: params.message,
            details: params.details || null,
            isResolved: false,
        })
            .returning();
        return alert;
    }
    async resolveAlert(id, adminUserId) {
        const db = (0, client_1.getDb)();
        const [alert] = await db
            .update(system_alerts_1.systemAlerts)
            .set({
            isResolved: true,
            resolvedAt: new Date(),
            resolvedBy: adminUserId,
        })
            .where((0, drizzle_orm_1.eq)(system_alerts_1.systemAlerts.id, id))
            .returning();
        return alert || null;
    }
    async getAlerts(filter) {
        const db = (0, client_1.getDb)();
        const conditions = [];
        if (filter.type)
            conditions.push((0, drizzle_orm_1.eq)(system_alerts_1.systemAlerts.type, filter.type));
        if (filter.severity)
            conditions.push((0, drizzle_orm_1.eq)(system_alerts_1.systemAlerts.severity, filter.severity));
        if (filter.isResolved !== undefined)
            conditions.push((0, drizzle_orm_1.eq)(system_alerts_1.systemAlerts.isResolved, filter.isResolved));
        const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const [totalRes] = await db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(system_alerts_1.systemAlerts)
            .where(whereClause);
        const total = Number(totalRes?.count || 0);
        const offset = (filter.page - 1) * filter.limit;
        const rows = await db
            .select()
            .from(system_alerts_1.systemAlerts)
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.desc)(system_alerts_1.systemAlerts.createdAt))
            .limit(filter.limit)
            .offset(offset);
        return { alerts: rows, total };
    }
}
exports.AlertService = AlertService;
exports.alertService = new AlertService();
