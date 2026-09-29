"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import {
  Users,
  Package,
  FolderTree,
  Wallet,
  CreditCard,
  Server,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  ExternalLink,
} from "lucide-react";

interface DashboardMetrics {
  customers: { total: number; active: number; inactive: number };
  catalog: { totalCategories: number; activeCategories: number; totalProducts: number; activeProducts: number };
  wallets: { totalWallets: number; activeWallets: number; totalLiability: string };
  payments: { totalTransactions: number; completedCount: number; failedCount: number; pendingCount: number };
  providers: { total: number; healthy: number; unhealthy: number; disabled: number };
  orders: {
    totalOrders: number;
    statusBreakdown?: { completed: number; processing: number; refunded: number; failed: number };
  };
  financial?: {
    grossSales: string;
    refunds: string;
    netSales: string;
    completedSales: string;
    providerCost: string;
    grossProfit: string;
  };
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [timestamp, setTimestamp] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDashboard();
      if (res && res.metrics) {
        setMetrics(res.metrics);
        setTimestamp(res.timestamp);
      } else {
        throw new Error("Invalid response format from dashboard API");
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err?.message || "Failed to load dashboard metrics from Master Backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#00c2ff]" />
            <span>Master Dashboard</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative, real-time marketplace metrics derived directly from PostgreSQL
          </p>
        </div>

        <div className="flex items-center gap-3">
          {timestamp && (
            <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">
              Updated: {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00c2ff]" : ""}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Failed to synchronize dashboard</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-white font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Customers</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white font-mono">
              {loading ? "..." : metrics?.customers.total ?? 0}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
              <span className="text-emerald-400 font-semibold">{metrics?.customers.active ?? 0} active</span>
              <span>•</span>
              <span className="text-gray-500">{metrics?.customers.inactive ?? 0} inactive</span>
            </div>
          </div>
          <Link
            href="/admin/customers"
            className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#00c2ff] hover:underline"
          >
            <span>Manage Customers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Catalog Products */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Catalog Products</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white font-mono">
              {loading ? "..." : metrics?.catalog.totalProducts ?? 0}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
              <span className="text-purple-400 font-semibold">{metrics?.catalog.activeProducts ?? 0} active</span>
              <span>•</span>
              <span className="text-gray-500">{metrics?.catalog.totalCategories ?? 0} categories</span>
            </div>
          </div>
          <Link
            href="/admin/products"
            className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#00c2ff] hover:underline"
          >
            <span>View Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Central Wallet Liability */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Wallet Liability</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {loading ? "..." : `₹${Number(metrics?.wallets.totalLiability || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
              <span>{metrics?.wallets.totalWallets ?? 0} central customer wallets</span>
            </div>
          </div>
          <Link
            href="/admin/wallets"
            className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#00c2ff] hover:underline"
          >
            <span>Audit Wallets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Payment Ingestion */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Gateway Payments</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white font-mono">
              {loading ? "..." : metrics?.payments.totalTransactions ?? 0}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
              <span className="text-emerald-400">{metrics?.payments.completedCount ?? 0} completed</span>
              <span>•</span>
              <span className="text-amber-400">{metrics?.payments.pendingCount ?? 0} pending</span>
            </div>
          </div>
          <Link
            href="/admin/payments"
            className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#00c2ff] hover:underline"
          >
            <span>Review Payments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Operational Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider Architecture Health */}
        <div className="lg:col-span-2 bg-[#0b0e17] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-[#00c2ff]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Multi-Provider Infrastructure Health
              </h2>
            </div>
            <Link
              href="/admin/providers"
              className="text-xs text-[#00c2ff] hover:underline flex items-center gap-1"
            >
              <span>Manage Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
              <span className="text-[10px] text-gray-500 uppercase block">Total Configured</span>
              <span className="text-lg font-bold text-white">{metrics?.providers.total ?? 0}</span>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-400 uppercase block">Healthy</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-lg font-bold text-emerald-400">{metrics?.providers.healthy ?? 0}</span>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-red-400 uppercase block">Unhealthy</span>
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span className="text-lg font-bold text-red-400">{metrics?.providers.unhealthy ?? 0}</span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 uppercase block">Disabled</span>
                <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <span className="text-lg font-bold text-gray-400">{metrics?.providers.disabled ?? 0}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Providers are isolated adapters connecting to upstream VPS, game server, and cloud provisioning APIs.
            Circuit breakers automatically divert traffic on consecutive timeouts.
          </p>
        </div>

        {/* Live Orders & Financial Overview Card */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Order Financials
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                Live Data
              </span>
            </div>

            <div className="mt-4 space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Total Orders:</span>
                <span className="text-white font-bold">{metrics?.orders?.totalOrders ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Gross Sales:</span>
                <span className="text-white font-bold">
                  ₹{Number(metrics?.financial?.grossSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Net Sales:</span>
                <span className="text-emerald-400 font-bold">
                  ₹{Number(metrics?.financial?.netSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Gross Profit:</span>
                <span className="text-purple-400 font-bold">
                  ₹{Number(metrics?.financial?.grossProfit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
                <span>{metrics?.orders?.statusBreakdown?.completed ?? 0} completed</span>
                <span>•</span>
                <span className="text-red-400">{metrics?.orders?.statusBreakdown?.refunded ?? 0} refunded</span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/analytics"
            className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#00c2ff] hover:underline"
          >
            <span>Full Accounting & Provider Breakdown</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Quick Administrative Actions Hub */}
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>Quick Admin Navigation</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/admin/customers"
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-all flex flex-col items-center gap-2 group"
          >
            <Users className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-300 group-hover:text-white">Customers</span>
          </Link>

          <Link
            href="/admin/products"
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-all flex flex-col items-center gap-2 group"
          >
            <Package className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-300 group-hover:text-white">Products</span>
          </Link>

          <Link
            href="/admin/pricing"
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-all flex flex-col items-center gap-2 group"
          >
            <TrendingUp className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-300 group-hover:text-white">Pricing & Margins</span>
          </Link>

          <Link
            href="/admin/wallets"
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-all flex flex-col items-center gap-2 group"
          >
            <Wallet className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-300 group-hover:text-white">Wallets & Ledgers</span>
          </Link>

          <Link
            href="/admin/providers"
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-all flex flex-col items-center gap-2 group"
          >
            <Server className="w-5 h-5 text-[#00c2ff] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-300 group-hover:text-white">Providers</span>
          </Link>

          <Link
            href="/admin/audit-logs"
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-all flex flex-col items-center gap-2 group"
          >
            <ShieldCheck className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-300 group-hover:text-white">Audit Trail</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
