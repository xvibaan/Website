import { DbTransaction } from '../../db/client';
import { SystemAlert } from '../../db/schema/system-alerts';
export interface CreateAlertParams {
    type: 'WALLET_MISMATCH' | 'WEBHOOK_FAILURE' | 'PROVIDER_OUTAGE' | 'ORDER_RECONCILIATION_FAILURE';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    details?: Record<string, any>;
}
export declare class AlertService {
    raiseAlert(params: CreateAlertParams, tx?: DbTransaction): Promise<SystemAlert>;
    resolveAlert(id: string, adminUserId: string): Promise<SystemAlert | null>;
    getAlerts(filter: {
        page: number;
        limit: number;
        type?: string;
        isResolved?: boolean;
        severity?: string;
    }): Promise<{
        alerts: SystemAlert[];
        total: number;
    }>;
}
export declare const alertService: AlertService;
