"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ShieldAlert,
  Search,
  Copy,
  Check,
  RefreshCw,
  PlusCircle,
  Receipt,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  ArrowUpDown,
  X,
  ShoppingBag,
  ExternalLink,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "./ui/Skeleton";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";

export interface Transaction {
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

interface WalletTransactionTableProps {
  initialFilter?: string;
  initialStatusFilter?: string;
  compact?: boolean;
}

export default function WalletTransactionTable({
  initialFilter = "ALL",
  initialStatusFilter = "ALL",
  compact = false,
}: WalletTransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ordersMap, setOrdersMap] = useState<Record<number, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>(initialFilter); // ALL, CREDITS, DEBITS, REFUNDS, ADJUSTMENTS
  const [filterStatus, setFilterStatus] = useState<string>(initialStatusFilter); // ALL, COMPLETED, PENDING, FAILED
  const [dateRange, setDateRange] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("" );
  const [endDate, setEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("DATE_DESC");

  // Order Details Modal state
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<any | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState<number | null>(null);

  const fetchTransactions = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      // 1. Fetch transactions for authenticated user
      const data = await api.get<Transaction[]>("/v1/wallet/transactions");
      setTransactions(Array.isArray(data) ? data : []);

      // 2. Preload authenticated orders for quick lookup
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
        console.warn("Could not preload orders mapping for ledger:", ordErr);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load transaction history");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleCopy = (refText: string) => {
    navigator.clipboard.writeText(refText);
    setCopiedRef(refText);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Helper to extract order ID from transaction
  const extractOrderId = (txn: Transaction): number | null => {
    if (txn.order_id) return txn.order_id;
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

  // Available months list generated dynamically from current date and transactions
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>();
    const now = new Date();

    // Generate recent 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      monthMap.set(key, label);
    }

    // Scan transactions for any older dates
    transactions.forEach((t) => {
      if (t.created_at) {
        const d = new Date(t.created_at);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          monthMap.set(key, label);
        }
      }
    });

