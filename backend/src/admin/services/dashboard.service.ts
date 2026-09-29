import { analyticsAdminService } from './analytics.service';
import { auditService } from './audit.service';

export class DashboardAdminService {
  async getDashboardOverview() {
    const summary = await analyticsAdminService.getSummary('LAST_30_DAYS');
    const recentAudit = await auditService.getLogs({ page: 1, limit: 5 });

    return {
      success: true,
      timestamp: new Date(),
      metrics: {
        customers: summary.customers,
        wallets: summary.wallets,
        payments: summary.payments,
        providers: summary.providers,
        catalog: summary.catalog,
        orders: summary.orders,
        financial: summary.financial,
      },
      recentActivity: recentAudit.logs,
    };
  }
}

export const dashboardAdminService = new DashboardAdminService();
