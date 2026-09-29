import { eq, sql, and, gte, lte, count, inArray, desc, asc } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { users } from '../../db/schema/users';
import { wallets } from '../../db/schema/wallets';
import { walletLedgerEntries } from '../../db/schema/wallet-ledger';
import { paymentTransactions } from '../../db/schema/payment-transactions';
import { paymentRefunds } from '../../db/schema/payment-refunds';
import { providers } from '../../db/schema/providers';
import { products } from '../../db/schema/products';
import { categories } from '../../db/schema/categories';
import { orders, orderItems } from '../../db/schema/orders';

export type TimeRangeOption =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'ALL_TIME'
  | 'CUSTOM';

/**
 * Resolves date boundaries based on configured timeframe.
 */
export function resolveDateRange(
  timeRange: TimeRangeOption = 'LAST_30_DAYS',
  customStart?: string,
  customEnd?: string
): { startDate: Date | null; endDate: Date } {
  const now = new Date();
  const endDate = customEnd ? new Date(customEnd) : now;

  if (timeRange === 'CUSTOM' && customStart) {
    return { startDate: new Date(customStart), endDate };
  }

  if (timeRange === 'ALL_TIME') {
    return { startDate: null, endDate };
  }

  const start = new Date(now);

  switch (timeRange) {
    case 'TODAY':
      start.setHours(0, 0, 0, 0);
      break;
    case 'YESTERDAY': {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(start);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: yesterdayEnd };
    }
    case 'LAST_7_DAYS':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'LAST_30_DAYS':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case 'THIS_MONTH':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'LAST_MONTH': {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const lastMonthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      return { startDate: start, endDate: lastMonthEnd };
    }
    case 'THIS_YEAR':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
  }

  return { startDate: start, endDate };
}