    return Array.from(monthMap.entries()).map(([key, label]) => ({ key, label }));
  }, [transactions]);

  // Helper to test if transaction date falls within selected date range
  const isTxnInDateRange = (createdAt: string, range: string, start: string, end: string) => {
    if (range === "ALL" && !start && !end) return true;

    const txnTime = new Date(createdAt).getTime();
    if (isNaN(txnTime)) return true;

    const now = new Date();

    if (range === "TODAY") {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return txnTime >= startOfToday && txnTime <= endOfToday;
    }

    if (range === "YESTERDAY") {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0).getTime();
      const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).getTime();
      return txnTime >= startOfYesterday && txnTime <= endOfYesterday;
    }

    if (range === "7_DAYS") {
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return txnTime >= sevenDaysAgo;
    }

    if (range === "30_DAYS") {
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return txnTime >= thirtyDaysAgo;
    }

    if (range === "THIS_MONTH") {
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return txnTime >= startOfThisMonth && txnTime <= endOfThisMonth;
    }

    if (range === "LAST_MONTH") {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).getTime();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
      return txnTime >= startOfLastMonth && txnTime <= endOfLastMonth;
    }

    if (range === "THIS_YEAR") {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
      return txnTime >= startOfYear && txnTime <= endOfYear;
    }

    if (range.startsWith("MONTH_")) {
      const monthKey = range.replace("MONTH_", ""); // e.g. "2026-09"
      const [y, m] = monthKey.split("-").map(Number);
      const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0).getTime();
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999).getTime();
      return txnTime >= startOfMonth && txnTime <= endOfMonth;
    }

    if (start) {
      const sTime = new Date(start).setHours(0, 0, 0, 0);
      if (txnTime < sTime) return false;
    }

    if (end) {
      const eTime = new Date(end).setHours(23, 59, 59, 999);
      if (txnTime > eTime) return false;
    }

    return true;
  };

  // Human-readable active date range label
  const getActiveDateRangeLabel = () => {
    if (dateRange === "ALL" && !startDate && !endDate) return null;
    if (dateRange === "TODAY") return "Today";
    if (dateRange === "YESTERDAY") return "Yesterday";
    if (dateRange === "7_DAYS") return "Last 7 Days";
    if (dateRange === "30_DAYS") return "Last 30 Days";
    if (dateRange === "THIS_MONTH") {
      const now = new Date();
      return `This Month (${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })})`;
    }
    if (dateRange === "LAST_MONTH") {
      const last = new Date();
      last.setMonth(last.getMonth() - 1);
      return `Last Month (${last.toLocaleDateString("en-US", { month: "long", year: "numeric" })})`;
    }
    if (dateRange === "THIS_YEAR") return `This Year (${new Date().getFullYear()})`;
    if (dateRange.startsWith("MONTH_")) {
      const key = dateRange.replace("MONTH_", "");
      const [y, m] = key.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (startDate || endDate) {
      if (startDate && endDate) return `${startDate} to ${endDate}`;
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Until ${endDate}`;
    }
    return "Custom Interval";
  };

  const isFiltered = useMemo(() => {
    return (
      filterType !== "ALL" ||
      filterStatus !== "ALL" ||
      dateRange !== "ALL" ||
      searchQuery.trim() !== "" ||
      sortBy !== "DATE_DESC" ||
      startDate !== "" ||
      endDate !== ""
    );
  }, [filterType, filterStatus, dateRange, searchQuery, sortBy, startDate, endDate]);

  const resetAllFilters = () => {
    setFilterType("ALL");
    setFilterStatus("ALL");
    setDateRange("ALL");
    setStartDate("");
    setEndDate("");
    setSortBy("DATE_DESC");
    setSearchQuery("");
  };

  const handleExportCSV = () => {
    const listToExport = filteredTransactions.length > 0 ? filteredTransactions : transactions;
    if (!listToExport || listToExport.length === 0) {
      return;
    }

    const headers = [
      "Transaction ID",
      "Reference",
      "Type",
      "Category",
      "Amount (INR)",
      "Balance After (INR)",
      "Status",
      "Channel / Gateway",
      "Order ID",
      "Product Title",
      "Description",
      "Date & Time",
    ];

    const escapeCsv = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [
      headers.join(","),
      ...listToExport.map((t) => {
        const categoryLabel =
          t.type === "DEPOSIT"
            ? "Wallet Top Up"
            : t.type === "PURCHASE"
            ? "Product Purchase"
            : t.type === "REFUND"
            ? "Order Refund"
            : t.type === "ADJUSTMENT"
            ? "Admin Adjustment"
            : t.type;

        const formattedDate = t.created_at ? new Date(t.created_at).toLocaleString("en-IN") : "";
        const relatedOrder = t.order_id ? ordersMap[t.order_id] : null;

        return [
          escapeCsv(t.id),
          escapeCsv(t.reference || `TXN-${t.id}`),
          escapeCsv(t.type),
          escapeCsv(categoryLabel),
          escapeCsv(t.type === "PURCHASE" ? -Math.abs(t.amount) : Math.abs(t.amount)),
          escapeCsv(t.balance_after),
          escapeCsv(t.status),
          escapeCsv(t.channel || "N/A"),
          escapeCsv(t.order_id || "N/A"),
          escapeCsv(relatedOrder?.product_title || relatedOrder?.product_name || "N/A"),
          escapeCsv(t.description || ""),
          escapeCsv(formattedDate),
        ].join(",");
      }),
    ];

    const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `HostMarketPlace_Wallet_Transactions_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    const list = transactions.filter((t) => {
      // Type filter (CREDITS vs DEBITS vs REFUNDS vs ADJUSTMENTS)
      if (filterType !== "ALL") {
        if (filterType === "CREDITS") {
          if (t.type === "REFUND") return false;
          if (t.amount <= 0 && t.type !== "DEPOSIT") return false;
        } else if (filterType === "DEBITS") {
          if (t.amount >= 0 && t.type !== "PURCHASE") return false;
        } else if (filterType === "REFUNDS") {
          if (t.type !== "REFUND") return false;
        } else if (filterType === "ADJUSTMENTS") {
          if (t.type !== "ADJUSTMENT") return false;
        } else if (t.type !== filterType) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== "ALL" && t.status !== filterStatus) return false;

      // Date range filter
      if (!isTxnInDateRange(t.created_at, dateRange, startDate, endDate)) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = (t.reference || "").toLowerCase().includes(q);
        const matchesDesc = (t.description || "").toLowerCase().includes(q);
        const matchesChannel = (t.channel || "").toLowerCase().includes(q);
        const matchesType = (t.type || "").toLowerCase().includes(q);
        const ordId = extractOrderId(t);
        const matchesOrd = ordId ? `#hm-${ordId}`.includes(q) || `hm-${ordId}`.includes(q) || `${ordId}`.includes(q) : false;
        return matchesRef || matchesDesc || matchesChannel || matchesType || matchesOrd;
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
  }, [transactions, filterType, filterStatus, dateRange, startDate, endDate, sortBy, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalCredited = 0;
    let totalSpent = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const t of transactions) {
      if (t.status === "COMPLETED") {
        completedCount++;
        if (t.amount > 0) totalCredited += t.amount;
        else totalSpent += Math.abs(t.amount);
      } else if (t.status === "PENDING" || t.status === "PROCESSING") {
        pendingCount++;
      } else if (t.status === "FAILED" || t.status === "CANCELLED") {
        failedCount++;
      }
    }

    return { totalCredited, totalSpent, completedCount, pendingCount, failedCount };
  }, [transactions]);

  // Movement counts for movement filter tabs (All, Credits, Debits, Refunds)
  const movementCounts = useMemo(() => {
    let credits = 0;
    let debits = 0;
    let refunds = 0;

    for (const t of transactions) {
      if (t.type === "REFUND") {
        refunds++;
      } else if (t.amount > 0 || t.type === "DEPOSIT") {
        credits++;
      } else if (t.amount < 0 || t.type === "PURCHASE") {
        debits++;
      }
    }

    return {
      ALL: transactions.length,
      CREDITS: credits,
      DEBITS: debits,
      REFUNDS: refunds,
    };
  }, [transactions]);

  // Status counts for status filter pills
  const statusCounts = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let failed = 0;

    for (const t of transactions) {
      if (t.status === "COMPLETED") completed++;
      else if (t.status === "PENDING" || t.status === "PROCESSING") pending++;
      else if (t.status === "FAILED" || t.status === "CANCELLED") failed++;
    }

    return {
      ALL: transactions.length,
      COMPLETED: completed,
      PENDING: pending,
      FAILED: failed,
    };
  }, [transactions]);

  // Status Indicator Badge
  const renderStatusBadge = (status: Transaction["status"] | string) => {
    const normalized = String(status || "").trim().toUpperCase();
    switch (normalized) {
      case "COMPLETED":
        return (
          <span
            data-status="COMPLETED"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Completed</span>
          </span>
        );
      case "PENDING":
      case "PROCESSING":
        return (
          <span
            data-status="PENDING"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30"
          >
            <Clock className="w-3.5 h-3.5 shrink-0 animate-spin" />
            <span>Pending</span>
          </span>
        );
      case "FAILED":
      case "CANCELLED":
        return (
          <span
            data-status="FAILED"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30"
          >
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span
            data-status={normalized}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-white/10 text-gray-300 border border-white/20"
          >
            <span>{normalized || "UNKNOWN"}</span>
          </span>
        );
    }
  };

  // Movement Badge: Explicit CREDIT or DEBIT
  const renderMovementBadge = (amount: number, type: string) => {
    const isCredit = amount > 0 || type === "DEPOSIT" || type === "REFUND";
    if (isCredit) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>CREDIT</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-extrabold bg-purple-500/15 text-purple-300 border border-purple-500/30">
        <ArrowUpRight className="w-3.5 h-3.5" />
        <span>DEBIT</span>
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
    } catch {
      return { date: dateString, time: "" };
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 bg-white/10" />
          <Skeleton className="h-8 w-24 bg-white/10 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-400 text-sm font-semibold">Failed to fetch transactions</p>
              <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchTransactions()}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl p-5 sm:p-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Receipt className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Wallet Balance Movement Ledger
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-gray-400">
              {transactions.length} Records
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 pl-10">
            Chronological audit of balance credits, order debits, and running vault balances
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchTransactions(true)}
            disabled={isRefreshing}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs transition-colors flex items-center gap-1.5 min-h-[38px]"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <Link
            href="/dashboard/deposit"
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-black font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,194,255,0.2)] min-h-[38px]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Funds</span>
          </Link>
        </div>
      </div>

      {/* Quick Financial Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => setFilterType(filterType === "CREDITS" ? "ALL" : "CREDITS")}
          className={`text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterType === "CREDITS"
              ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]"
          }`}
          title="Filter by Credits (Inflow)"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Total Credits</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <p className="text-sm sm:text-lg font-bold font-mono text-emerald-400 truncate">
            +₹{stats.totalCredited.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono">Inflow into wallet</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType(filterType === "DEBITS" ? "ALL" : "DEBITS")}
          className={`text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterType === "DEBITS"
              ? "bg-purple-500/10 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
              : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]"
          }`}
          title="Filter by Debits (Outflow)"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Total Debits</span>
            <TrendingDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          </div>
          <p className="text-sm sm:text-lg font-bold font-mono text-purple-300 truncate">
            -₹{stats.totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono">Outflow for purchases</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === "COMPLETED" ? "ALL" : "COMPLETED")}
          className={`text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === "COMPLETED"
              ? "bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]"
          }`}
          title="Filter by Completed status"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Settled Count</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <p className="text-sm sm:text-lg font-bold font-mono text-white">
            {stats.completedCount}
          </p>
          <span className="text-[9px] sm:text-[10px] text-emerald-400/80 font-mono">Completed movements</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === "PENDING" ? "ALL" : "PENDING")}
          className={`text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === "PENDING"
              ? "bg-amber-500/15 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]"
          }`}
          title="Filter by Pending status"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Pending</span>
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <p className="text-sm sm:text-lg font-bold font-mono text-amber-400">
            {stats.pendingCount}
          </p>
          <span className="text-[9px] sm:text-[10px] text-amber-400/80 font-mono">Awaiting settlement</span>
        </button>
      </div>

      {/* Filters and Search Toolbar */}
      <div className="space-y-3 p-4 rounded-2xl bg-[#0e111d]/70 border border-white/10 backdrop-blur-xl">
        {/* Row 1: Primary Movement Type Filter Tabs (All, Credits, Debits, Refunds) & Search */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline">Movement:</span>
            {[
              {
                id: "ALL",
                label: "All",
                count: movementCounts.ALL,
                icon: <Layers className="w-3.5 h-3.5" />,
              },
              {
                id: "CREDITS",
                label: "Credits (+)",
                count: movementCounts.CREDITS,
                icon: <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />,
              },
              {
                id: "DEBITS",
                label: "Debits (-)",
                count: movementCounts.DEBITS,
                icon: <ArrowUpRight className="w-3.5 h-3.5 text-purple-300" />,
              },
              {
                id: "REFUNDS",
                label: "Refunds",
                count: movementCounts.REFUNDS,
                icon: <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />,
              },
            ].map((tab) => {
              const isActive = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[36px] ${
                    isActive
                      ? "bg-primary text-black font-bold shadow-[0_0_12px_rgba(0,194,255,0.3)]"
                      : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                  }`}
                >
                  {tab.icon}
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
              placeholder="Search reference, order #, note..."
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

        {/* Row 2: Secondary Status Filter Pills, Date Range, Sort By, Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline">Status:</span>
            {[
              { id: "ALL", label: "All Statuses" },
              { id: "COMPLETED", label: "Completed" },
              { id: "PENDING", label: "Pending" },
              { id: "FAILED", label: "Failed" },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterStatus(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 min-h-[32px] ${
                  filterStatus === pill.id
                    ? "bg-white/20 text-white font-semibold border border-white/30"
                    : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/5"
                }`}
              >
                <span>{pill.label}</span>
                {pill.id !== "ALL" && (
                  <span className="text-[10px] px-1 rounded bg-white/10 font-mono text-gray-400">
                    {statusCounts[pill.id as keyof typeof statusCounts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Date, Sort, and Reset */}
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  if (e.target.value !== "CUSTOM") {
                    setStartDate("");
                    setEndDate("");
                  }
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 min-h-[34px] text-xs text-white focus:outline-none focus:border-primary/50 font-mono cursor-pointer"
              >
                <optgroup label="Standard Presets" className="bg-[#0e111d] text-gray-400 font-semibold">
                  <option value="ALL" className="bg-[#0e111d] text-white">All Time</option>
                  <option value="TODAY" className="bg-[#0e111d] text-white">Today</option>
                  <option value="YESTERDAY" className="bg-[#0e111d] text-white">Yesterday</option>
                  <option value="7_DAYS" className="bg-[#0e111d] text-white">Last 7 Days</option>
                  <option value="30_DAYS" className="bg-[#0e111d] text-white">Last 30 Days</option>
                  <option value="THIS_MONTH" className="bg-[#0e111d] text-white">This Month</option>
                  <option value="LAST_MONTH" className="bg-[#0e111d] text-white">Last Month</option>
                  <option value="THIS_YEAR" className="bg-[#0e111d] text-white">This Year</option>
                </optgroup>
                <optgroup label="Monthly Intervals" className="bg-[#0e111d] text-gray-400 font-semibold">
                  {availableMonths.map((m) => (
                    <option key={m.key} value={`MONTH_${m.key}`} className="bg-[#0e111d] text-white">
                      {m.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Specific Range" className="bg-[#0e111d] text-gray-400 font-semibold">
                  <option value="CUSTOM" className="bg-[#0e111d] text-white">Custom Date Interval...</option>
                </optgroup>
              </select>
            </div>

            {dateRange === "CUSTOM" && (
              <div className="flex items-center gap-2 bg-white/5 border border-primary/30 rounded-xl p-1 px-3 min-h-[34px] shadow-[0_0_10px_rgba(0,194,255,0.1)]">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400 font-mono uppercase">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value) setDateRange("CUSTOM");
                    }}
                    className="bg-transparent text-xs text-white focus:outline-none font-mono cursor-pointer scheme-dark"
                    title="Start Date"
                  />
                </div>
                <span className="text-gray-500 text-xs">→</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400 font-mono uppercase">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (e.target.value) setDateRange("CUSTOM");
                    }}
                    className="bg-transparent text-xs text-white focus:outline-none font-mono cursor-pointer scheme-dark"
                    title="End Date"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded-md transition-colors"
                    title="Clear date selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Sort By Selector */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 min-h-[34px] text-xs text-white focus:outline-none focus:border-primary/50 font-mono cursor-pointer"
              >
                <option value="DATE_DESC" className="bg-[#0e111d] text-white">Newest First</option>
                <option value="DATE_ASC" className="bg-[#0e111d] text-white">Oldest First</option>
                <option value="AMOUNT_DESC" className="bg-[#0e111d] text-white">Highest Amount</option>
                <option value="AMOUNT_ASC" className="bg-[#0e111d] text-white">Lowest Amount</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary hover:text-white text-xs font-mono font-bold transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-primary/60 outline-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export current transactions list to CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Export CSV</span>
            </button>

            {isFiltered && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-2.5 py-1 min-h-[32px] rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors"
                title="Reset all filters"
              >
                <X className="w-3 h-3 text-rose-400" />
                <span>Reset All</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Date Range Filter Banner */}
        {getActiveDateRangeLabel() && (
          <div className="flex items-center justify-between gap-2 p-2.5 px-3.5 rounded-xl bg-primary/10 border border-primary/30 text-xs font-mono text-primary shadow-[0_0_12px_rgba(0,194,255,0.12)] transition-all">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-white">
                Active Date Interval:
              </span>
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-bold text-xs border border-primary/40">
                {getActiveDateRangeLabel()}
              </span>
              <span className="text-gray-400 text-[10px] sm:text-[11px]">
                ({filteredTransactions.length} {filteredTransactions.length === 1 ? "record" : "records"} found)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDateRange("ALL");
                setStartDate("");
                setEndDate("");
              }}
              className="px-2 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary hover:text-white transition-colors flex items-center gap-1 text-[10px] sm:text-[11px] font-bold shrink-0"
              title="Clear Date Range Filter"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Date</span>
            </button>
          </div>
        )}
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center flex flex-col items-center justify-center">
          <Receipt className="w-12 h-12 text-gray-500 mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-white mb-1">
            {isFiltered ? "No Matching Ledger Records" : "No wallet transactions yet."}
          </h3>
          <p className="text-xs text-gray-400 max-w-sm">
            {isFiltered
              ? "No ledger movements matched the active filters. Try adjusting your query or resetting filters."
              : "Your wallet balance movement ledger is empty. Deposit funds or purchase products to see entries."}
          </p>
          {isFiltered && (
            <button
              onClick={resetAllFilters}
              className="mt-4 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-mono uppercase text-[10px] tracking-wider">
                  <th className="pb-3 pl-2">Date & Time</th>
                  <th className="pb-3">Reference</th>
                  <th className="pb-3 text-center">Movement</th>
                  <th className="pb-3">Reason / Description</th>
                  <th className="pb-3">Related Order</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-right">Vault Balance</th>
                  <th className="pb-3 pr-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredTransactions.map((txn) => {
                  const isPositive = txn.amount > 0;
                  const dateInfo = formatDate(txn.created_at);
                  const orderId = extractOrderId(txn);

                  return (
                    <tr
                      key={txn.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-4 pl-2 whitespace-nowrap font-mono text-[11px] text-gray-300">
                        <div className="font-semibold text-white">{dateInfo.date}</div>
                        <div className="text-gray-500 text-[10px]">{dateInfo.time}</div>
                      </td>

                      {/* Reference ID with copy */}
                      <td className="py-4 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{txn.reference}</span>
                          <button
                            onClick={() => handleCopy(txn.reference)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Copy reference"
                          >
                            {copiedRef === txn.reference ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Movement: CREDIT vs DEBIT */}
                      <td className="py-4 text-center whitespace-nowrap">
                        {renderMovementBadge(txn.amount, txn.type)}
                      </td>

                      {/* Reason / Description */}
                      <td className="py-4 max-w-xs">
                        <p className="text-gray-200 font-medium truncate" title={txn.description}>
                          {txn.description}
                        </p>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Via {txn.channel}
                        </span>
                      </td>

                      {/* Related Order Connection */}
                      <td className="py-4 whitespace-nowrap">
                        {orderId ? (
                          <button
                            onClick={() => handleViewOrder(orderId)}
                            disabled={loadingOrderId === orderId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-mono text-xs font-bold transition-all"
                            title={`View Order Details for #HM-${orderId}`}
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>Order #HM-{orderId}</span>
                            {loadingOrderId === orderId && <RefreshCw className="w-3 h-3 animate-spin" />}
                          </button>
                        ) : (
                          <span className="text-gray-500 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Transacted Amount */}
                      <td className="py-4 text-right whitespace-nowrap font-mono font-bold text-sm">
                        <span className={isPositive ? "text-emerald-400" : "text-purple-300"}>
                          {isPositive ? "+" : "-"}₹
                          {Math.abs(txn.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Balance After */}
                      <td className="py-4 text-right whitespace-nowrap font-mono font-bold text-xs text-white">
                        ₹
                        {Number(txn.balance_after || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Status Indicator */}
                      <td className="py-4 pr-2 text-center whitespace-nowrap">
                        {renderStatusBadge(txn.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredTransactions.map((txn) => {
              const isPositive = txn.amount > 0;
              const dateInfo = formatDate(txn.created_at);
              const orderId = extractOrderId(txn);

              return (
                <div
                  key={txn.id}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderMovementBadge(txn.amount, txn.type)}
                      <span className="font-mono font-bold text-xs text-white">{txn.reference}</span>
                      <button
                        onClick={() => handleCopy(txn.reference)}
                        className="p-1.5 min-w-[32px] min-h-[32px] rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
                        title="Copy reference"
                      >
                        {copiedRef === txn.reference ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="shrink-0">
                      {renderStatusBadge(txn.status)}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-white font-medium break-words">{txn.description}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-sans">
                      Channel: <span className="text-gray-300 font-medium">{txn.channel}</span>
                    </p>
                  </div>

                  {orderId && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400 font-mono">Linked Order:</span>
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

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-xs">
                    <div className="font-mono text-[10px] text-gray-400">
                      {dateInfo.date} • {dateInfo.time}
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isPositive ? "text-emerald-400" : "text-purple-300"
                        }`}
                      >
                        {isPositive ? "+" : "-"}₹
                        {Math.abs(txn.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <p className="text-[10px] font-mono text-gray-400">
                        Balance: ₹{Number(txn.balance_after || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
  );
}
