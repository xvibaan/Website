import { getDb, DbTransaction } from '../../db/client';
import { systemAlerts, NewSystemAlert, SystemAlert } from '../../db/schema/system-alerts';
import { eq, desc, and, count } from 'drizzle-orm';

export interface CreateAlertParams {
  type: 'WALLET_MISMATCH' | 'WEBHOOK_FAILURE' | 'PROVIDER_OUTAGE' | 'ORDER_RECONCILIATION_FAILURE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  details?: Record<string, any>;
}

export class AlertService {
  async raiseAlert(params: CreateAlertParams, tx?: DbTransaction): Promise<SystemAlert> {
    const db = tx || getDb();
    
    // Log to standard output for external monitoring systems (Datadog/CloudWatch etc.)
    console.error(JSON.stringify({
      level: 'error',
      alert: true,
      ...params
    }));

    const [alert] = await db
      .insert(systemAlerts)
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

  async resolveAlert(id: string, adminUserId: string): Promise<SystemAlert | null> {
    const db = getDb();
    const [alert] = await db
      .update(systemAlerts)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: adminUserId,
      })
      .where(eq(systemAlerts.id, id))
      .returning();
      
    return alert || null;
  }

  async getAlerts(filter: {
    page: number;
    limit: number;
    type?: string;
    isResolved?: boolean;
    severity?: string;
  }): Promise<{ alerts: SystemAlert[]; total: number }> {
    const db = getDb();
    const conditions = [];

    if (filter.type) conditions.push(eq(systemAlerts.type, filter.type));
    if (filter.severity) conditions.push(eq(systemAlerts.severity, filter.severity));
    if (filter.isResolved !== undefined) conditions.push(eq(systemAlerts.isResolved, filter.isResolved));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await db
      .select({ count: count() })
      .from(systemAlerts)
      .where(whereClause);

    const total = Number(totalRes?.count || 0);
    const offset = (filter.page - 1) * filter.limit;

    const rows = await db
      .select()
      .from(systemAlerts)
      .where(whereClause)
      .orderBy(desc(systemAlerts.createdAt))
      .limit(filter.limit)
      .offset(offset);

    return { alerts: rows, total };
  }
}

export const alertService = new AlertService();