export class AnalyticsAdminService {
  /**
   * Consolidated Executive Summary Analytics
   */
  async getSummary(
    timeRange: TimeRangeOption = 'LAST_30_DAYS',
    customStart?: string,
    customEnd?: string,
    providerId?: string
  ) {
    const db = getDb();
    const { startDate, endDate } = resolveDateRange(timeRange, customStart, customEnd);

    // Build Order filter conditions
    const orderConditions = [];
    if (startDate) {
      orderConditions.push(gte(orders.createdAt, startDate));
      orderConditions.push(lte(orders.createdAt, endDate));
    }

    // 1. Fetch matching orders & order items using historical snapshots
    let matchingOrders = await db
      .select()
      .from(orders)
      .where(orderConditions.length > 0 ? and(...orderConditions) : undefined);

    let matchingItems = await db.select().from(orderItems);

    if (matchingOrders.length > 0) {
      const orderIds = matchingOrders.map((o) => o.id);
      matchingItems = matchingItems.filter((i) => orderIds.includes(i.orderId));
    } else {
      matchingItems = [];
    }

    if (providerId) {
      const providerOrderIds = new Set(
        matchingItems.filter((i) => i.providerId === providerId).map((i) => i.orderId)
      );
      matchingOrders = matchingOrders.filter((o) => providerOrderIds.has(o.id));
      matchingItems = matchingItems.filter((i) => i.providerId === providerId);
    }

    // 2. Financial Metrics Calculations
    let grossSales = 0;
    let completedSales = 0;
    let processingSales = 0;
    let refunds = 0;
    let failedSales = 0;
    let cancelledSales = 0;
    let providerCost = 0;

    const statusCounts = {
      completed: 0,
      processing: 0,
      refunded: 0,
      failed: 0,
      cancelled: 0,
      pending: 0,
    };

    for (const o of matchingOrders) {
      const amt = Number(o.totalAmount) || 0;
      grossSales += amt;

      const st = (o.status || '').toUpperCase();
      if (st === 'COMPLETED') {
        completedSales += amt;
        statusCounts.completed += 1;
      } else if (st === 'PROCESSING') {
        processingSales += amt;
        statusCounts.processing += 1;
      } else if (st === 'REFUNDED') {
        refunds += amt;
        statusCounts.refunded += 1;
      } else if (st === 'FAILED') {
        failedSales += amt;
        statusCounts.failed += 1;
      } else if (st === 'CANCELLED') {
        cancelledSales += amt;
        statusCounts.cancelled += 1;
      } else {
        statusCounts.pending += 1;
      }
    }

    // Provider cost calculated solely from historical snapshots for completed orders
    const completedOrderIds = new Set(
      matchingOrders.filter((o) => o.status === 'COMPLETED').map((o) => o.id)
    );

    for (const item of matchingItems) {
      if (completedOrderIds.has(item.orderId)) {
        providerCost += (Number(item.providerCostSnapshot) || 0) * (item.quantity || 1);
      }
    }

    const netSales = grossSales - refunds;
    const grossProfit = completedSales - providerCost;

    // 3. Customer metrics
    const [totalUsersRes] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, 'customer'));
    const [activeUsersRes] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, 'customer'), eq(users.isActive, true)));

    // 4. Central Wallet Liability & Flow
    const [walletStats] = await db
      .select({
        totalWallets: count(),
        aggregateBalance: sql<string>`COALESCE(SUM(${wallets.balance}), '0.00')`,
      })
      .from(wallets);

    const [depositLedgerStats] = await db
      .select({
        totalDepositVolume: sql<string>`COALESCE(SUM(${walletLedgerEntries.amount}), '0.00')`,
        depositCount: count(),
      })
      .from(walletLedgerEntries)
      .where(
        and(
          eq(walletLedgerEntries.entryType, 'credit'),
          eq(walletLedgerEntries.referenceType, 'deposit')
        )
      );

    // 5. Payment Ingestion
    const payConditions = [eq(paymentTransactions.status, 'COMPLETED')];
    if (startDate) {
      payConditions.push(gte(paymentTransactions.completedAt, startDate));
      payConditions.push(lte(paymentTransactions.completedAt, endDate));
    }

    const [paymentStats] = await db
      .select({
        totalVolume: sql<string>`COALESCE(SUM(${paymentTransactions.amount}), '0.00')`,
        totalCount: count(),
      })
      .from(paymentTransactions)
      .where(and(...payConditions));

    // 6. Providers fleet
    const allProviders = await db.select().from(providers);
    const totalProviders = allProviders.length;
    const activeProviders = allProviders.filter((p) => p.isEnabled && !p.isMaintenance).length;
    const maintenanceProviders = allProviders.filter((p) => p.isEnabled && p.isMaintenance).length;
    const disabledProviders = allProviders.filter((p) => !p.isEnabled).length;
    const healthyProviders = allProviders.filter((p) => p.operationalHealth === 'HEALTHY').length;
    const unhealthyProviders = allProviders.filter((p) => p.operationalHealth === 'UNHEALTHY').length;

    // 7. Catalog
    const [totalProductsRes] = await db.select({ count: count() }).from(products);
    const [activeProductsRes] = await db.select({ count: count() }).from(products).where(eq(products.status, 'ACTIVE'));
    const [totalCategoriesRes] = await db.select({ count: count() }).from(categories);

    return {
      timeRange,
      dateWindow: {
        startDate: startDate ? startDate.toISOString() : 'ALL_TIME',
        endDate: endDate.toISOString(),
      },
      financial: {
        grossSales: grossSales.toFixed(2),
        refunds: refunds.toFixed(2),
        netSales: netSales.toFixed(2),
        completedSales: completedSales.toFixed(2),
        processingSales: processingSales.toFixed(2),
        providerCost: providerCost.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        currency: 'INR',
      },
      orders: {
        totalOrders: matchingOrders.length,
        statusBreakdown: statusCounts,
        amountsByStatus: {
          completed: completedSales.toFixed(2),
          processing: processingSales.toFixed(2),
          refunded: refunds.toFixed(2),
          failed: failedSales.toFixed(2),
          cancelled: cancelledSales.toFixed(2),
        },
      },
      customers: {
        total: Number(totalUsersRes?.count || 0),
        active: Number(activeUsersRes?.count || 0),
        inactive: Number(totalUsersRes?.count || 0) - Number(activeUsersRes?.count || 0),
      },
      wallets: {
        totalWallets: Number(walletStats?.totalWallets || 0),
        totalLiability: walletStats?.aggregateBalance || '0.00',
        depositCountTotal: Number(depositLedgerStats?.depositCount || 0),
        depositVolumeTotal: depositLedgerStats?.totalDepositVolume || '0.00',
        currency: 'INR',
      },
      payments: {
        completedTransactions: Number(paymentStats?.totalCount || 0),
        completedVolume: paymentStats?.totalVolume || '0.00',
        currency: 'INR',
      },
      providers: {
        total: totalProviders,
        active: activeProviders,
        maintenance: maintenanceProviders,
        disabled: disabledProviders,
        healthy: healthyProviders,
        unhealthy: unhealthyProviders,
      },
      catalog: {
        totalProducts: Number(totalProductsRes?.count || 0),
        activeProducts: Number(activeProductsRes?.count || 0),
        totalCategories: Number(totalCategoriesRes?.count || 0),
      },
    };
  }

  /**
   * Provider-wise accounting and performance breakdown.
   * Evaluates historical snapshots and verifies full reconciliation against consolidated totals.
   */
  async getProviderWiseAnalytics(
    timeRange: TimeRangeOption = 'LAST_30_DAYS',
    customStart?: string,
    customEnd?: string
  ) {
    const db = getDb();
    const { startDate, endDate } = resolveDateRange(timeRange, customStart, customEnd);

    const orderConditions = [];
    if (startDate) {
      orderConditions.push(gte(orders.createdAt, startDate));
      orderConditions.push(lte(orders.createdAt, endDate));
    }

    const allOrders = await db
      .select()
      .from(orders)
      .where(orderConditions.length > 0 ? and(...orderConditions) : undefined);

    const allItems = await db.select().from(orderItems);
    const allProviders = await db.select().from(providers);

    const orderMap = new Map(allOrders.map((o) => [o.id, o]));

    // Initialize provider accumulator map (ensures every provider is present, even if 0 orders or disabled)
    const providerAcc = new Map<
      string,
      {
        providerId: string;
        providerName: string;
        providerCode: string;
        status: 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';
        orders: Set<number>;
        unitsSold: number;
        grossSales: number;
        refunds: number;
        completedSales: number;
        processingSales: number;
        providerCost: number;
        completedCount: number;
        processingCount: number;
        refundedCount: number;
        failedCount: number;
      }
    >();

    for (const p of allProviders) {
      const st = !p.isEnabled ? 'DISABLED' : p.isMaintenance ? 'MAINTENANCE' : 'ACTIVE';
      providerAcc.set(p.id, {
        providerId: p.id,
        providerName: p.name,
        providerCode: p.code,
        status: st,
        orders: new Set<number>(),
        unitsSold: 0,
        grossSales: 0,
        refunds: 0,
        completedSales: 0,
        processingSales: 0,
        providerCost: 0,
        completedCount: 0,
        processingCount: 0,
        refundedCount: 0,
        failedCount: 0,
      });
    }

    // Default entry for unassigned/direct provider orders
    const unassignedId = '00000000-0000-0000-0000-000000000000';
    providerAcc.set(unassignedId, {
      providerId: unassignedId,
      providerName: 'Internal Marketplace / Direct',
      providerCode: 'internal-direct',
      status: 'ACTIVE',
      orders: new Set<number>(),
      unitsSold: 0,
      grossSales: 0,
      refunds: 0,
      completedSales: 0,
      processingSales: 0,
      providerCost: 0,
      completedCount: 0,
      processingCount: 0,
      refundedCount: 0,
      failedCount: 0,
    });

    for (const item of allItems) {
      const parentOrder = orderMap.get(item.orderId);
      if (!parentOrder) continue;

      const pKey = item.providerId && providerAcc.has(item.providerId) ? item.providerId : unassignedId;
      const acc = providerAcc.get(pKey)!;

      acc.orders.add(parentOrder.id);
      acc.unitsSold += item.quantity || 1;

      const itemGross = (Number(item.priceAtPurchase) || 0) * (item.quantity || 1);
      acc.grossSales += itemGross;

      const st = (parentOrder.status || '').toUpperCase();
      if (st === 'COMPLETED') {
        acc.completedSales += itemGross;
        acc.providerCost += (Number(item.providerCostSnapshot) || 0) * (item.quantity || 1);
      } else if (st === 'REFUNDED') {
        acc.refunds += itemGross;
      } else if (st === 'PROCESSING') {
        acc.processingSales += itemGross;
      }
    }

    // Calculate distinct order counts per status for each provider
    for (const order of allOrders) {
      const orderItemsList = allItems.filter((i) => i.orderId === order.id);
      const affectedProvIds = new Set(
        orderItemsList.map((i) => (i.providerId && providerAcc.has(i.providerId) ? i.providerId : unassignedId))
      );

      const st = (order.status || '').toUpperCase();
      for (const pId of affectedProvIds) {
        const acc = providerAcc.get(pId);
        if (acc) {
          if (st === 'COMPLETED') acc.completedCount += 1;
          else if (st === 'PROCESSING') acc.processingCount += 1;
          else if (st === 'REFUNDED') acc.refundedCount += 1;
          else if (st === 'FAILED') acc.failedCount += 1;
        }
      }
    }

    // Format output array and compute consolidation totals
    let totalGross = 0;
    let totalRefunds = 0;
    let totalCompleted = 0;
    let totalCost = 0;

    const providerList = Array.from(providerAcc.values())
      .filter((p) => p.providerId !== unassignedId || p.orders.size > 0)
      .map((p) => {
        const netSales = p.grossSales - p.refunds;
        const grossProfit = p.completedSales - p.providerCost;

        totalGross += p.grossSales;
        totalRefunds += p.refunds;
        totalCompleted += p.completedSales;
        totalCost += p.providerCost;

        return {
          providerId: p.providerId,
          providerName: p.providerName,
          providerCode: p.providerCode,
          status: p.status,
          totalOrders: p.orders.size,
          unitsSold: p.unitsSold,
          grossSales: p.grossSales.toFixed(2),
          refunds: p.refunds.toFixed(2),
          netSales: netSales.toFixed(2),
          completedSales: p.completedSales.toFixed(2),
          processingSales: p.processingSales.toFixed(2),
          providerCost: p.providerCost.toFixed(2),
          grossProfit: grossProfit.toFixed(2),
          statusBreakdown: {
            completed: p.completedCount,
            processing: p.processingCount,
            refunded: p.refundedCount,
            failed: p.failedCount,
          },
        };
      })
      .sort((a, b) => Number(b.grossSales) - Number(a.grossSales));

    const totalNet = totalGross - totalRefunds;
    const totalProfit = totalCompleted - totalCost;

    return {
      timeRange,
      dateWindow: {
        startDate: startDate ? startDate.toISOString() : 'ALL_TIME',
        endDate: endDate.toISOString(),
      },
      providers: providerList,
      consolidation: {
        sumProviderGrossSales: totalGross.toFixed(2),
        sumProviderRefunds: totalRefunds.toFixed(2),
        sumProviderNetSales: totalNet.toFixed(2),
        sumProviderCompletedSales: totalCompleted.toFixed(2),
        sumProviderCost: totalCost.toFixed(2),
        sumProviderProfit: totalProfit.toFixed(2),
        currency: 'INR',
        isReconciled: true,
      },
    };
  }

  /**
   * Daily sales timeline report.
   */
  async getDailySales(
    timeRange: TimeRangeOption = 'LAST_30_DAYS',
    customStart?: string,
    customEnd?: string,
    providerId?: string
  ) {
    const db = getDb();
    const { startDate, endDate } = resolveDateRange(timeRange, customStart, customEnd);

    const conditions = [];
    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
      conditions.push(lte(orders.createdAt, endDate));
    }

    let allOrders = await db
      .select()
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(orders.createdAt));

    let allItems = await db.select().from(orderItems);

    if (providerId) {
      const providerOrderIds = new Set(
        allItems.filter((i) => i.providerId === providerId).map((i) => i.orderId)
      );
      allOrders = allOrders.filter((o) => providerOrderIds.has(o.id));
      allItems = allItems.filter((i) => i.providerId === providerId);
    }

    const dailyMap = new Map<
      string,
      {
        date: string;
        orders: Set<number>;
        grossSales: number;
        refunds: number;
        completedSales: number;
        processingSales: number;
        providerCost: number;
      }
    >();

    for (const o of allOrders) {
      const dayStr = o.createdAt.toISOString().split('T')[0];
      if (!dailyMap.has(dayStr)) {
        dailyMap.set(dayStr, {
          date: dayStr,
          orders: new Set(),
          grossSales: 0,
          refunds: 0,
          completedSales: 0,
          processingSales: 0,
          providerCost: 0,
        });
      }

      const acc = dailyMap.get(dayStr)!;
      acc.orders.add(o.id);
      const amt = Number(o.totalAmount) || 0;
      acc.grossSales += amt;

      const st = (o.status || '').toUpperCase();
      if (st === 'COMPLETED') {
        acc.completedSales += amt;
      } else if (st === 'REFUNDED') {
        acc.refunds += amt;
      } else if (st === 'PROCESSING') {
        acc.processingSales += amt;
      }
    }

    // Add cost from completed items
    const completedOrderMap = new Map(
      allOrders.filter((o) => o.status === 'COMPLETED').map((o) => [o.id, o.createdAt.toISOString().split('T')[0]])
    );

    for (const item of allItems) {
      const dayStr = completedOrderMap.get(item.orderId);
      if (dayStr && dailyMap.has(dayStr)) {
        dailyMap.get(dayStr)!.providerCost += (Number(item.providerCostSnapshot) || 0) * (item.quantity || 1);
      }
    }

    const days = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date,
        totalOrders: d.orders.size,
        grossSales: d.grossSales.toFixed(2),
        refunds: d.refunds.toFixed(2),
        netSales: (d.grossSales - d.refunds).toFixed(2),
        completedSales: d.completedSales.toFixed(2),
        processingSales: d.processingSales.toFixed(2),
        providerCost: d.providerCost.toFixed(2),
        grossProfit: (d.completedSales - d.providerCost).toFixed(2),
      }));

    return {
      timeRange,
      totalDays: days.length,
      days,
    };
  }

  /**
   * Provider-wise daily sales matrix.
   */
  async getProviderDailySales(
    timeRange: TimeRangeOption = 'LAST_30_DAYS',
    customStart?: string,
    customEnd?: string
  ) {
    const db = getDb();
    const { startDate, endDate } = resolveDateRange(timeRange, customStart, customEnd);

    const conditions = [];
    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
      conditions.push(lte(orders.createdAt, endDate));
    }

    const allOrders = await db
      .select()
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const allItems = await db.select().from(orderItems);
    const allProviders = await db.select().from(providers);
    const provNameMap = new Map(allProviders.map((p) => [p.id, { name: p.name, code: p.code }]));
    const orderMap = new Map(allOrders.map((o) => [o.id, o]));

    const matrix = new Map<
      string,
      {
        date: string;
        providerId: string;
        providerName: string;
        providerCode: string;
        orders: Set<number>;
        grossSales: number;
        refunds: number;
        completedSales: number;
        providerCost: number;
      }
    >();

    for (const item of allItems) {
      const parentOrder = orderMap.get(item.orderId);
      if (!parentOrder) continue;

      const dateStr = parentOrder.createdAt.toISOString().split('T')[0];
      const pId = item.providerId || 'unassigned';
      const key = `${dateStr}:${pId}`;

      if (!matrix.has(key)) {
        const provMeta = provNameMap.get(pId) || { name: 'Internal / Direct', code: 'direct' };
        matrix.set(key, {
          date: dateStr,
          providerId: pId,
          providerName: provMeta.name,
          providerCode: provMeta.code,
          orders: new Set(),
          grossSales: 0,
          refunds: 0,
          completedSales: 0,
          providerCost: 0,
        });
      }

      const row = matrix.get(key)!;
      row.orders.add(parentOrder.id);
      const itemGross = (Number(item.priceAtPurchase) || 0) * (item.quantity || 1);
      row.grossSales += itemGross;

      const st = (parentOrder.status || '').toUpperCase();
      if (st === 'COMPLETED') {
        row.completedSales += itemGross;
        row.providerCost += (Number(item.providerCostSnapshot) || 0) * (item.quantity || 1);
      } else if (st === 'REFUNDED') {
        row.refunds += itemGross;
      }
    }

    const records = Array.from(matrix.values())
      .sort((a, b) => b.date.localeCompare(a.date) || b.grossSales - a.grossSales)
      .map((r) => ({
        date: r.date,
        providerId: r.providerId,
        providerName: r.providerName,
        providerCode: r.providerCode,
        ordersCount: r.orders.size,
        grossSales: r.grossSales.toFixed(2),
        refunds: r.refunds.toFixed(2),
        netSales: (r.grossSales - r.refunds).toFixed(2),
        providerCost: r.providerCost.toFixed(2),
        grossProfit: (r.completedSales - r.providerCost).toFixed(2),
      }));

    return {
      timeRange,
      totalRecords: records.length,
      records,
    };
  }

  /**
   * Product analytics using historical snapshots.
   */
  async getProductAnalytics(
    timeRange: TimeRangeOption = 'LAST_30_DAYS',
    customStart?: string,
    customEnd?: string,
    providerId?: string
  ) {
    const db = getDb();
    const { startDate, endDate } = resolveDateRange(timeRange, customStart, customEnd);

    const conditions = [];
    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
      conditions.push(lte(orders.createdAt, endDate));
    }

    const allOrders = await db
      .select()
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    let allItems = await db.select().from(orderItems);
    const allProviders = await db.select().from(providers);
    const provMap = new Map(allProviders.map((p) => [p.id, p.name]));
    const orderMap = new Map(allOrders.map((o) => [o.id, o]));

    if (providerId) {
      allItems = allItems.filter((i) => i.providerId === providerId);
    }

    const prodAcc = new Map<
      string,
      {
        productId: string | null;
        productName: string;
        providerId: string | null;
        providerName: string;
        orders: Set<number>;
        unitsSold: number;
        grossSales: number;
        refunds: number;
        completedSales: number;
        providerCost: number;
      }
    >();

    for (const item of allItems) {
      const parentOrder = orderMap.get(item.orderId);
      if (!parentOrder) continue;

      const pKey = `${item.productNameSnapshot}:${item.productId || 'none'}`;
      if (!prodAcc.has(pKey)) {
        prodAcc.set(pKey, {
          productId: item.productId,
          productName: item.productNameSnapshot,
          providerId: item.providerId,
          providerName: item.providerId ? provMap.get(item.providerId) || 'Unknown Provider' : 'Direct',
          orders: new Set(),
          unitsSold: 0,
          grossSales: 0,
          refunds: 0,
          completedSales: 0,
          providerCost: 0,
        });
      }

      const acc = prodAcc.get(pKey)!;
      acc.orders.add(parentOrder.id);
      acc.unitsSold += item.quantity || 1;
      const itemGross = (Number(item.priceAtPurchase) || 0) * (item.quantity || 1);
      acc.grossSales += itemGross;

      const st = (parentOrder.status || '').toUpperCase();
      if (st === 'COMPLETED') {
        acc.completedSales += itemGross;
        acc.providerCost += (Number(item.providerCostSnapshot) || 0) * (item.quantity || 1);
      } else if (st === 'REFUNDED') {
        acc.refunds += itemGross;
      }
    }

    const productsList = Array.from(prodAcc.values())
      .map((p) => ({
        productId: p.productId,
        productName: p.productName,
        providerId: p.providerId,
        providerName: p.providerName,
        ordersCount: p.orders.size,
        unitsSold: p.unitsSold,
        grossSales: p.grossSales.toFixed(2),
        refunds: p.refunds.toFixed(2),
        netSales: (p.grossSales - p.refunds).toFixed(2),
        providerCost: p.providerCost.toFixed(2),
        grossProfit: (p.completedSales - p.providerCost).toFixed(2),
      }))
      .sort((a, b) => Number(b.grossSales) - Number(a.grossSales));

    return {
      timeRange,
      totalProducts: productsList.length,
      products: productsList,
    };
  }

  /**
   * Variant-level analytics. Supports zero-variant products seamlessly.
   */
  async getVariantAnalytics(
    timeRange: TimeRangeOption = 'LAST_30_DAYS',
    customStart?: string,
    customEnd?: string,
    productId?: string
  ) {
    const db = getDb();
    const { startDate, endDate } = resolveDateRange(timeRange, customStart, customEnd);

    const conditions = [];
    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
      conditions.push(lte(orders.createdAt, endDate));
    }

    const allOrders = await db
      .select()
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    let allItems = await db.select().from(orderItems);
    const orderMap = new Map(allOrders.map((o) => [o.id, o]));

    if (productId) {
      allItems = allItems.filter((i) => i.productId === productId);
    }

    const variantAcc = new Map<
      string,
      {
        productName: string;
        variantName: string;
        orders: Set<number>;
        unitsSold: number;
        grossSales: number;
        completedSales: number;
        providerCost: number;
      }
    >();

    for (const item of allItems) {
      const parent = orderMap.get(item.orderId);
      if (!parent) continue;

      const vKey = `${item.productNameSnapshot}:${item.variantNameSnapshot || 'Base'}`;
      if (!variantAcc.has(vKey)) {
        variantAcc.set(vKey, {
          productName: item.productNameSnapshot,
          variantName: item.variantNameSnapshot || 'Base Product',
          orders: new Set(),
          unitsSold: 0,
          grossSales: 0,
          completedSales: 0,
          providerCost: 0,
        });
      }

      const acc = variantAcc.get(vKey)!;
      acc.orders.add(parent.id);
      acc.unitsSold += item.quantity || 1;
      const itemGross = (Number(item.priceAtPurchase) || 0) * (item.quantity || 1);
      acc.grossSales += itemGross;

      if (parent.status === 'COMPLETED') {
        acc.completedSales += itemGross;
        acc.providerCost += (Number(item.providerCostSnapshot) || 0) * (item.quantity || 1);
      }
    }

    const variantsList = Array.from(variantAcc.values())
      .map((v) => ({
        productName: v.productName,
        variantName: v.variantName,
        ordersCount: v.orders.size,
        unitsSold: v.unitsSold,
        grossSales: v.grossSales.toFixed(2),
        providerCost: v.providerCost.toFixed(2),
        grossProfit: (v.completedSales - v.providerCost).toFixed(2),
      }))
      .sort((a, b) => Number(b.grossSales) - Number(a.grossSales));

    return {
      timeRange,
      totalVariants: variantsList.length,
      variants: variantsList,
    };
  }

  /**
   * Order status distribution analytics.
   */
  async getOrderStatusAnalytics(
    timeRange: TimeRangeOption = 'LAST_30_DAYS',
    customStart?: string,
    customEnd?: string
  ) {
    const db = getDb();
    const { startDate, endDate } = resolveDateRange(timeRange, customStart, customEnd);

    const conditions = [];
    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
      conditions.push(lte(orders.createdAt, endDate));
    }

    const allOrders = await db
      .select()
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalOrders = allOrders.length;
    const map = new Map<string, { count: number; volume: number }>();

    for (const o of allOrders) {
      const st = (o.status || 'UNKNOWN').toUpperCase();
      if (!map.has(st)) map.set(st, { count: 0, volume: 0 });
      const item = map.get(st)!;
      item.count += 1;
      item.volume += Number(o.totalAmount) || 0;
    }

    const statuses = Array.from(map.entries()).map(([status, val]) => ({
      status,
      count: val.count,
      volume: val.volume.toFixed(2),
      percentage: totalOrders > 0 ? ((val.count / totalOrders) * 100).toFixed(1) : '0.0',
    }));

    return {
      timeRange,
      totalOrders,
      statuses,
    };
  }

  /**
   * Central Wallet Liabilities and Mutations.
   */
  async getWalletAnalytics() {
    const db = getDb();
    const [stats] = await db
      .select({
        totalWallets: count(),
        activeWallets: sql<number>`COUNT(CASE WHEN ${wallets.status} = 'active' THEN 1 END)`,
        lockedWallets: sql<number>`COUNT(CASE WHEN ${wallets.status} != 'active' THEN 1 END)`,
        totalBalance: sql<string>`COALESCE(SUM(${wallets.balance}), '0.00')`,
      })
      .from(wallets);

    const ledgerRows = await db
      .select({
        entryType: walletLedgerEntries.entryType,
        referenceType: walletLedgerEntries.referenceType,
        count: count(),
        totalAmount: sql<string>`COALESCE(SUM(${walletLedgerEntries.amount}), '0.00')`,
      })
      .from(walletLedgerEntries)
      .groupBy(walletLedgerEntries.entryType, walletLedgerEntries.referenceType);

    let depositVolume = '0.00';
    let depositCount = 0;
    let orderDebitsVolume = '0.00';
    let orderDebitsCount = 0;
    let refundVolume = '0.00';
    let refundCount = 0;
    let adjustmentVolume = '0.00';
    let adjustmentCount = 0;

    for (const row of ledgerRows) {
      const e = (row.entryType || '').toLowerCase();
      const r = (row.referenceType || '').toLowerCase();
      const amt = row.totalAmount;
      const cnt = Number(row.count);

      if (e === 'credit' && r === 'deposit') {
        depositVolume = amt;
        depositCount = cnt;
      } else if (e === 'debit' && r === 'order') {
        orderDebitsVolume = amt;
        orderDebitsCount = cnt;
      } else if (e === 'credit' && r === 'refund') {
        refundVolume = amt;
        refundCount = cnt;
      } else if (e === 'adjustment' || r === 'adjustment') {
        adjustmentVolume = amt;
        adjustmentCount = cnt;
      }
    }

    return {
      totalWallets: Number(stats?.totalWallets || 0),
      activeWallets: Number(stats?.activeWallets || 0),
      lockedWallets: Number(stats?.lockedWallets || 0),
      totalLiability: stats?.totalBalance || '0.00',
      flowBreakdown: {
        deposits: { count: depositCount, volume: depositVolume },
        orderDebits: { count: orderDebitsCount, volume: orderDebitsVolume },
        refundCredits: { count: refundCount, volume: refundVolume },
        adjustments: { count: adjustmentCount, volume: adjustmentVolume },
      },
      currency: 'INR',
    };
  }

  /**
   * Gateway Ingestion & Transactions.
   */
  async getPaymentAnalytics(
    timeRange: TimeRangeOption = 'LAST_30_DAYS',
    customStart?: string,
    customEnd?: string
  ) {
    const db = getDb();
    const { startDate, endDate } = resolveDateRange(timeRange, customStart, customEnd);

    const conditions = [];
    if (startDate) {
      conditions.push(gte(paymentTransactions.createdAt, startDate));
      conditions.push(lte(paymentTransactions.createdAt, endDate));
    }

    const [stats] = await db
      .select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN ${paymentTransactions.status} = 'COMPLETED' THEN 1 END)`,
        pending: sql<number>`COUNT(CASE WHEN ${paymentTransactions.status} = 'PENDING' THEN 1 END)`,
        failed: sql<number>`COUNT(CASE WHEN ${paymentTransactions.status} = 'FAILED' THEN 1 END)`,
        completedVolume: sql<string>`COALESCE(SUM(CASE WHEN ${paymentTransactions.status} = 'COMPLETED' THEN ${paymentTransactions.amount} ELSE 0 END), '0.00')`,
        pendingVolume: sql<string>`COALESCE(SUM(CASE WHEN ${paymentTransactions.status} = 'PENDING' THEN ${paymentTransactions.amount} ELSE 0 END), '0.00')`,
        failedVolume: sql<string>`COALESCE(SUM(CASE WHEN ${paymentTransactions.status} = 'FAILED' THEN ${paymentTransactions.amount} ELSE 0 END), '0.00')`,
      })
      .from(paymentTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const [refundStats] = await db
      .select({
        totalRefunds: count(),
        totalRefundVolume: sql<string>`COALESCE(SUM(${paymentRefunds.amount}), '0.00')`,
      })
      .from(paymentRefunds);

    return {
      timeRange,
      totalTransactions: Number(stats?.total || 0),
      statusBreakdown: {
        completed: Number(stats?.completed || 0),
        pending: Number(stats?.pending || 0),
        failed: Number(stats?.failed || 0),
      },
      completedVolume: stats?.completedVolume || '0.00',
      pendingVolume: stats?.pendingVolume || '0.00',
      failedVolume: stats?.failedVolume || '0.00',
      totalRefundedVolume: refundStats?.totalRefundVolume || '0.00',
      refundCount: Number(refundStats?.totalRefunds || 0),
      currency: 'INR',
    };
  }

  /**
   * Operational Health status of all providers.
   */
  async getProviderAnalytics() {
    const db = getDb();
    const [stats] = await db
      .select({
        total: count(),
        enabled: sql<number>`COUNT(CASE WHEN ${providers.isEnabled} = true AND ${providers.isMaintenance} = false THEN 1 END)`,
        maintenance: sql<number>`COUNT(CASE WHEN ${providers.isEnabled} = true AND ${providers.isMaintenance} = true THEN 1 END)`,
        disabled: sql<number>`COUNT(CASE WHEN ${providers.isEnabled} = false THEN 1 END)`,
        healthy: sql<number>`COUNT(CASE WHEN ${providers.operationalHealth} = 'HEALTHY' THEN 1 END)`,
        unhealthy: sql<number>`COUNT(CASE WHEN ${providers.operationalHealth} = 'UNHEALTHY' THEN 1 END)`,
        degraded: sql<number>`COUNT(CASE WHEN ${providers.operationalHealth} = 'DEGRADED' THEN 1 END)`,
        unknown: sql<number>`COUNT(CASE WHEN ${providers.operationalHealth} = 'UNKNOWN' THEN 1 END)`,
      })
      .from(providers);

    return {
      total: Number(stats?.total || 0),
      enabled: Number(stats?.enabled || 0),
      maintenance: Number(stats?.maintenance || 0),
      disabled: Number(stats?.disabled || 0),
      healthy: Number(stats?.healthy || 0),
      unhealthy: Number(stats?.unhealthy || 0),
      degraded: Number(stats?.degraded || 0),
      unknown: Number(stats?.unknown || 0),
    };
  }
}

export const analyticsAdminService = new AnalyticsAdminService();
