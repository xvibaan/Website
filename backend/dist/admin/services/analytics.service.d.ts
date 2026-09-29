export type TimeRangeOption = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL_TIME' | 'CUSTOM';
/**
 * Resolves date boundaries based on configured timeframe.
 */
export declare function resolveDateRange(timeRange?: TimeRangeOption, customStart?: string, customEnd?: string): {
    startDate: Date | null;
    endDate: Date;
};
export declare class AnalyticsAdminService {
    /**
     * Consolidated Executive Summary Analytics
     */
    getSummary(timeRange?: TimeRangeOption, customStart?: string, customEnd?: string, providerId?: string): Promise<{
        timeRange: TimeRangeOption;
        dateWindow: {
            startDate: string;
            endDate: string;
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
    }>;
    /**
     * Provider-wise accounting and performance breakdown.
     * Evaluates historical snapshots and verifies full reconciliation against consolidated totals.
     */
    getProviderWiseAnalytics(timeRange?: TimeRangeOption, customStart?: string, customEnd?: string): Promise<{
        timeRange: TimeRangeOption;
        dateWindow: {
            startDate: string;
            endDate: string;
        };
        providers: {
            providerId: string;
            providerName: string;
            providerCode: string;
            status: "ACTIVE" | "MAINTENANCE" | "DISABLED";
            totalOrders: number;
            unitsSold: number;
            grossSales: string;
            refunds: string;
            netSales: string;
            completedSales: string;
            processingSales: string;
            providerCost: string;
            grossProfit: string;
            statusBreakdown: {
                completed: number;
                processing: number;
                refunded: number;
                failed: number;
            };
        }[];
        consolidation: {
            sumProviderGrossSales: string;
            sumProviderRefunds: string;
            sumProviderNetSales: string;
            sumProviderCompletedSales: string;
            sumProviderCost: string;
            sumProviderProfit: string;
            currency: string;
            isReconciled: boolean;
        };
    }>;
    /**
     * Daily sales timeline report.
     */
    getDailySales(timeRange?: TimeRangeOption, customStart?: string, customEnd?: string, providerId?: string): Promise<{
        timeRange: TimeRangeOption;
        totalDays: number;
        days: {
            date: string;
            totalOrders: number;
            grossSales: string;
            refunds: string;
            netSales: string;
            completedSales: string;
            processingSales: string;
            providerCost: string;
            grossProfit: string;
        }[];
    }>;
    /**
     * Provider-wise daily sales matrix.
     */
    getProviderDailySales(timeRange?: TimeRangeOption, customStart?: string, customEnd?: string): Promise<{
        timeRange: TimeRangeOption;
        totalRecords: number;
        records: {
            date: string;
            providerId: string;
            providerName: string;
            providerCode: string;
            ordersCount: number;
            grossSales: string;
            refunds: string;
            netSales: string;
            providerCost: string;
            grossProfit: string;
        }[];
    }>;
    /**
     * Product analytics using historical snapshots.
     */
    getProductAnalytics(timeRange?: TimeRangeOption, customStart?: string, customEnd?: string, providerId?: string): Promise<{
        timeRange: TimeRangeOption;
        totalProducts: number;
        products: {
            productId: string | null;
            productName: string;
            providerId: string | null;
            providerName: string;
            ordersCount: number;
            unitsSold: number;
            grossSales: string;
            refunds: string;
            netSales: string;
            providerCost: string;
            grossProfit: string;
        }[];
    }>;
    /**
     * Variant-level analytics. Supports zero-variant products seamlessly.
     */
    getVariantAnalytics(timeRange?: TimeRangeOption, customStart?: string, customEnd?: string, productId?: string): Promise<{
        timeRange: TimeRangeOption;
        totalVariants: number;
        variants: {
            productName: string;
            variantName: string;
            ordersCount: number;
            unitsSold: number;
            grossSales: string;
            providerCost: string;
            grossProfit: string;
        }[];
    }>;
    /**
     * Order status distribution analytics.
     */
    getOrderStatusAnalytics(timeRange?: TimeRangeOption, customStart?: string, customEnd?: string): Promise<{
        timeRange: TimeRangeOption;
        totalOrders: number;
        statuses: {
            status: string;
            count: number;
            volume: string;
            percentage: string;
        }[];
    }>;
    /**
     * Central Wallet Liabilities and Mutations.
     */
    getWalletAnalytics(): Promise<{
        totalWallets: number;
        activeWallets: number;
        lockedWallets: number;
        totalLiability: string;
        flowBreakdown: {
            deposits: {
                count: number;
                volume: string;
            };
            orderDebits: {
                count: number;
                volume: string;
            };
            refundCredits: {
                count: number;
                volume: string;
            };
            adjustments: {
                count: number;
                volume: string;
            };
        };
        currency: string;
    }>;
    /**
     * Gateway Ingestion & Transactions.
     */
    getPaymentAnalytics(timeRange?: TimeRangeOption, customStart?: string, customEnd?: string): Promise<{
        timeRange: TimeRangeOption;
        totalTransactions: number;
        statusBreakdown: {
            completed: number;
            pending: number;
            failed: number;
        };
        completedVolume: string;
        pendingVolume: string;
        failedVolume: string;
        totalRefundedVolume: string;
        refundCount: number;
        currency: string;
    }>;
    /**
     * Operational Health status of all providers.
     */
    getProviderAnalytics(): Promise<{
        total: number;
        enabled: number;
        maintenance: number;
        disabled: number;
        healthy: number;
        unhealthy: number;
        degraded: number;
        unknown: number;
    }>;
}
export declare const analyticsAdminService: AnalyticsAdminService;
