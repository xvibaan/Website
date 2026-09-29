export declare class DashboardAdminService {
    getDashboardOverview(): Promise<{
        success: boolean;
        timestamp: Date;
        metrics: {
            customers: {
                total: number;
                active: number;
                inactive: number;
            };
            wallets: {
                totalWallets: number;
                totalLiability: string;
                depositCountTotal: number;
                depositVolumeTotal: string;
                currency: string;
            };
            payments: {
                completedTransactions: number;
                completedVolume: string;
                currency: string;
            };
            providers: {
                total: number;
                active: number;
                maintenance: number;
                disabled: number;
                healthy: number;
                unhealthy: number;
            };
            catalog: {
                totalProducts: number;
                activeProducts: number;
                totalCategories: number;
            };
            orders: {
                totalOrders: number;
                statusBreakdown: {
                    completed: number;
                    processing: number;
                    refunded: number;
                    failed: number;
                    cancelled: number;
                    pending: number;
                };
                amountsByStatus: {
                    completed: string;
                    processing: string;
                    refunded: string;
                    failed: string;
                    cancelled: string;
                };
            };
            financial: {
                grossSales: string;
                refunds: string;
                netSales: string;
                completedSales: string;
                processingSales: string;
                providerCost: string;
                grossProfit: string;
                currency: string;
            };
        };
        recentActivity: {
            id: string;
            createdAt: Date;
            adminUserId: string;
            action: string;
            entityType: string;
            entityId: string | null;
            details: string | null;
            ipAddress: string | null;
            userAgent: string | null;
        }[];
    }>;
}
export declare const dashboardAdminService: DashboardAdminService;
