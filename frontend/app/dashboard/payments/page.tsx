"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  RefreshCw,
  Receipt,
  AlertCircle,
  Eye,
  ShieldCheck,
  X,
  Plus,
  ExternalLink,
  ShoppingBag,
  SlidersHorizontal,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";

export interface PaymentTransaction {
  id: number;
  reference: string;
  user_id: number;
  type: "DEPOSIT" | "PURCHASE" | "REFUND" | "ADJUSTMENT";
  amount: number;
  balance_after: number;
  status: "COMPLETED" | "PENDING" | "FAILED" | "REFUNDED" | "CANCELLED" | "PROCESSING";
  channel: string;
  description: string;
  order_id?: number | null;
  created_at: string;
}

export default function PaymentHistoryPage() {
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [ordersMap, setOrdersMap] = useState<Record<number, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, COMPLETED (Successful), PENDING, FAILED, REFUNDED
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, DEPOSIT, PURCHASE, REFUND, ADJUSTMENT
  const [dateRange, setDateRange] = useState("ALL"); // ALL, TODAY, 7_DAYS, 30_DAYS, CUSTOM
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("DATE_DESC");

  // Interaction states
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<any | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState<number | null>(null);

  // Authoritative balance from user context
  const authoritativeBalance = Number((user as any)?.wallet?.balance ?? (user as any)?.wallet_balance ?? 0);

  // Fetch payments and orders from authoritative backend
  const fetchPaymentData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      // 1. Fetch authenticated transactions
      const txnsData = await api.get<PaymentTransaction[]>("/v1/wallet/transactions");
      const safeTxns = Array.isArray(txnsData) ? txnsData : [];
      setTransactions(safeTxns);

      // 2. Fetch authenticated orders for cross-referencing
      try {
        const ordersData = await api.get<any[]>("/v1/orders/");
        if (Array.isArray(ordersData)) {
          const map: Record<number, any> = {};
          ordersData.forEach((ord) => {
            if (ord.id) map[ord.id] = ord;
          });
          setOrdersMap(map);
        }
      } catch (ordErr) {
        console.warn("Could not preload orders mapping:", ordErr);
      }

      // 3. Refresh authoritative balance
      if (refreshUser) {
        await refreshUser().catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || "Failed to load payment history");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Helper to extract order ID from transaction
  const extractOrderId = (txn: PaymentTransaction): number | null => {
    if (txn.order_id) return txn.order_id;
    // Try parsing from description (e.g. "#HM-10025" or "Order #HM-10025")
    const match = (txn.description || "").match(/#HM-(\d+)/i) || (txn.description || "").match(/Order\s*#?(\d+)/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  };

  // Open real Order Details modal
  const handleViewOrder = async (orderId: number) => {
    setLoadingOrderId(orderId);
    try {
      let order = ordersMap[orderId];
      if (!order) {
        order = await api.get<any>(`/v1/orders/${orderId}`);
        setOrdersMap((prev) => ({ ...prev, [orderId]: order }));
      }
      if (order) {
        setSelectedOrderForModal(order);
        setIsOrderModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch order details:", err);
    } finally {
      setLoadingOrderId(null);
    }
  };

  // Status Counts for top pills
  const statusCounts = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let failed = 0;
    let refunded = 0;

    for (const t of transactions) {
      if (t.type === "REFUND" || t.status === "REFUNDED") {
        refunded++;
      } else if (t.status === "COMPLETED") {
        completed++;
      } else if (t.status === "PENDING" || t.status === "PROCESSING") {
        pending++;
      } else if (t.status === "FAILED" || t.status === "CANCELLED") {
        failed++;
      }
    }

    return {
      ALL: transactions.length,
      COMPLETED: completed,
      PENDING: pending,
      FAILED: failed,
      REFUNDED: refunded,
    };
  }, [transactions]);

  // Filtered & Sorted Payments
  const filteredPayments = useMemo(() => {
    const list = transactions.filter((t) => {
      // 1. Status Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "REFUNDED") {
          if (t.type !== "REFUND" && t.status !== "REFUNDED") return false;
        } else if (statusFilter === "COMPLETED") {
          if (t.status !== "COMPLETED" || t.type === "REFUND") return false;
        } else if (statusFilter === "PENDING") {
          if (t.status !== "PENDING" && t.status !== "PROCESSING") return false;
        } else if (statusFilter === "FAILED") {
          if (t.status !== "FAILED" && t.status !== "CANCELLED") return false;
        }
      }

      // 2. Type Filter
      if (typeFilter !== "ALL" && t.type !== typeFilter) {
        return false;
      }

      // 3. Date Range Filter
      if (dateRange !== "ALL") {
        const txnTime = new Date(t.created_at).getTime();
        const now = new Date();

        if (dateRange === "TODAY") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          if (txnTime < startOfToday) return false;
        } else if (dateRange === "7_DAYS") {
          const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (txnTime < sevenDaysAgo) return false;
        } else if (dateRange === "30_DAYS") {
          const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (txnTime < thirtyDaysAgo) return false;
        } else if (dateRange === "CUSTOM") {
          if (startDate) {
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            if (txnTime < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate).setHours(23, 59, 59, 999);
            if (txnTime > end) return false;
          }
        }
      }

      // 4. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = (t.reference || "").toLowerCase().includes(q);
        const descMatch = (t.description || "").toLowerCase().includes(q);
        const chanMatch = (t.channel || "").toLowerCase().includes(q);
        const typeMatch = (t.type || "").toLowerCase().includes(q);
        const ordId = extractOrderId(t);
        const ordMatch = ordId ? `#hm-${ordId}`.includes(q) || `hm-${ordId}`.includes(q) || `${ordId}`.includes(q) : false;
        return refMatch || descMatch || chanMatch || typeMatch || ordMatch;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "DATE_DESC") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "DATE_ASC") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "AMOUNT_DESC") {
        return Math.abs(b.amount) - Math.abs(a.amount);
      }
      if (sortBy === "AMOUNT_ASC") {
        return Math.abs(a.amount) - Math.abs(b.amount);
      }
      return 0;
    });
  }, [transactions, statusFilter, typeFilter, dateRange, startDate, endDate, searchQuery, sortBy]);

  // Aggregate stats
  const totalRecharges = transactions
    .filter((t) => t.type === "DEPOSIT" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);

  const totalPurchases = transactions
    .filter((t) => t.type === "PURCHASE" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalRefunds = transactions
    .filter((t) => t.type === "REFUND" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const isFiltered = statusFilter !== "ALL" || typeFilter !== "ALL" || dateRange !== "ALL" || searchQuery.trim() !== "";

  const resetFilters = () => {
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setDateRange("ALL");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setSortBy("DATE_DESC");
  };

  // Status Badge Renderer
  const renderStatusBadge = (status: string, type?: string) => {
    if (type === "REFUND" || status === "REFUNDED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Refunded</span>
        </span>
      );
    }
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Successful</span>
          </span>
        );
      case "PENDING":
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 shrink-0 animate-spin" />
            <span>{status === "PROCESSING" ? "Processing" : "Pending"}</span>
          </span>
        );
      case "FAILED":
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{status === "CANCELLED" ? "Cancelled" : "Failed"}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-white/10 text-gray-300 border border-white/20">
            <span>{status}</span>
          </span>
        );
    }
  };

  // Type Title & Icon
  const getTypeDisplay = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return {
          title: "Wallet Recharge",
          subtitle: "Balance Inflow",
          icon: <ArrowDownLeft className="w-4 h-4" />,
          colorClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        };
      case "PURCHASE":
        return {
          title: "Product Purchase",
          subtitle: "Marketplace Order",
          icon: <ShoppingBag className="w-4 h-4" />,
          colorClass: "bg-purple-500/10 border-purple-500/20 text-purple-400",
        };
      case "REFUND":
        return {
          title: "Order Refund",
          subtitle: "Payment Reversal",
          icon: <RotateCcw className="w-4 h-4" />,
          colorClass: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
        };
      default:
        return {
          title: "Adjustment",
          subtitle: "Vault Reconciliation",
          icon: <CreditCard className="w-4 h-4" />,
          colorClass: "bg-amber-500/10 border-amber-500/20 text-amber-400",
        };
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20 px-3 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 py-2 min-h-[40px] text-xs font-mono text-gray-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 rounded outline-none"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/ledger"
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>Wallet Ledger</span>
            </Link>
            <Link
              href="/dashboard/deposit"
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-primary hover:bg-primary-hover text-black font-mono text-xs font-bold transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,194,255,0.25)] focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Top Up Wallet</span>
            </Link>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 sm:pb-6">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-emerald-400 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>PAYMENT EVENT AUDIT</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Payment History
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Detailed audit trail of payment transactions, top-ups, debits, and refunds for {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchPaymentData(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors min-h-[42px] flex items-center gap-1.5 text-xs font-mono self-start sm:self-auto disabled:opacity-50"
            title="Refresh payment events"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Accounting Clarification Banner */}
        <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Direct Financial Transparency</h3>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Payment History records external gateway recharges, purchase transactions, and refund settlements. Wallet top-ups add funds to your vault, while purchases debit funds for marketplace orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Authoritative Live Ledger</span>
          </div>
        </div>

        {/* Summary Financial Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>Wallet Recharges</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {isLoading ? <Skeleton className="h-7 w-20 bg-white/10" /> : `+₹${totalRecharges.toFixed(2)}`}
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-mono">Verified gateway deposits</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase mb-2">
              <TrendingDown className="w-4 h-4" />
              <span>Product Purchases</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
              {isLoading ? <Skeleton className="h-7 w-20 bg-white/10" /> : `-₹${totalPurchases.toFixed(2)}`}
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-mono">Marketplace orders</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-mono uppercase mb-2">
              <RotateCcw className="w-4 h-4" />
              <span>Total Refunds</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono">
              {isLoading ? <Skeleton className="h-7 w-16 bg-white/10" /> : `+₹${totalRefunds.toFixed(2)}`}
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-mono">Recredited to vault</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-primary text-xs font-mono uppercase mb-2">
              <CreditCard className="w-4 h-4" />
              <span>Current Vault Balance</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              ₹{authoritativeBalance.toFixed(2)}
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-mono">Authoritative live funds</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="space-y-3 p-4 rounded-2xl bg-[#0e111d]/70 border border-white/10 backdrop-blur-xl">
          {/* Row 1: Status Filters & Search Bar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Status Filter Tabs (All, Successful, Pending, Failed, Refunded) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline">Status:</span>
              {[
                { id: "ALL", label: "All", count: statusCounts.ALL },
                { id: "COMPLETED", label: "Successful", count: statusCounts.COMPLETED },
                { id: "PENDING", label: "Pending", count: statusCounts.PENDING },
                { id: "FAILED", label: "Failed", count: statusCounts.FAILED },
                { id: "REFUNDED", label: "Refunded", count: statusCounts.REFUNDED },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[36px] ${
                      isActive
                        ? "bg-primary text-black font-bold shadow-[0_0_12px_rgba(0,194,255,0.3)]"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? "bg-black/20 text-black font-bold" : "bg-white/10 text-gray-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px] sm:w-72">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search payment ID, order #, method..."
                className="w-full pl-9 pr-7 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Type Filter, Date Range, Sort By, and Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
            {/* Type Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline">Type:</span>
              {[
                { id: "ALL", label: "All Types" },
                { id: "DEPOSIT", label: "Recharges" },
                { id: "PURCHASE", label: "Purchases" },
                { id: "REFUND", label: "Refunds" },
                { id: "ADJUSTMENT", label: "Adjustments" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setTypeFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all min-h-[32px] ${
                    typeFilter === pill.id
                      ? "bg-white/20 text-white font-semibold border border-white/30"
                      : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/5"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Date Range & Reset */}
            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 min-h-[34px] text-xs text-white focus:outline-none focus:border-primary/50 font-mono cursor-pointer"
                >
                  <option value="ALL" className="bg-[#0e111d] text-white">All Time</option>
                  <option value="TODAY" className="bg-[#0e111d] text-white">Today</option>
                  <option value="7_DAYS" className="bg-[#0e111d] text-white">Last 7 Days</option>
                  <option value="30_DAYS" className="bg-[#0e111d] text-white">Last 30 Days</option>
                  <option value="CUSTOM" className="bg-[#0e111d] text-white">Custom Range...</option>
                </select>
              </div>

              {dateRange === "CUSTOM" && (
                <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 rounded-xl p-1 px-2 min-h-[34px]">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none font-mono cursor-pointer"
                  />
                  <span className="text-gray-500 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none font-mono cursor-pointer"
                  />
                </div>
              )}

              {isFiltered && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-2.5 py-1 min-h-[32px] rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3 text-rose-400" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Payments List / Table */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-[#0c0e17]/60 p-12 text-center flex flex-col items-center justify-center">
            <CreditCard className="w-14 h-14 text-gray-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              {isFiltered ? "No Matching Payment Records" : "No payment transactions yet."}
            </h3>
            <p className="text-gray-400 text-xs max-w-sm mb-5">
              {isFiltered
                ? "No payment records match your active search or filter criteria."
                : "Top up your wallet or purchase a product in the Marketplace to see real payment records."}
            </p>
            {isFiltered ? (
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono text-white transition-colors"
              >
                Reset All Filters
              </button>
            ) : (
              <Link
                href="/dashboard/deposit"
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-mono text-xs font-bold transition-colors shadow-[0_0_15px_rgba(0,194,255,0.2)]"
              >
                Top Up Wallet Now
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-3xl border border-white/10 bg-[#0c0e17]/85 backdrop-blur-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-mono uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-5">Payment Type & Reference</th>
                    <th className="py-4 px-4">Date & Time</th>
                    <th className="py-4 px-4">Method / Channel</th>
                    <th className="py-4 px-4">Related Order</th>
                    <th className="py-4 px-4 text-right">Amount</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-xs">
                  {filteredPayments.map((payment) => {
                    const isCredit = payment.amount > 0;
                    const typeDisplay = getTypeDisplay(payment.type);
                    const formattedAmount = `${isCredit ? "+" : "-"}₹${Math.abs(payment.amount).toFixed(2)}`;
                    const orderId = extractOrderId(payment);

                    return (
                      <tr key={payment.id} className="hover:bg-white/[0.03] transition-colors group">
                        {/* Type & Reference */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeDisplay.colorClass}`}>
                              {typeDisplay.icon}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{typeDisplay.title}</span>
                              </div>
                              <div className="text-[11px] font-mono text-gray-400 mt-0.5 flex items-center gap-1">
                                <span>{payment.reference}</span>
                                <button
                                  onClick={() => handleCopy(payment.reference)}
                                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                  title="Copy reference"
                                >
                                  {copiedRef === payment.reference ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 font-mono text-gray-400 whitespace-nowrap">
                          <div className="text-white">
                            {new Date(payment.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {new Date(payment.created_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Channel / Method */}
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-200">{payment.channel}</div>
                          <div className="text-[11px] text-gray-500 truncate max-w-[180px]" title={payment.description}>
                            {payment.description}
                          </div>
                        </td>

                        {/* Related Order Connection */}
                        <td className="py-4 px-4">
                          {orderId ? (
                            <button
                              onClick={() => handleViewOrder(orderId)}
                              disabled={loadingOrderId === orderId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-mono text-xs font-bold transition-all"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>Order #HM-{orderId}</span>
                              {loadingOrderId === orderId && <RefreshCw className="w-3 h-3 animate-spin" />}
                            </button>
                          ) : (
                            <span className="text-gray-500 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-4 text-right font-mono font-black text-sm whitespace-nowrap">
                          <span
                            className={
                              payment.status === "FAILED" || payment.status === "CANCELLED"
                                ? "text-gray-500 line-through"
                                : isCredit
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }
                          >
                            {formattedAmount}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {renderStatusBadge(payment.status, payment.type)}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-mono font-bold transition-all inline-flex items-center gap-1 min-h-[34px]"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (< lg screens) */}
            <div className="lg:hidden space-y-3.5">
              {filteredPayments.map((payment) => {
                const isCredit = payment.amount > 0;
                const typeDisplay = getTypeDisplay(payment.type);
                const formattedAmount = `${isCredit ? "+" : "-"}₹${Math.abs(payment.amount).toFixed(2)}`;
                const orderId = extractOrderId(payment);

                return (
                  <div
                    key={payment.id}
                    className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeDisplay.colorClass}`}>
                          {typeDisplay.icon}
                        </div>
                        <div>
                          <span className="font-bold text-white text-sm block">
                            {typeDisplay.title}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            {payment.reference}
                          </span>
                        </div>
                      </div>
                      {renderStatusBadge(payment.status, payment.type)}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span className="font-mono text-gray-400">Method:</span>
                      <span className="font-medium text-white">{payment.channel}</span>
                    </div>

                    <div className="text-xs text-gray-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                      {payment.description}
                    </div>

                    {orderId && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-gray-400 font-mono">Related Order:</span>
                        <button
                          onClick={() => handleViewOrder(orderId)}
                          disabled={loadingOrderId === orderId}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-mono text-xs font-bold transition-all min-h-[36px]"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Order #HM-{orderId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 block">
                          {new Date(payment.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold text-sm block ${
                            payment.status === "FAILED" || payment.status === "CANCELLED"
                              ? "text-gray-500 line-through"
                              : isCredit
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {formattedAmount}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="w-full py-2 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>Inspect Details</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Inspection Modal */}
        <AnimatePresence>
          {selectedPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPayment(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-lg bg-[#0a0c16] border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10 my-8"
              >
                <div className="p-5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getTypeDisplay(selectedPayment.type).colorClass}`}>
                      {getTypeDisplay(selectedPayment.type).icon}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white font-mono">
                        PAYMENT #{selectedPayment.reference}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {new Date(selectedPayment.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPayment(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-mono">Payment Event</span>
                      <span className="font-bold text-white">{getTypeDisplay(selectedPayment.type).title}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-mono">Payment Method</span>
                      <span className="font-bold text-primary">{selectedPayment.channel}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-mono">Status</span>
                      <div>{renderStatusBadge(selectedPayment.status, selectedPayment.type)}</div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-mono">Transacted Amount</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          selectedPayment.amount > 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {selectedPayment.amount > 0 ? "+" : "-"}₹
                        {Math.abs(selectedPayment.amount).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                      <span className="text-gray-400 font-mono">Vault Balance After</span>
                      <span className="font-mono font-bold text-white text-sm">
                        ₹{Number(selectedPayment.balance_after).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {extractOrderId(selectedPayment) && (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-primary font-bold">Related Order</div>
                        <div className="text-white font-mono font-bold">#HM-{extractOrderId(selectedPayment)}</div>
                      </div>
                      <button
                        onClick={() => {
                          const ordId = extractOrderId(selectedPayment);
                          if (ordId) {
                            setSelectedPayment(null);
                            handleViewOrder(ordId);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-mono text-xs font-bold transition-colors"
                      >
                        View Order Details
                      </button>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-[#0e111d] border border-white/10 space-y-1.5">
                    <div className="text-[10px] font-mono text-gray-400 uppercase">
                      Event Description / Gateway Ref
                    </div>
                    <p className="text-white font-mono leading-relaxed">
                      {selectedPayment.description}
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-white/[0.01] flex justify-end">
                  <button
                    onClick={() => setSelectedPayment(null)}
                    className="px-4 py-2 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Real Order Details Modal */}
        <OrderDetailsModal
          order={selectedOrderForModal}
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setSelectedOrderForModal(null);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
