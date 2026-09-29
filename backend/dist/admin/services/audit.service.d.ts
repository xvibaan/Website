import { DbTransaction } from '../../db/client';
import { AdminAuditLog } from '../../db/schema/audit-logs';
export declare class AuditService {
    record(log: {
        adminUserId: string;
        action: string;
        entityType: string;
        entityId?: string | null;
        details?: Record<string, any> | string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }, tx?: DbTransaction): Promise<AdminAuditLog>;
    getLogs(filter: {
        page: number;
        limit: number;
        action?: string;
        entityType?: string;
        entityId?: string;
        adminUserId?: string;
    }, tx?: DbTransaction): Promise<{
        logs: AdminAuditLog[];
        total: number;
    }>;
}
export declare const auditService: AuditService;
