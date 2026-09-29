"use client";

import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  CreditCard,
  Server,
  ShoppingBag,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Package,
  FileSpreadsheet,
  PieChart,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("LAST_30_DAYS");
  const [activeTab, setActiveTab] = useState<"overview" | "providers" | "products" | "wallets">("overview");

  // Summary & Breakdown State
  const [summary, setSummary] = useState<any | null>(null);
  const [providersBreakdown, setProvidersBreakdown] = useState<any | null>(null);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [productsBreakdown, setProductsBreakdown] = useState<any[]>([]);
  const [variantsBreakdown, setVariantsBreakdown] = useState<any[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<any[]>([]);
  const [walletAnalytics, setWalletAnalytics] = useState<any | null>(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeOptions = [
    { label: "Today", value: "TODAY" },
    { label: "Yesterday", value: "YESTERDAY" },
    { label: "7 Days", value: "LAST_7_DAYS" },
    { label: "30 Days", value: "LAST_30_DAYS" },
    { label: "This Month", value: "THIS_MONTH" },
    { label: "Last Month", value: "LAST_MONTH" },
    { label: "This Year", value: "THIS_YEAR" },
    { label: "All Time", value: "ALL_TIME" },
  ];

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, provRes, dailyRes, prodRes, varRes, statusRes, walRes, payRes] = await Promise.all([
        adminApi.getAnalyticsSummary({ timeRange }),
        adminApi.getProviderWiseAnalytics({ timeRange }),
        adminApi.getDailySalesAnalytics({ timeRange }),
        adminApi.getProductAnalytics({ timeRange }),
        adminApi.getVariantAnalytics({ timeRange }),
        adminApi.getOrderStatusAnalytics({ timeRange }),
        adminApi.getWalletAnalytics(),
        adminApi.getPaymentAnalytics({ timeRange }),
      ]);

      if (sumRes && sumRes.summary) setSummary(sumRes.summary);
      if (provRes) setProvidersBreakdown(provRes);
      if (dailyRes && dailyRes.days) setDailySales(dailyRes.days);
      if (prodRes && prodRes.products) setProductsBreakdown(prodRes.products);
      if (varRes && varRes.variants) setVariantsBreakdown(varRes.variants);
      if (statusRes && statusRes.statuses) setOrderStatuses(statusRes.statuses);
      if (walRes && walRes.walletAnalytics) setWalletAnalytics(walRes.walletAnalytics);
      if (payRes && payRes.paymentAnalytics) setPaymentAnalytics(payRes.paymentAnalytics);
    } catch (err: any) {
      console.error("Analytics fetch error:", err);
      setError(err?.message || "Failed to compile authoritative analytics.");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const fin = summary?.financial || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#00c2ff]" />
            <span>Marketplace Financials & Provider Accounting</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative transactional reporting derived directly from historical PostgreSQL orders and ledger snapshots
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex flex-wrap items-center bg-black/40 border border-white/10 p-1 rounded-xl text-xs font-mono">
            {timeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  timeRange === opt.value
                    ? "bg-[#00c2ff]/20 text-[#00c2ff] font-bold shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00c2ff]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Analytics pipeline error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Date Window Indicator */}
      {summary?.dateWindow && (
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-1">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#00c2ff]" />
            <span>
              Window: {summary.dateWindow.startDate === "ALL_TIME" ? "All Historical Records" : new Date(summary.dateWindow.startDate).toLocaleDateString()} — {new Date(summary.dateWindow.endDate).toLocaleDateString()}
            </span>
          </span>
          <span>Timezone: System Business Time (IST / UTC)</span>
        </div>
      )}

      {/* Executive KPI Grid (6 Authoritative Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Gross Product Sales */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Gross Sales</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">
              ₹{Number(fin.grossSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">All placed order items</p>
          </div>
        </div>

        {/* Refunds Returned */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Refunds</span>
            <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400 font-mono">
              ₹{Number(fin.refunds || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Returned to customer wallets</p>
          </div>
        </div>

        {/* Net Sales */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Net Sales</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              ₹{Number(fin.netSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Gross minus refunds</p>
          </div>
        </div>

        {/* Provider Cost */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Provider Cost</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Server className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-amber-400 font-mono">
              ₹{Number(fin.providerCost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Completed items cost basis</p>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Gross Profit</span>
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-400 font-mono">
              ₹{Number(fin.grossProfit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Completed sales minus cost</p>
          </div>
        </div>

        {/* Wallet Liability (Separated from Sales) */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Wallet Liability</span>
            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-cyan-400 font-mono">
              ₹{Number(walletAnalytics?.totalLiability || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Cust. funds (not revenue)</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 text-xs font-mono">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "overview"
              ? "border-[#00c2ff] text-[#00c2ff]"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Overview & Daily Timeline</span>
        </button>
        <button
          onClick={() => setActiveTab("providers")}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "providers"
              ? "border-[#00c2ff] text-[#00c2ff]"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Provider-Wise Accounting</span>
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "products"
              ? "border-[#00c2ff] text-[#00c2ff]"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Products & Variants</span>
        </button>
        <button
          onClick={() => setActiveTab("wallets")}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "wallets"
              ? "border-[#00c2ff] text-[#00c2ff]"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Wallet Ledger & Gateways</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & DAILY TIMELINE */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Order Status Distribution */}
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#00c2ff]" />
              <span>Order Status Distribution</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
              {orderStatuses.map((st) => (
                <div key={st.status} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-gray-400 text-[10px] uppercase">
                    <span>{st.status}</span>
                    <span>{st.percentage}%</span>
                  </div>
                  <div className="text-base font-bold text-white">
                    {st.count} orders
                  </div>
                  <div className="text-[11px] text-gray-400">
                    ₹{Number(st.volume).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Sales Table */}
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Daily Sales Timeline</span>
              </h3>
              <span className="text-[11px] text-gray-400 font-mono">
                {dailySales.length} reporting days
              </span>
            </div>

            <div className="overflow-x-auto border border-white/10 rounded-xl bg-black/40">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black/70 border-b border-white/10 text-gray-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Orders</th>
                    <th className="py-2.5 px-3">Gross Sales</th>
                    <th className="py-2.5 px-3">Refunds</th>
                    <th className="py-2.5 px-3">Net Sales</th>
                    <th className="py-2.5 px-3">Provider Cost</th>
                    <th className="py-2.5 px-3">Gross Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dailySales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No orders recorded in this date range.
                      </td>
                    </tr>
                  ) : (
                    dailySales.map((d) => (
                      <tr key={d.date} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-[#00c2ff] font-bold">{d.date}</td>
                        <td className="py-2.5 px-3 text-white">{d.totalOrders}</td>
                        <td className="py-2.5 px-3 text-white">₹{d.grossSales}</td>
                        <td className="py-2.5 px-3 text-red-400">₹{d.refunds}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-semibold">₹{d.netSales}</td>
                        <td className="py-2.5 px-3 text-gray-300">₹{d.providerCost}</td>
                        <td className="py-2.5 px-3 text-purple-400 font-bold">₹{d.grossProfit}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROVIDER-WISE ACCOUNTING */}
      {activeTab === "providers" && (
        <div className="space-y-6">
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#00c2ff]" />
                  <span>Provider-Wise Sales, Cost & Margin Reconciliation</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Authoritative provider attribution from historical order item snapshots
                </p>
              </div>

              {providersBreakdown?.consolidation?.isReconciled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>100% Reconciled with Marketplace Totals</span>
                </span>
              )}
            </div>

            <div className="overflow-x-auto border border-white/10 rounded-xl bg-black/40">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black/70 border-b border-white/10 text-gray-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Provider</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Orders</th>
                    <th className="py-2.5 px-3">Units</th>
                    <th className="py-2.5 px-3">Gross Sales</th>
                    <th className="py-2.5 px-3">Refunds</th>
                    <th className="py-2.5 px-3">Net Sales</th>
                    <th className="py-2.5 px-3">Provider Cost</th>
                    <th className="py-2.5 px-3">Gross Profit</th>
                    <th className="py-2.5 px-3">Fulfillment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {providersBreakdown?.providers?.map((p: any) => (
                    <tr key={p.providerId} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white block">{p.providerName}</span>
                        <span className="text-[10px] text-gray-500">{p.providerCode}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            p.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : p.status === "MAINTENANCE"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white font-semibold">{p.totalOrders}</td>
                      <td className="py-2.5 px-3 text-gray-300">{p.unitsSold}</td>
                      <td className="py-2.5 px-3 text-white">₹{p.grossSales}</td>
                      <td className="py-2.5 px-3 text-red-400">₹{p.refunds}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-semibold">₹{p.netSales}</td>
                      <td className="py-2.5 px-3 text-gray-300">₹{p.providerCost}</td>
                      <td className="py-2.5 px-3 text-purple-400 font-bold">₹{p.grossProfit}</td>
                      <td className="py-2.5 px-3 text-[10px] text-gray-400">
                        {p.statusBreakdown.completed} comp / {p.statusBreakdown.processing} proc / {p.statusBreakdown.refunded} ref
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Reconciliation Summary Footer */}
                {providersBreakdown?.consolidation && (
                  <tfoot className="bg-black/90 border-t-2 border-white/20 text-white font-bold text-xs">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 uppercase text-[10px] text-gray-400">
                        Marketplace Consolidated Total
                      </td>
                      <td className="py-3 px-3 text-white font-mono">
                        ₹{providersBreakdown.consolidation.sumProviderGrossSales}
                      </td>
                      <td className="py-3 px-3 text-red-400 font-mono">
                        ₹{providersBreakdown.consolidation.sumProviderRefunds}
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-mono">
                        ₹{providersBreakdown.consolidation.sumProviderNetSales}
                      </td>
                      <td className="py-3 px-3 text-gray-300 font-mono">
                        ₹{providersBreakdown.consolidation.sumProviderCost}
                      </td>
                      <td className="py-3 px-3 text-purple-400 font-mono">
                        ₹{providersBreakdown.consolidation.sumProviderProfit}
                      </td>
                      <td className="py-3 px-3 text-emerald-400 text-[10px]">
                        Reconciled
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS & VARIANTS */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {/* Products Table */}
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              <span>Product-Level Performance (Historical Snapshots)</span>
            </h3>

            <div className="overflow-x-auto border border-white/10 rounded-xl bg-black/40">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black/70 border-b border-white/10 text-gray-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Assigned Provider</th>
                    <th className="py-2.5 px-3">Orders</th>
                    <th className="py-2.5 px-3">Units</th>
                    <th className="py-2.5 px-3">Gross Sales</th>
                    <th className="py-2.5 px-3">Refunds</th>
                    <th className="py-2.5 px-3">Net Sales</th>
                    <th className="py-2.5 px-3">Provider Cost</th>
                    <th className="py-2.5 px-3">Gross Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {productsBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        No product sales recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    productsBreakdown.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-white font-bold">{prod.productName}</td>
                        <td className="py-2.5 px-3 text-[#00c2ff]">{prod.providerName}</td>
                        <td className="py-2.5 px-3 text-white">{prod.ordersCount}</td>
                        <td className="py-2.5 px-3 text-gray-300">{prod.unitsSold}</td>
                        <td className="py-2.5 px-3 text-white">₹{prod.grossSales}</td>
                        <td className="py-2.5 px-3 text-red-400">₹{prod.refunds}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-semibold">₹{prod.netSales}</td>
                        <td className="py-2.5 px-3 text-gray-300">₹{prod.providerCost}</td>
                        <td className="py-2.5 px-3 text-purple-400 font-bold">₹{prod.grossProfit}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Variants Table */}
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Variant-Level Sales & Margin Contribution</span>
            </h3>

            <div className="overflow-x-auto border border-white/10 rounded-xl bg-black/40">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black/70 border-b border-white/10 text-gray-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Variant</th>
                    <th className="py-2.5 px-3">Orders</th>
                    <th className="py-2.5 px-3">Units</th>
                    <th className="py-2.5 px-3">Gross Sales</th>
                    <th className="py-2.5 px-3">Provider Cost</th>
                    <th className="py-2.5 px-3">Gross Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {variantsBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No variant orders recorded.
                      </td>
                    </tr>
                  ) : (
                    variantsBreakdown.map((v, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-white font-bold">{v.productName}</td>
                        <td className="py-2.5 px-3 text-amber-300">{v.variantName}</td>
                        <td className="py-2.5 px-3 text-white">{v.ordersCount}</td>
                        <td className="py-2.5 px-3 text-gray-300">{v.unitsSold}</td>
                        <td className="py-2.5 px-3 text-white">₹{v.grossSales}</td>
                        <td className="py-2.5 px-3 text-gray-300">₹{v.providerCost}</td>
                        <td className="py-2.5 px-3 text-purple-400 font-bold">₹{v.grossProfit}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WALLET LEDGER & PAYMENT GATEWAYS */}
      {activeTab === "wallets" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wallet Ledger Breakdown */}
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
              <Wallet className="w-4 h-4 text-cyan-400" />
              <span>Central Wallet Liability & Ledger Flows</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-400 uppercase block">Total Liability</span>
                <span className="text-lg font-bold text-cyan-400 mt-1 block">
                  ₹{Number(walletAnalytics?.totalLiability || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-500">Across {walletAnalytics?.totalWallets ?? 0} customer wallets</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-400 uppercase block">Active Wallets</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {walletAnalytics?.activeWallets ?? 0}
                </span>
                <span className="text-[10px] text-gray-500">{walletAnalytics?.lockedWallets ?? 0} locked/frozen</span>
              </div>
            </div>

            {walletAnalytics?.flowBreakdown && (
              <div className="space-y-2 pt-2 border-t border-white/5 font-mono text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/30">
                  <span className="text-gray-300">Customer Deposits Credited:</span>
                  <span className="text-emerald-400 font-bold">
                    ₹{walletAnalytics.flowBreakdown.deposits.volume} ({walletAnalytics.flowBreakdown.deposits.count} entries)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/30">
                  <span className="text-gray-300">Product Purchases Debited:</span>
                  <span className="text-red-400 font-bold">
                    ₹{walletAnalytics.flowBreakdown.orderDebits.volume} ({walletAnalytics.flowBreakdown.orderDebits.count} orders)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/30">
                  <span className="text-gray-300">Order Refunds Credited:</span>
                  <span className="text-amber-400 font-bold">
                    ₹{walletAnalytics.flowBreakdown.refundCredits.volume} ({walletAnalytics.flowBreakdown.refundCredits.count} refunds)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/30">
                  <span className="text-gray-300">Admin Adjustments:</span>
                  <span className="text-purple-400 font-bold">
                    ₹{walletAnalytics.flowBreakdown.adjustments.volume} ({walletAnalytics.flowBreakdown.adjustments.count} entries)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Gateway Ingestion */}
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Payment Gateway Transactions</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-400 uppercase block">Completed Volume</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block">
                  ₹{Number(paymentAnalytics?.completedVolume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-500">{paymentAnalytics?.statusBreakdown?.completed ?? 0} transactions</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-400 uppercase block">Total Transactions</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {paymentAnalytics?.totalTransactions ?? 0}
                </span>
                <span className="text-[10px] text-gray-500">Ingested attempts</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-black/30">
                <span className="text-gray-300">Pending Gateway Ingestions:</span>
                <span className="text-amber-400 font-bold">
                  {paymentAnalytics?.statusBreakdown?.pending ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-black/30">
                <span className="text-gray-300">Failed Ingestions:</span>
                <span className="text-red-400 font-bold">
                  {paymentAnalytics?.statusBreakdown?.failed ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-black/30">
                <span className="text-gray-300">Gateway Refunds Processed:</span>
                <span className="text-purple-400 font-bold">
                  ₹{paymentAnalytics?.totalRefundedVolume ?? "0.00"} ({paymentAnalytics?.refundCount ?? 0})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
